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
    """Client for receiving real-time events from the engine via WebSocket with connection pooling."""

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

        # Connection pool: session_id -> WebSocket connection
        self._connections: Dict[str, WebSocketClientProtocol] = {}

        # Connection locks for thread-safe access
        self._connection_locks: Dict[str, asyncio.Lock] = {}

        # Connection reader tasks
        self._reader_tasks: Dict[str, asyncio.Task] = {}

        # Message queues for distributing messages to multiple listeners
        self._message_queues: Dict[str, list] = {}

    def _get_lock(self, session_id: str) -> asyncio.Lock:
        """Get or create a lock for the given session."""
        if session_id not in self._connection_locks:
            self._connection_locks[session_id] = asyncio.Lock()
        return self._connection_locks[session_id]

    async def _ensure_connection(
        self,
        session_id: str,
        flow_id: Optional[str] = None
    ) -> WebSocketClientProtocol:
        """
        Ensure a WebSocket connection exists for the given session.
        Reuses existing connection if available, creates new one if not.

        Returns:
            The WebSocket connection for this session
        """
        lock = self._get_lock(session_id)

        async with lock:
            # Check if we already have a connection
            if session_id in self._connections:
                connection = self._connections[session_id]

                # Verify connection is still open
                if connection.open:
                    logger.debug(f"Reusing existing WebSocket connection: session={session_id}")
                    return connection
                else:
                    logger.warning(f"Existing connection is closed, creating new one: session={session_id}")
                    # Clean up closed connection
                    await self._cleanup_connection(session_id)

            # Create new connection
            ws_url = f"{self.ws_base_url}/ws/session/{session_id}"
            if flow_id:
                ws_url += f"?flow_id={flow_id}"

            logger.info(f"Creating new WebSocket connection: session={session_id}, url={ws_url}")

            try:
                connection = await websockets.connect(
                    ws_url,
                    close_timeout=5,
                    ping_interval=20,
                    ping_timeout=10
                )

                self._connections[session_id] = connection
                logger.info(f"WebSocket connection established: session={session_id}")

                # Start reader task for this connection
                reader_task = asyncio.create_task(
                    self._read_connection(session_id, connection)
                )
                self._reader_tasks[session_id] = reader_task

                return connection

            except Exception as e:
                logger.error(f"Failed to create WebSocket connection: session={session_id}, error={e}")
                raise

    async def send_user_message(
        self,
        session_id: str,
        user_message: str,
        flow_data: Dict[str, Any],
        flow_id: Optional[str] = None
    ) -> None:
        """
        Send a user message to the engine via WebSocket.

        This triggers flow execution on the engine side, which will emit
        assistant_message events that can be received via listen_for_assistant_messages().

        Args:
            session_id: Session ID
            user_message: User's message text
            flow_data: Flow definition
            flow_id: Optional flow ID for context

        Raises:
            Exception: If connection fails or message send fails
        """
        try:
            # Ensure connection exists
            connection = await self._ensure_connection(session_id, flow_id)

            # Build message
            message = {
                "type": "user_message",
                "message": user_message,
                "flow_data": flow_data
            }

            # Send message
            await connection.send(json.dumps(message))

            logger.info(
                f"📤 Sent user message via WebSocket: session={session_id}, "
                f'message="{user_message[:100]}"'
            )

        except Exception as e:
            logger.error(
                f"Failed to send user message via WebSocket: session={session_id}, error={e}",
                exc_info=True
            )
            raise

    async def _read_connection(
        self,
        session_id: str,
        websocket: WebSocketClientProtocol
    ):
        """
        Background task that reads from WebSocket and distributes messages to queues.
        """
        try:
            async with asyncio.timeout(self.timeout):
                async for message in websocket:
                    try:
                        event = json.loads(message)
                        event_type = event.get("event_type")

                        logger.debug(
                            f"Received WebSocket event: type={event_type}, "
                            f"session={session_id}"
                        )

                        # Distribute event to all listening queues
                        if session_id in self._message_queues:
                            num_queues = len(self._message_queues[session_id])
                            logger.info(f"📨 Distributing event={event_type} to {num_queues} queues: session={session_id}")
                            for queue in self._message_queues[session_id]:
                                try:
                                    await queue.put(event)
                                except Exception as e:
                                    logger.error(f"Error putting event into queue: {e}")

                        # Break on session end or error events
                        if event_type in ("session_ended", "error", "message_processing_complete"):
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

            logger.info(f"WebSocket reader completed: session={session_id}")

        except asyncio.TimeoutError:
            logger.warning(
                f"WebSocket connection timed out after {self.timeout}s: "
                f"session={session_id}"
            )
        except websockets.exceptions.WebSocketException as e:
            logger.error(f"WebSocket error: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket reader: {e}", exc_info=True)
        finally:
            # Clean up connection
            await self._cleanup_connection(session_id)

    async def _cleanup_connection(self, session_id: str):
        """Clean up connection and related resources for a session."""
        logger.debug(f"Cleaning up WebSocket connection: session={session_id}")

        # Close WebSocket
        if session_id in self._connections:
            connection = self._connections[session_id]
            try:
                if connection.open:
                    await connection.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket: session={session_id}, error={e}")
            finally:
                del self._connections[session_id]

        # Cancel reader task
        if session_id in self._reader_tasks:
            task = self._reader_tasks[session_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del self._reader_tasks[session_id]

        # Clean up message queues
        if session_id in self._message_queues:
            # Signal all queues that connection is closed
            for queue in self._message_queues[session_id]:
                await queue.put(None)  # Sentinel value
            del self._message_queues[session_id]

        # Clean up lock
        if session_id in self._connection_locks:
            del self._connection_locks[session_id]

        logger.debug(f"WebSocket cleanup complete: session={session_id}")

    async def listen_for_assistant_messages(
        self,
        session_id: str,
        flow_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Connect to engine WebSocket and yield only assistant message texts.

        This method uses connection pooling - multiple calls for the same session
        will reuse the same WebSocket connection. Each call gets its own message queue.

        Args:
            session_id: Session ID to monitor
            flow_id: Optional flow ID for context

        Yields:
            Assistant message texts as they're generated

        Raises:
            Exception: If connection fails or times out
        """
        # Create queue for this listener
        queue = asyncio.Queue()

        # Register queue for message distribution
        if session_id not in self._message_queues:
            self._message_queues[session_id] = []
        self._message_queues[session_id].append(queue)

        logger.info(
            f"🔔 REGISTERED listener for session={session_id}, "
            f"total_listeners={len(self._message_queues[session_id])}"
        )

        try:
            # Ensure connection exists (creates new or reuses existing)
            await self._ensure_connection(session_id, flow_id)

            # Read messages from queue
            while True:
                event = await queue.get()

                # Check for sentinel value (connection closed)
                if event is None:
                    logger.debug(f"Connection closed, stopping listener: session={session_id}")
                    break

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
        finally:
            # Unregister queue
            if session_id in self._message_queues:
                if queue in self._message_queues[session_id]:
                    self._message_queues[session_id].remove(queue)
                    logger.info(
                        f"🔕 UNREGISTERED listener for session={session_id}, "
                        f"remaining_listeners={len(self._message_queues[session_id])}"
                    )

                # If no more listeners, clean up connection
                if not self._message_queues[session_id]:
                    logger.info(f"No more listeners, closing connection: session={session_id}")
                    await self._cleanup_connection(session_id)

    async def close_connection(self, session_id: str):
        """
        Explicitly close WebSocket connection for a session.

        Args:
            session_id: Session ID to close connection for
        """
        logger.info(f"Explicitly closing WebSocket connection: session={session_id}")
        await self._cleanup_connection(session_id)


# Singleton instance
engine_ws_client = EngineWebSocketClient()
