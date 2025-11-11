"""
Service for persisting extracted variables to the database.

This module handles real-time storage of variables extracted during conversations,
allowing for historical tracking and analytics.
"""

import logging
from typing import Any, Dict, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.bot_config import ExtractedVariable

logger = logging.getLogger(__name__)


async def persist_variable(
    db: Session,
    conversation_id: int,
    node_id: str,
    flow_id: Optional[int],
    variable_name: str,
    variable_value: Any,
    variable_type: Optional[str] = None,
) -> ExtractedVariable:
    """
    Persist extracted variable to database in real-time.

    If a variable with the same name already exists for this conversation,
    it will be updated with the new value (upsert behavior).

    Args:
        db: Database session
        conversation_id: ID of the platform conversation
        node_id: Flow node that extracted this variable
        flow_id: ID of the flow that was active
        variable_name: Name of the variable (e.g., "user_name")
        variable_value: Value of the variable (can be any JSON-serializable type)
        variable_type: Optional type hint (e.g., "string", "int", "datetime")

    Returns:
        ExtractedVariable: The persisted variable record

    Raises:
        Exception: If database operation fails
    """
    try:
        # Check if variable already exists (update scenario)
        existing = (
            db.query(ExtractedVariable)
            .filter(
                ExtractedVariable.conversation_id == conversation_id,
                ExtractedVariable.variable_name == variable_name,
            )
            .first()
        )

        if existing:
            # Update existing variable
            existing.variable_value = variable_value
            existing.variable_type = variable_type or type(variable_value).__name__
            existing.node_id = node_id
            existing.flow_id = flow_id
            existing.extracted_at = func.now()
            db.commit()
            db.refresh(existing)
            logger.info(
                f"Updated variable '{variable_name}' for conversation {conversation_id} "
                f"(value: {variable_value})"
            )
            return existing
        else:
            # Create new variable record
            new_var = ExtractedVariable(
                conversation_id=conversation_id,
                node_id=node_id,
                flow_id=flow_id,
                variable_name=variable_name,
                variable_value=variable_value,
                variable_type=variable_type or type(variable_value).__name__,
            )
            db.add(new_var)
            db.commit()
            db.refresh(new_var)
            logger.info(
                f"Persisted new variable '{variable_name}' for conversation {conversation_id} "
                f"(value: {variable_value})"
            )
            return new_var

    except Exception as e:
        logger.error(
            f"Failed to persist variable '{variable_name}' for conversation {conversation_id}: {e}"
        )
        db.rollback()
        raise


async def get_conversation_variables(
    db: Session, conversation_id: int
) -> Dict[str, Any]:
    """
    Get all variables for a conversation as a flat dictionary.

    Args:
        db: Database session
        conversation_id: ID of the platform conversation

    Returns:
        Dict mapping variable names to their values
    """
    try:
        variables = (
            db.query(ExtractedVariable)
            .filter(ExtractedVariable.conversation_id == conversation_id)
            .order_by(ExtractedVariable.extracted_at.desc())
            .all()
        )

        # Return as dict (variable_name -> variable_value)
        return {var.variable_name: var.variable_value for var in variables}

    except Exception as e:
        logger.error(
            f"Failed to retrieve variables for conversation {conversation_id}: {e}"
        )
        return {}


async def get_conversation_variables_with_metadata(
    db: Session, conversation_id: int
) -> list[Dict[str, Any]]:
    """
    Get all variables for a conversation with full metadata.

    Args:
        db: Database session
        conversation_id: ID of the platform conversation

    Returns:
        List of dicts containing variable metadata (name, value, node_id, extracted_at, etc.)
    """
    try:
        variables = (
            db.query(ExtractedVariable)
            .filter(ExtractedVariable.conversation_id == conversation_id)
            .order_by(ExtractedVariable.extracted_at.desc())
            .all()
        )

        return [
            {
                "id": var.id,
                "variable_name": var.variable_name,
                "variable_value": var.variable_value,
                "variable_type": var.variable_type,
                "node_id": var.node_id,
                "flow_id": var.flow_id,
                "extracted_at": var.extracted_at.isoformat() if var.extracted_at else None,
            }
            for var in variables
        ]

    except Exception as e:
        logger.error(
            f"Failed to retrieve variable metadata for conversation {conversation_id}: {e}"
        )
        return []
