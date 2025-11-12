"""
API endpoints for managing test bot personas.

Test bots are used in Test Mode to simulate multiple users and persist
extracted variables for demonstration and testing purposes.
"""

import logging
import asyncio
from typing import Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db, settings
from ..models import BotConfig, PlatformConversation, ConversationMessage
from ..services.telegram import telegram_service
from ..services.engine_ws_client import engine_ws_client
from ..services.variable_storage import persist_variable
from easypath_shared.constants import MessagingPlatform, BotStatus, ConversationMessageRoles
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models
# ============================================================================


class TestBotCreate(BaseModel):
    """Request to create a test bot persona."""
    persona_name: str
    flow_id: int
    owner_id: str


class TestBotResponse(BaseModel):
    """Response containing test bot details."""
    bot_config_id: int
    persona_name: str
    flow_id: int
    is_test_bot: bool

    class Config:
        from_attributes = True


class TestMessageRequest(BaseModel):
    """Request to send a message as a test persona."""
    bot_id: int
    user_message: str
    persona_user_id: Optional[str] = "test-user-default"


class TestMessageResponse(BaseModel):
    """Response from test message processing."""
    reply: str
    session_id: str
    current_node_id: str
    extracted_variables: Optional[dict] = None
    conversation_id: int


# ============================================================================
# API Endpoints
# ============================================================================


@router.post("/test-bots", response_model=TestBotResponse)
async def create_test_bot(
    request: TestBotCreate,
    db: Session = Depends(get_db)
):
    """
    Create a test bot persona for Test Mode.

    This creates a bot_config record with is_test_bot=true, allowing
    the test persona to use the same persistence infrastructure as real bots.
    """
    try:
        # Generate dummy token for test bot
        test_token = f"test-token-{uuid4().hex[:16]}"

        # Create bot config with test flag
        new_bot = BotConfig(
            platform=MessagingPlatform.TEST_MODE,
            bot_name=f"Test: {request.persona_name}",
            flow_id=request.flow_id,
            owner_id=request.owner_id,
            is_active=BotStatus.ACTIVE
        )
        new_bot.bot_token = test_token  # Will be encrypted by setter
        new_bot.is_test_bot = True  # Mark as test bot

        db.add(new_bot)
        db.commit()
        db.refresh(new_bot)

        logger.info(
            f"Created test bot persona: id={new_bot.id}, "
            f"name={request.persona_name}, flow_id={request.flow_id}"
        )

        return TestBotResponse(
            bot_config_id=new_bot.id,
            persona_name=request.persona_name,
            flow_id=request.flow_id,
            is_test_bot=True
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create test bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create test bot: {str(e)}")


@router.delete("/test-bots/{bot_id}")
async def delete_test_bot(bot_id: int, db: Session = Depends(get_db)):
    """
    Delete a test bot persona and all associated data.

    Validates that the bot is actually a test bot before deletion.
    Cascade deletes conversations, messages, and extracted variables.
    """
    # Verify bot exists and is a test bot
    bot = db.query(BotConfig).filter(BotConfig.id == bot_id).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    if not bot.is_test_bot:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete production bot via test bot endpoint"
        )

    try:
        # Count data that will be deleted (for logging)
        conversation_count = db.query(PlatformConversation).filter(
            PlatformConversation.bot_config_id == bot_id
        ).count()

        # Delete bot (cascades to conversations, messages, variables)
        db.delete(bot)
        db.commit()

        logger.info(
            f"Deleted test bot: bot_id={bot_id}, "
            f"conversations_deleted={conversation_count}"
        )

        return {
            "status": "deleted",
            "bot_id": bot_id,
            "conversations_deleted": conversation_count
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete test bot {bot_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test/message", response_model=TestMessageResponse)
async def send_test_message(
    request: TestMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Send a message as a test persona with full variable persistence.

    This endpoint:
    1. Verifies the bot is a test bot
    2. Loads the flow from the platform database
    3. Gets or creates a conversation record
    4. Sends message to engine via WebSocket
    5. Persists extracted variables to database
    6. Returns assistant response

    This gives test personas the same persistence behavior as real bots.
    """
    logger.info(f"=== Test message request: bot_id={request.bot_id}, user_message='{request.user_message[:50]}...'")

    # Verify test bot exists
    bot_config = db.query(BotConfig).filter(
        BotConfig.id == request.bot_id,
        BotConfig.is_test_bot == True
    ).first()

    if not bot_config:
        logger.error(f"Test bot not found: bot_id={request.bot_id}")
        raise HTTPException(
            status_code=404,
            detail="Test bot not found or bot is not a test bot"
        )

    logger.info(f"Test bot found: id={bot_config.id}, name={bot_config.bot_name}, flow_id={bot_config.flow_id}")

    try:
        # Get or create conversation for this test persona user
        conversation = db.query(PlatformConversation).filter(
            PlatformConversation.bot_config_id == request.bot_id,
            PlatformConversation.platform_user_id == request.persona_user_id
        ).first()

        if not conversation:
            # Create new conversation with unique session ID
            session_id = f"test-{request.bot_id}-{request.persona_user_id}-{uuid4().hex[:8]}"
            conversation = PlatformConversation(
                bot_config_id=request.bot_id,
                platform_user_id=request.persona_user_id,
                platform_user_name=f"Test User ({request.persona_user_id})",
                session_id=session_id
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            logger.info(f"Created test conversation: {conversation.id}, session={session_id}")

        # Load flow from platform database
        flow_data = await _get_flow_from_platform(bot_config.flow_id)
        if not flow_data:
            raise HTTPException(
                status_code=404,
                detail=f"Flow {bot_config.flow_id} not found"
            )

        # Store user message
        user_msg = ConversationMessage(
            conversation_id=conversation.id,
            role=ConversationMessageRoles.USER,
            content=request.user_message
        )
        db.add(user_msg)

        # Process message with engine using WebSocket for real-time events
        response = await _process_test_message_with_engine(
            conversation=conversation,
            bot_config=bot_config,
            user_message=request.user_message,
            flow_data=flow_data,
            db=db
        )

        # Store assistant message
        assistant_msg = ConversationMessage(
            conversation_id=conversation.id,
            role=ConversationMessageRoles.ASSISTANT,
            content=response["reply"]
        )
        db.add(assistant_msg)

        # Update conversation metadata
        conversation.last_message_at = datetime.utcnow()

        db.commit()

        # Log processing completion
        extracted_vars = response.get("extracted_variables") or {}
        logger.info(
            f"Test message processed: bot_id={request.bot_id}, "
            f"conversation_id={conversation.id}, "
            f"variables={len(extracted_vars)}"
        )

        return TestMessageResponse(
            reply=response["reply"],
            session_id=conversation.session_id,
            current_node_id=response["current_node_id"],
            extracted_variables=extracted_vars if extracted_vars else None,
            conversation_id=conversation.id
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process test message: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process message: {str(e)}"
        )


# ============================================================================
# Helper Functions
# ============================================================================


async def _get_flow_from_platform(flow_id: int) -> Optional[dict]:
    """
    Fetch flow definition from platform backend.

    Returns:
        Flow data as dict, or None if not found
    """
    try:
        platform_api_url = settings.platform_api_url or "http://localhost:8000"
        url = f"{platform_api_url}/flows/{flow_id}"  # Note: /flows not /api/flows

        logger.info(f"Fetching flow {flow_id} from platform: {url}")

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)

            logger.info(f"Platform response: status={response.status_code}, headers={dict(response.headers)}")

            if response.status_code == 404:
                logger.warning(f"Flow {flow_id} not found in platform database (404)")
                logger.debug(f"Response body: {response.text[:500]}")
                return None

            response.raise_for_status()
            flow_data = response.json()

            logger.info(f"Flow data received: keys={list(flow_data.keys())}")
            logger.debug(f"Full flow data: {flow_data}")

            # Extract flow definition (platform wraps it in a response object)
            if "flow_data" in flow_data:
                logger.info(f"Using 'flow_data' key from response")
                return flow_data["flow_data"]

            logger.info(f"Using full response as flow data")
            return flow_data

    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch flow {flow_id} from platform: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch flow from platform: {str(e)}"
        )


async def _process_test_message_with_engine(
    conversation: PlatformConversation,
    bot_config: BotConfig,
    user_message: str,
    flow_data: dict,
    db: Session
) -> dict:
    """
    Process test message through engine with WebSocket event handling.

    This replicates the telegram service logic to ensure test personas
    get the same variable persistence as real bots.

    Returns:
        Dict with reply, current_node_id, extracted_variables
    """
    session_id = conversation.session_id
    messages_list = []

    # Create WebSocket event handler task (like telegram.py)
    ws_task = asyncio.create_task(
        _handle_websocket_events_for_test(
            session_id=session_id,
            conversation=conversation,
            bot_config=bot_config,
            messages_list=messages_list,
            db=db
        )
    )

    try:
        # Send user message via WebSocket (auto-establishes connection)
        await engine_ws_client.send_user_message(
            session_id=session_id,
            user_message=user_message,
            flow_data=flow_data,
        )

        # Wait for WebSocket task to complete (with timeout)
        try:
            await asyncio.wait_for(ws_task, timeout=60.0)
        except asyncio.TimeoutError:
            logger.warning(f"WebSocket task timeout for test session {session_id}")
            ws_task.cancel()

        # Combine all message parts into reply
        reply = " ".join(messages_list) if messages_list else ""

        return {
            "reply": reply,
            "current_node_id": "",  # TODO: Track from WebSocket events if needed
            "extracted_variables": None  # Variables are persisted to DB directly
        }

    except Exception as e:
        logger.error(f"Error processing test message: {e}", exc_info=True)
        ws_task.cancel()
        raise

    finally:
        # Close WebSocket connection
        try:
            await engine_ws_client.close_connection(session_id)
        except Exception as e:
            logger.debug(f"Error closing WebSocket connection: {e}")


async def _handle_websocket_events_for_test(
    session_id: str,
    conversation: PlatformConversation,
    bot_config: BotConfig,
    messages_list: list,
    db: Session
):
    """
    Listen for WebSocket events from engine and persist variables.

    This is similar to telegram_service._handle_websocket_events() but
    simplified for test mode (no Telegram API calls).
    """
    queue = None

    try:
        logger.info(f"🎧 Starting to collect events for test session: {session_id}")

        # Create queue and register it manually (like telegram.py line 545-549)
        queue = asyncio.Queue()

        if session_id not in engine_ws_client._message_queues:
            engine_ws_client._message_queues[session_id] = []
        engine_ws_client._message_queues[session_id].append(queue)

        logger.info(
            f"🔔 Registered event handler for test session={session_id}, "
            f"total_listeners={len(engine_ws_client._message_queues[session_id])}"
        )

        # Ensure connection exists
        await engine_ws_client._ensure_connection(session_id)

        # Read events from queue (blocking wait, no timeout)
        while True:
            event = await queue.get()

            # Check for sentinel value (connection closed)
            if event is None:
                logger.debug(f"Connection closed, stopping event handler: session={session_id}")
                break

            event_type = event.get("event_type")

            # Persist variable extraction events
            if event_type == "variable_extracted":
                variable_name = event.get("variable_name")
                variable_value = event.get("variable_value")
                node_id = event.get("node_id", "unknown")

                if variable_name and variable_value is not None:
                    try:
                        logger.info(
                            f"💾 Persisting test variable: session={session_id}, "
                            f"variable={variable_name}, value={variable_value}, node={node_id}"
                        )
                        await persist_variable(
                            db=db,
                            conversation_id=conversation.id,
                            node_id=node_id,
                            flow_id=bot_config.flow_id,
                            variable_name=variable_name,
                            variable_value=variable_value,
                            variable_type=type(variable_value).__name__
                        )
                        logger.info(f"✅ Test variable persisted: {variable_name}")
                    except Exception as e:
                        logger.error(
                            f"Failed to persist test variable {variable_name}: {e}",
                            exc_info=True
                        )

            # Collect assistant messages for response
            elif event_type == "assistant_message":
                message = event.get("message", "")
                if message:
                    messages_list.append(message)
                    logger.debug(
                        f"Collected test message: session={session_id}, total={len(messages_list)}"
                    )

            # Break on completion events
            elif event_type in ("session_ended", "error", "message_processing_complete"):
                logger.debug(f"Processing complete event: {event_type}")
                break

    except Exception as e:
        logger.error(
            f"Error handling WebSocket events for test session {session_id}: {e}",
            exc_info=True
        )

    finally:
        # Cleanup queue registration
        if queue and session_id in engine_ws_client._message_queues:
            if queue in engine_ws_client._message_queues[session_id]:
                engine_ws_client._message_queues[session_id].remove(queue)
                logger.debug(f"Unregistered event handler for test session={session_id}")
