"""WebSocket client for real-time communication with the EasyPath engine."""

import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional
import websockets
from websockets.client import WebSocketClientProtocol

from ..database import settings

logger = logging.getLogger(__name__)


class EngineWebSocketClient:
    """Client for receiving real-time events from the engine via WebSocket."""

    def __init__(self):
        # Replace http:// with ws:// for WebSocket connections
        base_url = settings.engine_api_url
        if base_url.startswith("http://"):
            self.ws_base_url = base_url.replace("http://", "ws://", 1)
        elif base_url.startswith("https://"):
            self.ws_base_url = base_url.replace("https://", "wss://", 1)
        else:
            self.ws_base_url = base_url

        self.timeout = 90.0  # 90 seconds max for WebSocket connection

    async def connect_and_listen(
        self,
        session_id: str,
        flow_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Connect to engine WebSocket and yield events as they arrive.

        Args:
            session_id: Session ID to monitor
            flow_id: Optional flow ID for context

        Yields:
            Event dictionaries from the engine

        Raises:
            Exception: If connection fails or times out
        """
        ws_url = f"{self.ws_base_url}/ws/session/{session_id}"
        if flow_id:
            ws_url += f"?flow_id={flow_id}"

        logger.info(f"Connecting to engine WebSocket: session={session_id}, url={ws_url}")

        try:
            async with websockets.connect(
                ws_url,
                close_timeout=5,
                ping_interval=20,
                ping_timeout=10
            ) as websocket:
                logger.info(f"WebSocket connected: session={session_id}")

                # Set up timeout for the entire session
                async with asyncio.timeout(self.timeout):
                    # Receive and yield events
                    async for message in websocket:
                        try:
                            event = json.loads(message)
                            event_type = event.get("event_type")

                            logger.debug(
                                f"Received WebSocket event: type={event_type}, "
                                f"session={session_id}"
                            )

                            yield event

                            # Break on session end or error events
                            if event_type in ("session_ended", "error"):
                                logger.info(
                                    f"WebSocket session ending: type={event_type}, "
                                    f"session={session_id}"
                                )
                                break

                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse WebSocket message: {e}")
                            continue
                        except Exception as e:
                            logger.error(f"Error processing WebSocket event: {e}", exc_info=True)
                            continue

                logger.info(f"WebSocket session completed: session={session_id}")

        except asyncio.TimeoutError:
            logger.warning(
                f"WebSocket connection timed out after {self.timeout}s: "
                f"session={session_id}"
            )
            raise
        except websockets.exceptions.WebSocketException as e:
            logger.error(f"WebSocket error: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket connection: {e}", exc_info=True)
            raise

    async def listen_for_assistant_messages(
        self,
        session_id: str,
        flow_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Connect to engine WebSocket and yield only assistant message texts.

        This is a convenience wrapper around connect_and_listen that filters
        for assistant_message events and yields just the message text.

        Args:
            session_id: Session ID to monitor
            flow_id: Optional flow ID for context

        Yields:
            Assistant message texts as they're generated

        Raises:
            Exception: If connection fails or times out
        """
        try:
            async for event in self.connect_and_listen(session_id, flow_id):
                event_type = event.get("event_type")

                if event_type == "assistant_message":
                    message = event.get("message", "")
                    node_id = event.get("node_id")

                    if message.strip():  # Only yield non-empty messages
                        logger.info(
                            f"Yielding assistant message: session={session_id}, "
                            f"node={node_id}, message_len={len(message)}"
                        )
                        yield message
                    else:
                        logger.warning(
                            f"Skipping empty assistant message: session={session_id}, "
                            f"node={node_id}"
                        )

        except Exception as e:
            logger.error(
                f"Error listening for assistant messages: session={session_id}, error={e}",
                exc_info=True
            )
            raise


# Singleton instance
engine_ws_client = EngineWebSocketClient()
