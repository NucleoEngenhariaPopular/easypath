from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime
from uuid import uuid4

from ..database import get_db
from ..models import BotConfig, PlatformConversation, ConversationMessage
from ..services.engine_client import engine_client
from easypath_shared.constants import PlatformConversationStatus

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic schemas
class SessionSummary(BaseModel):
    id: int
    bot_config_id: int
    bot_name: str
    platform: str
    platform_user_id: str
    platform_user_name: Optional[str]
    session_id: str
    status: str
    message_count: int
    last_message_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class SessionDetail(SessionSummary):
    recent_messages: List[dict]


class MessageDetail(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/sessions", response_model=List[SessionSummary])
async def list_sessions(
    status: Optional[str] = None,
    bot_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List all conversation sessions with filtering.

    Query params:
    - status: Filter by status (active, closed, archived)
    - bot_id: Filter by bot config ID
    - limit: Maximum number of sessions to return (default 50)
    """
    query = db.query(
        PlatformConversation,
        BotConfig.bot_name,
        BotConfig.platform,
        func.count(ConversationMessage.id).label('message_count')
    ).join(
        BotConfig, PlatformConversation.bot_config_id == BotConfig.id
    ).outerjoin(
        ConversationMessage, PlatformConversation.id == ConversationMessage.conversation_id
    ).group_by(
        PlatformConversation.id,
        BotConfig.bot_name,
        BotConfig.platform
    )

    # Apply filters
    if status:
        # Convert string to enum if needed
        try:
            status_enum = PlatformConversationStatus(status.upper())
            query = query.filter(PlatformConversation.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}. Must be one of: ACTIVE, INACTIVE, ARCHIVED")

    if bot_id:
        query = query.filter(PlatformConversation.bot_config_id == bot_id)

    # Order by most recent activity
    query = query.order_by(desc(PlatformConversation.last_message_at))

    # Apply limit
    query = query.limit(limit)

    results = query.all()

    # Build response
    sessions = []
    for conv, bot_name, platform, msg_count in results:
        sessions.append(SessionSummary(
            id=conv.id,
            bot_config_id=conv.bot_config_id,
            bot_name=bot_name,
            platform=platform,
            platform_user_id=conv.platform_user_id,
            platform_user_name=conv.platform_user_name,
            session_id=conv.session_id,
            status=conv.status,
            message_count=msg_count,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at
        ))

    return sessions


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session_detail(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific session including recent messages"""
    conversation = db.query(PlatformConversation).filter(
        PlatformConversation.id == session_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get bot info
    bot_config = db.query(BotConfig).filter(
        BotConfig.id == conversation.bot_config_id
    ).first()

    if not bot_config:
        raise HTTPException(status_code=404, detail="Bot config not found for this session")

    # Get message count
    message_count = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == session_id
    ).count()

    # Get recent messages (last 10)
    recent_messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == session_id
    ).order_by(
        desc(ConversationMessage.created_at)
    ).limit(10).all()

    # Format messages
    messages_data = [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at
        }
        for msg in reversed(recent_messages)  # Show oldest first
    ]

    return SessionDetail(
        id=conversation.id,
        bot_config_id=conversation.bot_config_id,
        bot_name=bot_config.bot_name,
        platform=bot_config.platform,
        platform_user_id=conversation.platform_user_id,
        platform_user_name=conversation.platform_user_name,
        session_id=conversation.session_id,
        status=conversation.status,
        message_count=message_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        recent_messages=messages_data
    )


@router.post("/sessions/{session_id}/close")
async def close_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Close a session (mark as closed and optionally clear from engine).

    This will:
    1. Mark the session as 'closed' in the database
    2. Clear the session from Redis (if engine supports it)
    3. Prevent further messages from being processed
    """
    conversation = db.query(PlatformConversation).filter(
        PlatformConversation.id == session_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Mark as inactive in database
        conversation.status = PlatformConversationStatus.INACTIVE
        db.commit()

        logger.info(
            f"Session closed: id={session_id}, "
            f"session_id={conversation.session_id}, "
            f"user={conversation.platform_user_id}"
        )

        # Try to clear from engine Redis (if endpoint exists)
        try:
            await engine_client.clear_session(conversation.session_id)
            logger.info(f"Session cleared from engine: {conversation.session_id}")
        except Exception as e:
            # Non-critical - session is marked closed in DB anyway
            logger.warning(f"Could not clear session from engine: {e}")

        return {
            "status": "success",
            "message": f"Session {session_id} closed successfully",
            "session_id": conversation.session_id
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error closing session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/reset")
async def reset_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Reset a session (clear history and start fresh with a new session ID).

    This will:
    1. Clear the old session from engine Redis
    2. Generate a new session ID for the engine
    3. Delete all messages
    4. Mark session as active again

    The messaging-gateway maintains the mapping between Telegram user and engine session.
    """
    conversation = db.query(PlatformConversation).filter(
        PlatformConversation.id == session_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        old_session_id = conversation.session_id

        # Get bot config to construct new session ID
        bot_config = db.query(BotConfig).filter(
            BotConfig.id == conversation.bot_config_id
        ).first()

        if not bot_config:
            raise HTTPException(status_code=404, detail="Bot config not found")

        # Generate new session ID (same format as when creating a new conversation)
        new_session_id = f"{bot_config.platform}-{bot_config.id}-{conversation.platform_user_id}-{uuid4().hex[:8]}"

        logger.info(
            f"Resetting session: id={session_id}, "
            f"old_session_id={old_session_id}, "
            f"new_session_id={new_session_id}"
        )

        # Clear old session from engine Redis
        try:
            await engine_client.clear_session(old_session_id)
            logger.info(f"Cleared old session from engine: {old_session_id}")
        except Exception as e:
            logger.warning(f"Could not clear old session from engine: {e}")

        # Delete all messages for this conversation
        deleted_count = db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == session_id
        ).delete(synchronize_session='fetch')

        logger.info(f"Deleted {deleted_count} messages for session {session_id}")

        # Update with new session ID and mark as active
        conversation.session_id = new_session_id
        conversation.status = PlatformConversationStatus.ACTIVE
        db.commit()
        db.flush()  # Force database to sync

        logger.info(
            f"Session reset complete: id={session_id}, "
            f"new_session_id={new_session_id}, "
            f"messages_deleted={deleted_count}"
        )

        return {
            "status": "success",
            "message": f"Session {session_id} reset successfully with new session ID",
            "old_session_id": old_session_id,
            "new_session_id": new_session_id,
            "messages_deleted": deleted_count
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Permanently delete a session and all its messages.

    Warning: This is irreversible!
    """
    conversation = db.query(PlatformConversation).filter(
        PlatformConversation.id == session_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        session_id_str = conversation.session_id

        # Clear from engine
        try:
            await engine_client.clear_session(session_id_str)
        except Exception as e:
            logger.warning(f"Could not clear session from engine: {e}")

        # Delete from database (messages will cascade delete)
        db.delete(conversation)
        db.commit()

        logger.info(f"Session permanently deleted: id={session_id}, session_id={session_id_str}")

        return {
            "status": "success",
            "message": f"Session {session_id} deleted permanently"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
