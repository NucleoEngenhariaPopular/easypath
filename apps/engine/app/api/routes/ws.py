"""WebSocket routes for real-time flow visualization."""

import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.models.ws_events import FlowExecutionState, SessionStartedEvent
from app.ws.manager import ws_manager
from app.storage.session_store import get_session_store

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    flow_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time flow visualization.

    Clients connect to this endpoint to receive real-time events
    during flow execution.

    Args:
        websocket: The WebSocket connection
        session_id: The conversation session ID to monitor
        flow_id: Optional flow ID for context
    """
    await ws_manager.connect(websocket, session_id)

    try:
        # Send initial connection event
        event = SessionStartedEvent(
            session_id=session_id,
            flow_id=flow_id or "unknown",
            metadata={"connection": "established"}
        )
        await ws_manager.send_event(event, session_id)

        # Try to load and send current session state if it exists
        session_store = get_session_store()
        try:
            session = await session_store.get_session(session_id)
            if session:
                state = FlowExecutionState(
                    session_id=session_id,
                    current_node_id=session.current_node_id,
                    variables=session.variables,
                    message_history=[
                        {"role": msg["role"], "content": msg["content"]}
                        for msg in session.message_history
                    ],
                    is_active=True
                )
                await websocket.send_text(state.model_dump_json())
        except Exception as e:
            logger.warning(f"Could not load session state: {e}")

        # Keep connection alive and handle incoming messages
        while True:
            # Wait for messages from client (if needed for future features)
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket message: {data}")

            # For now, we just log. In future, could handle commands like:
            # - "pause" - pause flow execution
            # - "step" - step through flow manually
            # - "reset" - reset session

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session_id={session_id}")
        ws_manager.disconnect(websocket, session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        ws_manager.disconnect(websocket, session_id)
