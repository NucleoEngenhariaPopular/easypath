from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

from ..database import get_db, settings
from ..models import BotConfig, PlatformConversation, ConversationMessage
from ..services.telegram import telegram_service
from ..services.webhook_updater import update_all_webhooks

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic schemas for API
class BotConfigCreate(BaseModel):
    platform: str  # 'telegram', 'whatsapp'
    bot_name: str
    bot_token: str
    flow_id: int
    owner_id: str


class BotConfigUpdate(BaseModel):
    bot_name: Optional[str] = None
    bot_token: Optional[str] = None
    flow_id: Optional[int] = None
    is_active: Optional[bool] = None


class BotConfigResponse(BaseModel):
    id: int
    platform: str
    bot_name: str
    flow_id: int
    owner_id: str
    is_active: bool
    webhook_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    bot_config_id: int
    platform_user_id: str
    platform_user_name: Optional[str]
    session_id: str
    last_message_at: datetime
    message_count: int


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/bots", response_model=BotConfigResponse)
async def create_bot(
    bot_config: BotConfigCreate,
    db: Session = Depends(get_db)
):
    """Create a new bot configuration"""
    try:
        # Create bot config
        new_bot = BotConfig(
            platform=bot_config.platform,
            bot_name=bot_config.bot_name,
            flow_id=bot_config.flow_id,
            owner_id=bot_config.owner_id
        )
        # Set encrypted token
        new_bot.bot_token = bot_config.bot_token

        db.add(new_bot)
        db.commit()
        db.refresh(new_bot)

        # Set webhook for Telegram bots
        if bot_config.platform == "telegram":
            webhook_url = f"{settings.webhook_base_url}/webhooks/telegram/{new_bot.id}"
            success = await telegram_service.set_webhook(new_bot, webhook_url)

            if success:
                new_bot.webhook_url = webhook_url
                db.commit()
                db.refresh(new_bot)
                logger.info(f"Bot created and webhook configured: bot_id={new_bot.id}")
            else:
                logger.warning(f"Bot created but webhook setup failed: bot_id={new_bot.id}")

        return new_bot

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bots", response_model=List[BotConfigResponse])
async def list_bots(
    owner_id: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all bot configurations, optionally filtered by owner or platform"""
    query = db.query(BotConfig)

    if owner_id:
        query = query.filter(BotConfig.owner_id == owner_id)

    if platform:
        query = query.filter(BotConfig.platform == platform)

    bots = query.all()
    return bots


@router.get("/bots/{bot_id}", response_model=BotConfigResponse)
async def get_bot(bot_id: int, db: Session = Depends(get_db)):
    """Get a specific bot configuration"""
    bot = db.query(BotConfig).filter(BotConfig.id == bot_id).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    return bot


@router.put("/bots/{bot_id}", response_model=BotConfigResponse)
async def update_bot(
    bot_id: int,
    updates: BotConfigUpdate,
    db: Session = Depends(get_db)
):
    """Update a bot configuration"""
    bot = db.query(BotConfig).filter(BotConfig.id == bot_id).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    try:
        if updates.bot_name is not None:
            bot.bot_name = updates.bot_name

        if updates.bot_token is not None:
            bot.bot_token = updates.bot_token

        if updates.flow_id is not None:
            bot.flow_id = updates.flow_id

        if updates.is_active is not None:
            bot.is_active = updates.is_active

        db.commit()
        db.refresh(bot)

        logger.info(f"Bot updated: bot_id={bot_id}")
        return bot

    except Exception as e:
        db.rollback()
        logger.error(f"Error updating bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bots/{bot_id}")
async def delete_bot(bot_id: int, db: Session = Depends(get_db)):
    """Delete a bot configuration"""
    bot = db.query(BotConfig).filter(BotConfig.id == bot_id).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    try:
        # Delete webhook from Telegram
        if bot.platform == "telegram":
            telegram_bot = telegram_service.get_bot(bot)
            await telegram_bot.delete_webhook()

        db.delete(bot)
        db.commit()

        logger.info(f"Bot deleted: bot_id={bot_id}")
        return {"status": "deleted"}

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting bot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bots/{bot_id}/conversations", response_model=List[ConversationResponse])
async def list_bot_conversations(bot_id: int, db: Session = Depends(get_db)):
    """List all conversations for a bot"""
    conversations = db.query(
        PlatformConversation
    ).filter(
        PlatformConversation.bot_config_id == bot_id
    ).order_by(
        PlatformConversation.last_message_at.desc()
    ).all()

    # Add message count to each conversation
    result = []
    for conv in conversations:
        message_count = db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conv.id
        ).count()

        result.append(ConversationResponse(
            id=conv.id,
            bot_config_id=conv.bot_config_id,
            platform_user_id=conv.platform_user_id,
            platform_user_name=conv.platform_user_name,
            session_id=conv.session_id,
            last_message_at=conv.last_message_at,
            message_count=message_count
        ))

    return result


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    """Get all messages in a conversation"""
    messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation_id
    ).order_by(
        ConversationMessage.created_at.asc()
    ).all()

    return messages


@router.post("/bots/update-webhooks")
async def update_webhooks():
    """
    Manually update webhooks for all active bots.

    Useful when:
    - ngrok URL changes
    - Bots were created but webhooks failed to register
    - You want to force-refresh all webhook configurations
    """
    try:
        logger.info("Manual webhook update requested via API")
        await update_all_webhooks()
        return {
            "status": "success",
            "message": "Webhooks updated for all active bots. Check logs for details."
        }
    except Exception as e:
        logger.error(f"Failed to update webhooks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
