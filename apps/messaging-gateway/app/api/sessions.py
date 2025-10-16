from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

from ..database import get_db
from ..models import BotConfig, PlatformConversation, ConversationMessage
from ..services.engine_client import engine_client

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
        query = query.filter(PlatformConversation.status == status)

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
        # Mark as closed in database
        conversation.status = 'closed'
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
    Reset a session (clear history and start fresh).

    This will:
    1. Clear the session from engine Redis
    2. Mark session as active again
    3. Keep the conversation ID but clear state
    """
    conversation = db.query(PlatformConversation).filter(
        PlatformConversation.id == session_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Clear from engine Redis
        try:
            await engine_client.clear_session(conversation.session_id)
            logger.info(f"Session cleared from engine: {conversation.session_id}")
        except Exception as e:
            logger.warning(f"Could not clear session from engine: {e}")

        # Mark as active (in case it was closed)
        conversation.status = 'active'
        db.commit()

        logger.info(
            f"Session reset: id={session_id}, "
            f"session_id={conversation.session_id}"
        )

        return {
            "status": "success",
            "message": f"Session {session_id} reset successfully",
            "session_id": conversation.session_id
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
