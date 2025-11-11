"""
API endpoints for managing and querying extracted variables.

This module provides REST endpoints to view data collected by bots through
variable extraction during conversations.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.bot_config import BotConfig, ExtractedVariable, PlatformConversation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/variables", tags=["variables"])


# ============================================================================
# Pydantic Models
# ============================================================================


class VariableResponse(BaseModel):
    """Single variable with metadata."""

    id: int
    variable_name: str
    variable_value: Dict[str, Any]
    variable_type: Optional[str] = None
    extracted_at: datetime
    node_id: str
    flow_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationVariablesResponse(BaseModel):
    """Variables grouped by conversation."""

    conversation_id: int
    platform_user_id: str
    platform_user_name: Optional[str] = None
    variables: Dict[str, Any]  # Flat dict of variable_name -> variable_value
    last_extracted_at: datetime


class BotDataSummary(BaseModel):
    """Summary statistics for bot data collection."""

    bot_id: int
    bot_name: Optional[str] = None
    total_conversations: int
    conversations_with_data: int
    total_variables_collected: int
    unique_variable_names: List[str]


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/conversations/{conversation_id}", response_model=List[VariableResponse])
async def get_conversation_variables(
    conversation_id: int, db: Session = Depends(get_db)
):
    """
    Get all variables for a specific conversation with full metadata.

    This endpoint returns the complete history of variables extracted during
    a single conversation, including timestamps and source nodes.
    """
    try:
        # Verify conversation exists
        conversation = db.query(PlatformConversation).get(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Get all variables
        variables = (
            db.query(ExtractedVariable)
            .filter(ExtractedVariable.conversation_id == conversation_id)
            .order_by(ExtractedVariable.extracted_at.desc())
            .all()
        )

        return variables

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving variables for conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/bots/{bot_id}", response_model=List[ConversationVariablesResponse])
async def get_bot_collected_data(
    bot_id: int,
    limit: int = Query(100, le=1000, description="Maximum number of conversations to return"),
    offset: int = Query(0, ge=0, description="Number of conversations to skip"),
    db: Session = Depends(get_db),
):
    """
    Get all collected variables for a bot, grouped by conversation.

    This is the main endpoint for viewing bot data collection in the dashboard.
    Returns a list of conversations with their extracted variables.
    """
    try:
        # Verify bot exists
        bot = db.query(BotConfig).get(bot_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        # Get all conversations for this bot with variables
        conversations_query = (
            db.query(PlatformConversation)
            .filter(PlatformConversation.bot_config_id == bot_id)
            .order_by(PlatformConversation.last_message_at.desc())
        )

        # Apply pagination
        conversations = conversations_query.offset(offset).limit(limit).all()

        results = []
        for conv in conversations:
            # Get all variables for this conversation
            variables = (
                db.query(ExtractedVariable)
                .filter(ExtractedVariable.conversation_id == conv.id)
                .all()
            )

            if variables:  # Only include conversations with extracted variables
                # Convert to flat dict
                var_dict = {v.variable_name: v.variable_value for v in variables}
                last_extracted = max(v.extracted_at for v in variables)

                results.append(
                    ConversationVariablesResponse(
                        conversation_id=conv.id,
                        platform_user_id=conv.platform_user_id,
                        platform_user_name=conv.platform_user_name,
                        variables=var_dict,
                        last_extracted_at=last_extracted,
                    )
                )

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving data for bot {bot_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/bots/{bot_id}/summary", response_model=BotDataSummary)
async def get_bot_data_summary(bot_id: int, db: Session = Depends(get_db)):
    """
    Get summary statistics for bot data collection.

    Returns metrics like total conversations, number with data, and unique variable names.
    """
    try:
        # Verify bot exists
        bot = db.query(BotConfig).get(bot_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        # Total conversations
        total_conversations = (
            db.query(PlatformConversation)
            .filter(PlatformConversation.bot_config_id == bot_id)
            .count()
        )

        # Conversations with data
        conversations_with_data = (
            db.query(PlatformConversation.id)
            .join(ExtractedVariable)
            .filter(PlatformConversation.bot_config_id == bot_id)
            .distinct()
            .count()
        )

        # Total variables collected
        total_variables = (
            db.query(ExtractedVariable)
            .join(PlatformConversation)
            .filter(PlatformConversation.bot_config_id == bot_id)
            .count()
        )

        # Unique variable names
        unique_names_query = (
            db.query(ExtractedVariable.variable_name)
            .join(PlatformConversation)
            .filter(PlatformConversation.bot_config_id == bot_id)
            .distinct()
            .all()
        )
        unique_names = [row[0] for row in unique_names_query]

        return BotDataSummary(
            bot_id=bot_id,
            bot_name=bot.bot_name,
            total_conversations=total_conversations,
            conversations_with_data=conversations_with_data,
            total_variables_collected=total_variables,
            unique_variable_names=unique_names,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving summary for bot {bot_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/flows/{flow_id}", response_model=List[ConversationVariablesResponse])
async def get_flow_collected_data(
    flow_id: int,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get all variables collected by a specific flow across all bots.

    This is useful for analyzing flow performance and data collection effectiveness.
    """
    try:
        # Get all variables for this flow
        variables_query = (
            db.query(ExtractedVariable)
            .filter(ExtractedVariable.flow_id == flow_id)
            .order_by(ExtractedVariable.extracted_at.desc())
        )

        variables = variables_query.offset(offset).limit(limit * 10).all()  # Over-fetch for grouping

        # Group by conversation
        conv_groups = {}
        for var in variables:
            conv_id = var.conversation_id
            if conv_id not in conv_groups:
                # Fetch conversation details
                conv = db.query(PlatformConversation).get(conv_id)
                if conv:
                    conv_groups[conv_id] = {
                        "conversation": conv,
                        "variables": {},
                        "last_extracted_at": var.extracted_at,
                    }

            if conv_id in conv_groups:
                conv_groups[conv_id]["variables"][var.variable_name] = var.variable_value
                # Update last_extracted_at if this variable is newer
                if var.extracted_at > conv_groups[conv_id]["last_extracted_at"]:
                    conv_groups[conv_id]["last_extracted_at"] = var.extracted_at

        # Convert to response format
        results = [
            ConversationVariablesResponse(
                conversation_id=conv_id,
                platform_user_id=data["conversation"].platform_user_id,
                platform_user_name=data["conversation"].platform_user_name,
                variables=data["variables"],
                last_extracted_at=data["last_extracted_at"],
            )
            for conv_id, data in list(conv_groups.items())[:limit]  # Apply limit
        ]

        return results

    except Exception as e:
        logger.error(f"Error retrieving data for flow {flow_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/search")
async def search_by_variable(
    variable_name: str = Query(..., description="Variable name to search for"),
    variable_value: Optional[str] = Query(None, description="Variable value to match (optional)"),
    bot_id: Optional[int] = Query(None, description="Filter by bot ID"),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    """
    Search for conversations by variable name and optionally value.

    Example: Find all users who provided their email, or all users with email='john@example.com'
    """
    try:
        # Build query
        query = db.query(ExtractedVariable).filter(
            ExtractedVariable.variable_name == variable_name
        )

        # Filter by value if provided
        if variable_value:
            # JSONB contains check
            query = query.filter(ExtractedVariable.variable_value.contains(variable_value))

        # Filter by bot if provided
        if bot_id:
            query = query.join(PlatformConversation).filter(
                PlatformConversation.bot_config_id == bot_id
            )

        # Execute query
        variables = query.order_by(ExtractedVariable.extracted_at.desc()).limit(limit).all()

        # Group by conversation
        conv_groups = {}
        for var in variables:
            conv_id = var.conversation_id
            if conv_id not in conv_groups:
                conv = db.query(PlatformConversation).get(conv_id)
                if conv:
                    # Get all variables for this conversation
                    all_vars = (
                        db.query(ExtractedVariable)
                        .filter(ExtractedVariable.conversation_id == conv_id)
                        .all()
                    )
                    var_dict = {v.variable_name: v.variable_value for v in all_vars}
                    conv_groups[conv_id] = ConversationVariablesResponse(
                        conversation_id=conv_id,
                        platform_user_id=conv.platform_user_id,
                        platform_user_name=conv.platform_user_name,
                        variables=var_dict,
                        last_extracted_at=max(v.extracted_at for v in all_vars),
                    )

        return list(conv_groups.values())

    except Exception as e:
        logger.error(f"Error searching for variable {variable_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
