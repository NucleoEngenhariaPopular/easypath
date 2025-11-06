"""WebSocket client for real-time communication with the EasyPath engine."""

import asyncio
import json
import logging
import time
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

        # Configurable timeouts (can be overridden via environment variables)
        self.timeout = float(getattr(settings, 'websocket_timeout', 120.0))  # 120 seconds default
        self.connection_timeout = float(getattr(settings, 'websocket_connection_timeout', 10.0))
        self.cleanup_delay = float(getattr(settings, 'websocket_cleanup_delay', 5.0))  # Delay before cleanup

        # Connection pool: session_id -> WebSocket connection
        self._connections: Dict[str, WebSocketClientProtocol] = {}

        # Connection locks for thread-safe access
        self._connection_locks: Dict[str, asyncio.Lock] = {}

        # Connection reader tasks
        self._reader_tasks: Dict[str, asyncio.Task] = {}

        # Message queues for distributing messages to multiple listeners
        self._message_queues: Dict[str, list] = {}

        # Message sending queue per session for sequential processing
        self._send_queues: Dict[str, asyncio.Queue] = {}
        self._send_tasks: Dict[str, asyncio.Task] = {}

        # Flow data cache per session
        self._flow_data_cache: Dict[str, Dict[str, Any]] = {}

        # Connection health tracking
        self._connection_health: Dict[str, Dict[str, Any]] = {}  # session_id -> {last_ping, last_pong, errors}

        # Cleanup tasks for delayed cleanup
        self._cleanup_tasks: Dict[str, asyncio.Task] = {}

    def _get_lock(self, session_id: str) -> asyncio.Lock:
        """Get or create a lock for the given session."""
        if session_id not in self._connection_locks:
            self._connection_locks[session_id] = asyncio.Lock()
        return self._connection_locks[session_id]

    async def _verify_connection_health(self, session_id: str, connection: WebSocketClientProtocol) -> bool:
        """
        Verify connection health by checking if it's open and responsive.
        
        Returns:
            True if connection is healthy, False otherwise
        """
        try:
            # Check if connection is open
            if not connection.open:
                return False
            
            # Try to send a ping to verify responsiveness
            # Note: websockets library handles ping/pong automatically, but we can check state
            # For now, just check if connection is open and not in error state
            return connection.open and not connection.closed
        except Exception as e:
            logger.warning(f"Connection health check failed for session={session_id}: {e}")
            return False

    async def _ensure_connection(
        self,
        session_id: str,
        flow_id: Optional[str] = None,
        retry_count: int = 0,
        max_retries: int = 3
    ) -> WebSocketClientProtocol:
        """
        Ensure a WebSocket connection exists for the given session.
        Reuses existing connection if available, creates new one if not.
        Implements retry logic with exponential backoff.

        Args:
            session_id: Session ID
            flow_id: Optional flow ID
            retry_count: Current retry attempt (internal)
            max_retries: Maximum retry attempts

        Returns:
            The WebSocket connection for this session

        Raises:
            Exception: If connection fails after max retries
        """
        lock = self._get_lock(session_id)

        async with lock:
            # Check if we already have a connection
            if session_id in self._connections:
                connection = self._connections[session_id]

                # Verify connection health
                if await self._verify_connection_health(session_id, connection):
                    logger.debug(f"Reusing existing WebSocket connection: session={session_id}")
                    # Update health tracking
                    self._connection_health[session_id] = {
                        "last_check": time.time(),
                        "status": "healthy"
                    }
                    return connection
                else:
                    logger.warning(f"Existing connection is unhealthy, creating new one: session={session_id}")
                    # Clean up unhealthy connection
                    await self._cleanup_connection(session_id, immediate=True)

            # Create new connection with retry logic
            ws_url = f"{self.ws_base_url}/ws/session/{session_id}"
            if flow_id:
                ws_url += f"?flow_id={flow_id}"

            logger.info(f"Creating new WebSocket connection: session={session_id}, url={ws_url}, attempt={retry_count + 1}")

            try:
                connection = await asyncio.wait_for(
                    websockets.connect(
                        ws_url,
                        close_timeout=5,
                        ping_interval=20,
                        ping_timeout=10
                    ),
                    timeout=self.connection_timeout
                )

                self._connections[session_id] = connection
                
                # Initialize health tracking
                self._connection_health[session_id] = {
                    "last_check": time.time(),
                    "status": "healthy",
                    "created_at": time.time(),
                    "errors": 0
                }
                
                logger.info(f"WebSocket connection established: session={session_id}")

                # Start reader task for this connection
                reader_task = asyncio.create_task(
                    self._read_connection(session_id, connection)
                )
                self._reader_tasks[session_id] = reader_task

                # Start message sender task if not already started
                if session_id not in self._send_tasks or self._send_tasks[session_id].done():
                    self._send_tasks[session_id] = asyncio.create_task(
                        self._process_send_queue(session_id)
                    )

                return connection

            except Exception as e:
                logger.error(f"Failed to create WebSocket connection: session={session_id}, error={e}, attempt={retry_count + 1}")
                
                # Retry with exponential backoff
                if retry_count < max_retries:
                    wait_time = 2 ** retry_count  # Exponential backoff: 1s, 2s, 4s
                    logger.info(f"Retrying connection in {wait_time}s: session={session_id}")
                    await asyncio.sleep(wait_time)
                    return await self._ensure_connection(session_id, flow_id, retry_count + 1, max_retries)
                else:
                    # Update health tracking
                    if session_id in self._connection_health:
                        self._connection_health[session_id]["status"] = "failed"
                        self._connection_health[session_id]["errors"] = self._connection_health[session_id].get("errors", 0) + 1
                    raise

    async def _process_send_queue(self, session_id: str):
        """
        Process messages from the send queue sequentially for a session.
        Ensures messages are sent in order and handles errors gracefully.
        """
        if session_id not in self._send_queues:
            self._send_queues[session_id] = asyncio.Queue()

        queue = self._send_queues[session_id]

        while True:
            try:
                # Get message from queue (blocks until available)
                message_data = await queue.get()

                # Check for sentinel value (shutdown)
                if message_data is None:
                    logger.debug(f"Send queue shutdown signal received: session={session_id}")
                    break

                user_message, flow_data, flow_id, future = message_data

                try:
                    # Ensure connection exists
                    connection = await self._ensure_connection(session_id, flow_id)

                    # Cache flow_data if changed
                    if session_id not in self._flow_data_cache or self._flow_data_cache[session_id] != flow_data:
                        self._flow_data_cache[session_id] = flow_data
                        logger.debug(f"Cached flow_data for session={session_id}")

                    # Build message (only send flow_data if it changed)
                    message = {
                        "type": "user_message",
                        "message": user_message,
                    }
                    
                    # Only include flow_data if it's not cached or if it changed
                    # For now, always send it to ensure compatibility, but mark it
                    if session_id in self._flow_data_cache:
                        # Could optimize by sending hash and checking server-side cache
                        message["flow_data"] = flow_data

                    # Send message
                    await connection.send(json.dumps(message))

                    logger.info(
                        f"📤 Sent user message via WebSocket: session={session_id}, "
                        f'message="{user_message[:100]}"'
                    )

                    # Mark task as done and set result
                    if future and not future.done():
                        future.set_result(True)

                except Exception as e:
                    logger.error(
                        f"Failed to send user message via WebSocket: session={session_id}, error={e}",
                        exc_info=True
                    )
                    # Set exception on future if provided
                    if future and not future.done():
                        future.set_exception(e)
                    # Don't break - continue processing queue

                finally:
                    queue.task_done()

            except asyncio.CancelledError:
                logger.debug(f"Send queue task cancelled: session={session_id}")
                break
            except Exception as e:
                logger.error(f"Error in send queue processor: session={session_id}, error={e}", exc_info=True)
                await asyncio.sleep(1)  # Brief pause before retrying

    async def send_user_message(
        self,
        session_id: str,
        user_message: str,
        flow_data: Dict[str, Any],
        flow_id: Optional[str] = None
    ) -> None:
        """
        Send a user message to the engine via WebSocket.
        Messages are queued and sent sequentially to ensure ordering.

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
        # Ensure send queue exists
        if session_id not in self._send_queues:
            self._send_queues[session_id] = asyncio.Queue()

        # Ensure sender task is running
        if session_id not in self._send_tasks or self._send_tasks[session_id].done():
            self._send_tasks[session_id] = asyncio.create_task(
                self._process_send_queue(session_id)
            )

        # Create future to wait for message to be sent
        future = asyncio.Future()

        # Add message to queue
        await self._send_queues[session_id].put((user_message, flow_data, flow_id, future))

        # Wait for message to be sent (or error)
        try:
            await future
        except Exception as e:
            logger.error(
                f"Error waiting for message send: session={session_id}, error={e}",
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
        Handles ping/pong messages and connection health monitoring.
        """
        try:
            async with asyncio.timeout(self.timeout):
                async for message in websocket:
                    try:
                        # Handle ping messages from server
                        if isinstance(message, str) and message.strip() == "ping":
                            logger.debug(f"Received plain text ping, responding: session={session_id}")
                            await websocket.send("pong")
                            continue

                        event = json.loads(message)
                        
                        # Handle JSON ping messages
                        message_type = event.get("type")
                        if message_type == "ping":
                            logger.debug(f"Received JSON ping, responding: session={session_id}")
                            await websocket.send(json.dumps({"type": "pong"}))
                            # Update health tracking
                            if session_id in self._connection_health:
                                self._connection_health[session_id]["last_ping"] = time.time()
                            continue

                        event_type = event.get("event_type")

                        logger.debug(
                            f"Received WebSocket event: type={event_type}, "
                            f"session={session_id}"
                        )

                        # Update health tracking on successful message
                        if session_id in self._connection_health:
                            self._connection_health[session_id]["last_check"] = time.time()
                            self._connection_health[session_id]["status"] = "healthy"

                        # Distribute event to all listening queues
                        if session_id in self._message_queues:
                            num_queues = len(self._message_queues[session_id])
                            logger.debug(f"📨 Distributing event={event_type} to {num_queues} queues: session={session_id}")
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
                        logger.error(f"Failed to parse WebSocket message: {e}, message={message[:100]}")
                        continue
                    except Exception as e:
                        logger.error(f"Error processing WebSocket event: {e}", exc_info=True)
                        # Update error count in health tracking
                        if session_id in self._connection_health:
                            self._connection_health[session_id]["errors"] = \
                                self._connection_health[session_id].get("errors", 0) + 1
                        continue

            logger.info(f"WebSocket reader completed: session={session_id}")

        except asyncio.TimeoutError:
            logger.warning(
                f"WebSocket connection timed out after {self.timeout}s: "
                f"session={session_id}"
            )
            if session_id in self._connection_health:
                self._connection_health[session_id]["status"] = "timeout"
        except websockets.exceptions.WebSocketException as e:
            logger.error(f"WebSocket error: {e}", exc_info=True)
            if session_id in self._connection_health:
                self._connection_health[session_id]["status"] = "error"
                self._connection_health[session_id]["errors"] = \
                    self._connection_health[session_id].get("errors", 0) + 1
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket reader: {e}", exc_info=True)
            if session_id in self._connection_health:
                self._connection_health[session_id]["status"] = "error"
        finally:
            # Clean up connection
            await self._cleanup_connection(session_id, immediate=False)

    async def _cleanup_connection(self, session_id: str, immediate: bool = False):
        """
        Clean up connection and related resources for a session.
        
        Args:
            session_id: Session ID to clean up
            immediate: If True, cleanup immediately. If False, schedule delayed cleanup.
        """
        # Cancel any pending cleanup task
        if session_id in self._cleanup_tasks:
            task = self._cleanup_tasks[session_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del self._cleanup_tasks[session_id]

        if immediate:
            await self._do_cleanup(session_id)
        else:
            # Schedule delayed cleanup to avoid race conditions
            async def delayed_cleanup():
                try:
                    await asyncio.sleep(self.cleanup_delay)
                    # Check if connection is still unused before cleaning up
                    if session_id in self._message_queues:
                        if len(self._message_queues[session_id]) == 0:
                            await self._do_cleanup(session_id)
                        else:
                            logger.debug(f"Skipping cleanup, listeners still active: session={session_id}")
                    else:
                        await self._do_cleanup(session_id)
                except asyncio.CancelledError:
                    logger.debug(f"Delayed cleanup cancelled: session={session_id}")

            self._cleanup_tasks[session_id] = asyncio.create_task(delayed_cleanup())

    async def _do_cleanup(self, session_id: str):
        """Perform actual cleanup of connection and resources."""
        logger.debug(f"Cleaning up WebSocket connection: session={session_id}")

        # Stop send queue processor
        if session_id in self._send_tasks:
            task = self._send_tasks[session_id]
            if not task.done():
                # Signal shutdown
                if session_id in self._send_queues:
                    await self._send_queues[session_id].put(None)
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del self._send_tasks[session_id]

        # Clean up send queue
        if session_id in self._send_queues:
            del self._send_queues[session_id]

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
                try:
                    await queue.put(None)  # Sentinel value
                except Exception as e:
                    logger.warning(f"Error signaling queue closure: {e}")
            del self._message_queues[session_id]

        # Clean up flow data cache
        if session_id in self._flow_data_cache:
            del self._flow_data_cache[session_id]

        # Clean up health tracking
        if session_id in self._connection_health:
            del self._connection_health[session_id]

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

                # If no more listeners, schedule delayed cleanup (not immediate)
                if not self._message_queues[session_id]:
                    logger.info(f"No more listeners, scheduling cleanup: session={session_id}")
                    await self._cleanup_connection(session_id, immediate=False)

    async def close_connection(self, session_id: str):
        """
        Explicitly close WebSocket connection for a session.

        Args:
            session_id: Session ID to close connection for
        """
        logger.info(f"Explicitly closing WebSocket connection: session={session_id}")
        await self._cleanup_connection(session_id, immediate=True)

    def get_connection_health(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get connection health metrics for a session.

        Args:
            session_id: Session ID

        Returns:
            Health metrics dict or None if session not found
        """
        return self._connection_health.get(session_id)

    def get_all_connection_health(self) -> Dict[str, Dict[str, Any]]:
        """
        Get health metrics for all active connections.

        Returns:
            Dict mapping session_id to health metrics
        """
        return self._connection_health.copy()


# Singleton instance
engine_ws_client = EngineWebSocketClient()
