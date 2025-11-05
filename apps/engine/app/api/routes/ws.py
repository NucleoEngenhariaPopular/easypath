"""WebSocket routes for real-time flow visualization."""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.models.ws_events import FlowExecutionState, SessionStartedEvent
from app.ws.manager import ws_manager
from app.storage.session_store import load_session

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


@router.websocket("/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    flow_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time flow visualization.

    Clients connect to this endpoint to receive real-time events
    during flow execution. Includes ping/pong heartbeat for connection health.

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
                logger.debug(f"Received WebSocket message from {session_id}: {data}")

                # Handle pong responses (both JSON and plain text)
                try:
                    # Try parsing as JSON first
                    if isinstance(data, str):
                        parsed = json.loads(data)
                        if isinstance(parsed, dict) and parsed.get("type") == "pong":
                            logger.debug(f"Received JSON pong from session={session_id}")
                            continue
                except (json.JSONDecodeError, ValueError):
                    pass
                
                # Handle plain text pong
                if data == "pong" or (isinstance(data, str) and "pong" in data.lower()):
                    logger.debug(f"Received pong from session={session_id}")
                    continue

                # For now, we just log. In future, could handle commands like:
                # - "pause" - pause flow execution
                # - "step" - step through flow manually
                # - "reset" - reset session

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
