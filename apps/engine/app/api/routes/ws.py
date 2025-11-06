"""WebSocket routes for real-time flow visualization and bidirectional communication."""

import asyncio
import json
import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.models.ws_events import FlowExecutionState, SessionStartedEvent
from app.models.flow import Flow
from app.ws.manager import ws_manager
from app.storage.session_store import load_session, save_session
from app.core.chat_manager import new_session
from app.core.orchestrator import run_step

logger = logging.getLogger(__name__)

router = APIRouter()

# WebSocket configuration
PING_INTERVAL = 30  # Send ping every 30 seconds
PING_TIMEOUT = 10   # Wait 10 seconds for pong response


async def _heartbeat_task(websocket: WebSocket, session_id: str):
    """
    Sends periodic pings to keep connection alive and detect dead connections.

    Args:
        websocket: The WebSocket connection
        session_id: Session ID for logging
    """
    try:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            try:
                # Send ping
                await websocket.send_json({"type": "ping"})
                logger.debug(f"Sent ping to session={session_id}")
            except Exception as e:
                logger.warning(f"Failed to send ping to session={session_id}: {e}")
                break
    except asyncio.CancelledError:
        logger.debug(f"Heartbeat task cancelled for session={session_id}")
        raise


async def _process_user_message(
    session_id: str,
    user_message: str,
    flow_data: Dict[str, Any],
    websocket: WebSocket
) -> None:
    """
    Process an incoming user message and execute the flow.

    This function runs the orchestrator which will emit WebSocket events
    (assistant_message, node_entered, etc.) that the client will receive.

    Args:
        session_id: Session ID
        user_message: User's message
        flow_data: Flow definition
        websocket: WebSocket connection (for error reporting)
    """
    try:
        logger.info(
            f"📨 Processing user message via WebSocket: session={session_id}, "
            f'message="{user_message[:100]}"'
        )

        # Parse flow from flow_data
        try:
            flow = Flow(**flow_data)
        except Exception as e:
            logger.error(f"Failed to parse flow: {e}")
            await websocket.send_json({
                "event_type": "error",
                "session_id": session_id,
                "error_message": f"Invalid flow format: {str(e)}"
            })
            return

        # Load or create session
        session = await load_session(session_id)
        if session is None:
            session = new_session(
                session_id=session_id,
                first_node_id=flow.first_node_id
            )
            logger.info(f"Created new session: {session_id}")

        # Run first step with events enabled
        reply, step_timings = run_step(
            flow, session, user_message, emit_events=True
        )

        # Auto-advance through nodes with skip_user_response
        max_auto_advances = 10
        auto_advance_count = 0

        while auto_advance_count < max_auto_advances:
            current_node = flow.get_node_by_id(session.current_node_id)
            if current_node and current_node.skip_user_response:
                logger.info(
                    f"Node {session.current_node_id} has skip_user_response=True, auto-advancing"
                )
                auto_reply, step_timings = run_step(
                    flow, session, "[AUTO_ADVANCE]", emit_events=True
                )
                auto_advance_count += 1
            else:
                break

        if auto_advance_count >= max_auto_advances:
            logger.warning(
                f"Auto-advance limit reached ({max_auto_advances}). Stopping to prevent infinite loop."
            )

        # Save session
        await save_session(session)

        logger.info(
            f"✅ User message processed successfully via WebSocket: session={session_id}, "
            f"current_node={session.current_node_id}"
        )

    except Exception as e:
        logger.error(f"Error processing user message: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "event_type": "error",
                "session_id": session_id,
                "error_message": f"Failed to process message: {str(e)}"
            })
        except Exception as send_error:
            logger.error(f"Failed to send error event: {send_error}")


@router.websocket("/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    flow_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time flow visualization and bidirectional communication.

    Clients connect to this endpoint to:
    1. Receive real-time events during flow execution (assistant_message, node_entered, etc.)
    2. Send user messages to trigger flow execution

    Includes ping/pong heartbeat for connection health.

    Args:
        websocket: The WebSocket connection
        session_id: The conversation session ID to monitor
        flow_id: Optional flow ID for context
    """
    heartbeat_task = None

    try:
        # Accept the WebSocket connection
        await ws_manager.connect(websocket, session_id)
        logger.info(f"WebSocket connected: session_id={session_id}, flow_id={flow_id}")

        # Send initial connection event
        event = SessionStartedEvent(
            session_id=session_id,
            flow_id=flow_id or "unknown",
            metadata={"connection": "established"}
        )
        await ws_manager.send_event(event, session_id)

        # Try to load and send current session state if it exists
        try:
            session = await load_session(session_id)
            if session:
                state = FlowExecutionState(
                    session_id=session_id,
                    current_node_id=session.current_node_id,
                    variables=session.extracted_variables,
                    message_history=[
                        {"role": msg["role"], "content": msg["content"]}
                        for msg in session.message_history
                    ],
                    is_active=True
                )
                await websocket.send_text(state.model_dump_json())
                logger.debug(f"Sent initial state for session={session_id}")
        except Exception as e:
            logger.warning(f"Could not load session state for {session_id}: {e}")

        # Start heartbeat task
        heartbeat_task = asyncio.create_task(_heartbeat_task(websocket, session_id))

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (with timeout to allow heartbeat)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=PING_INTERVAL + PING_TIMEOUT
                )
                logger.debug(f"Received WebSocket message from {session_id}: {data[:200]}")

                # Parse message as JSON
                try:
                    if isinstance(data, str):
                        parsed = json.loads(data)

                        # Handle different message types
                        message_type = parsed.get("type")

                        if message_type == "pong":
                            logger.debug(f"Received JSON pong from session={session_id}")
                            continue

                        elif message_type == "user_message":
                            # Handle user message - trigger flow execution
                            user_message = parsed.get("message")
                            flow_data = parsed.get("flow_data")

                            if not user_message:
                                logger.warning(f"Received user_message without 'message' field: {parsed}")
                                await websocket.send_json({
                                    "event_type": "error",
                                    "session_id": session_id,
                                    "error_message": "Missing 'message' field"
                                })
                                continue

                            if not flow_data:
                                logger.warning(f"Received user_message without 'flow_data' field: {parsed}")
                                await websocket.send_json({
                                    "event_type": "error",
                                    "session_id": session_id,
                                    "error_message": "Missing 'flow_data' field"
                                })
                                continue

                            # Process the message (runs orchestrator which emits events)
                            asyncio.create_task(
                                _process_user_message(session_id, user_message, flow_data, websocket)
                            )
                            continue

                        else:
                            logger.debug(f"Received unknown message type '{message_type}' from {session_id}")
                            continue

                except (json.JSONDecodeError, ValueError) as e:
                    # Handle plain text pong (legacy)
                    if data == "pong" or (isinstance(data, str) and "pong" in data.lower()):
                        logger.debug(f"Received plain text pong from session={session_id}")
                        continue

                    logger.warning(f"Failed to parse WebSocket message as JSON: {e}")
                    continue

            except asyncio.TimeoutError:
                # No message received within timeout - connection might be dead
                logger.warning(f"WebSocket timeout for session={session_id}, checking connection...")
                continue
            except Exception as e:
                logger.debug(f"WebSocket receive error for {session_id}: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session_id={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}", exc_info=True)
    finally:
        # Cleanup: always disconnect and cancel heartbeat
        if heartbeat_task and not heartbeat_task.done():
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

        ws_manager.disconnect(websocket, session_id)
        logger.info(f"WebSocket cleanup complete for session={session_id}")
