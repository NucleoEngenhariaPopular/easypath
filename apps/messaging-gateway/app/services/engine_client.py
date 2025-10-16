import httpx
import logging
from typing import Dict, Any, Optional
from ..database import settings

logger = logging.getLogger(__name__)


class EngineClient:
    """Client for communicating with the EasyPath engine API"""

    def __init__(self):
        self.base_url = settings.engine_api_url
        self.timeout = 60.0  # 60 seconds timeout for LLM responses
        self.clear_timeout = 5.0  # 5 seconds for session clear operations

    async def send_message(
        self,
        session_id: str,
        user_message: str,
        flow_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Send a message to the engine and get a response.

        Args:
            session_id: Unique session identifier
            user_message: The user's message
            flow_data: The flow definition (nodes, connections, config)

        Returns:
            Engine response with reply, current_node_id, timing, etc.
            None if request fails
        """
        endpoint = f"{self.base_url}/chat/message-with-flow"

        payload = {
            "session_id": session_id,
            "user_message": user_message,
            "flow": flow_data
        }

        try:
            logger.info(f"Sending message to engine: session={session_id}, message_len={len(user_message)}")

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload)

            if response.status_code == 200:
                result = response.json()
                logger.info(
                    f"Engine response received: session={session_id}, "
                    f"node={result.get('current_node_id')}, "
                    f"reply_len={len(result.get('reply', ''))}"
                )
                return result
            else:
                logger.error(
                    f"Engine returned error: status={response.status_code}, "
                    f"body={response.text[:500]}"
                )
                return None

        except httpx.TimeoutException:
            logger.error(f"Engine request timed out after {self.timeout}s: session={session_id}")
            return None
        except Exception as e:
            logger.error(f"Error communicating with engine: {e}", exc_info=True)
            return None

    async def clear_session(self, session_id: str) -> bool:
        """
        Clear a session from engine Redis storage.

        Args:
            session_id: Session ID to clear

        Returns:
            True if successful, False otherwise
        """
        endpoint = f"{self.base_url}/session/{session_id}"

        try:
            logger.info(f"Clearing session from engine: session={session_id}")

            async with httpx.AsyncClient(timeout=self.clear_timeout) as client:
                response = await client.delete(endpoint)

            if response.status_code == 200:
                logger.info(f"Session cleared successfully: {session_id}")
                return True
            elif response.status_code == 404:
                # Session doesn't exist in engine - that's fine
                logger.info(f"Session not found in engine (already cleared): {session_id}")
                return True
            else:
                logger.error(
                    f"Engine returned error clearing session: status={response.status_code}, "
                    f"body={response.text[:500]}"
                )
                return False

        except httpx.TimeoutException:
            logger.error(f"Engine request timed out clearing session: {session_id}")
            return False
        except Exception as e:
            logger.error(f"Error clearing session from engine: {e}", exc_info=True)
            return False


# Singleton instance
engine_client = EngineClient()
