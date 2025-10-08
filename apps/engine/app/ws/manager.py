"""WebSocket connection manager for real-time flow visualization."""

import json
import logging
from typing import Dict, Set

from fastapi import WebSocket

from app.models.ws_events import Event

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and broadcasts events."""

    def __init__(self):
        # Map session_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()

        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()

        self.active_connections[session_id].add(websocket)
        logger.info(f"WebSocket connected: session_id={session_id}, total_connections={len(self.active_connections[session_id])}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)

            # Clean up empty sessions
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

            logger.info(f"WebSocket disconnected: session_id={session_id}")

    async def send_event(self, event: Event, session_id: str):
        """Send an event to all connections for a session."""
        if session_id not in self.active_connections:
            logger.debug(f"No active connections for session_id={session_id}")
            return

        # Convert event to JSON
        event_json = event.model_dump_json()

        # Send to all connections for this session
        disconnected = []
        for connection in self.active_connections[session_id]:
            try:
                await connection.send_text(event_json)
                logger.debug(f"Sent event: type={event.event_type}, session_id={session_id}")
            except Exception as e:
                logger.error(f"Error sending event to WebSocket: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection, session_id)

    async def send_message(self, message: str, session_id: str):
        """Send a raw message to all connections for a session."""
        if session_id not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[session_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to WebSocket: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection, session_id)

    def has_listeners(self, session_id: str) -> bool:
        """Check if a session has any active WebSocket listeners."""
        return session_id in self.active_connections and len(self.active_connections[session_id]) > 0


# Global connection manager instance
ws_manager = ConnectionManager()
