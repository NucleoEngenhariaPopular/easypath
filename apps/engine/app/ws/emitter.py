"""Event emitter utility for WebSocket events during flow execution."""

import asyncio
import logging
from typing import Any, Dict, Optional

from app.models.ws_events import (
    NodeEnteredEvent,
    NodeExitedEvent,
    PathwaySelectedEvent,
    ResponseGeneratedEvent,
    UserMessageEvent,
    VariableExtractedEvent,
    AssistantMessageEvent,
    DecisionStepEvent,
    ErrorEvent,
)
from app.ws.manager import ws_manager

logger = logging.getLogger(__name__)


class EventEmitter:
    """Utility for emitting WebSocket events during flow execution."""

    @staticmethod
    def _emit_sync(event_coro):
        """Helper to emit events from sync code."""
        try:
            # Try to get the running event loop
            try:
                loop = asyncio.get_running_loop()
                # We have a running loop - schedule the task
                loop.create_task(event_coro)
            except RuntimeError:
                # No running loop - try to get the event loop
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.create_task(event_coro)
                    else:
                        # Create a new loop and run the coroutine
                        asyncio.run(event_coro)
                except Exception:
                    # Last resort - try to run directly
                    asyncio.run(event_coro)
        except Exception as e:
            logger.debug(f"Could not emit WebSocket event: {e}")

    @staticmethod
    def emit_user_message(session_id: str, message: str, current_node_id: Optional[str] = None):
        """Emit user message event."""
        event = UserMessageEvent(
            session_id=session_id,
            message=message,
            current_node_id=current_node_id
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_node_entered(session_id: str, node_id: str, node_type: str, node_name: Optional[str] = None):
        """Emit node entered event."""
        event = NodeEnteredEvent(
            session_id=session_id,
            node_id=node_id,
            node_type=node_type,
            node_name=node_name
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_node_exited(session_id: str, node_id: str, node_type: str):
        """Emit node exited event."""
        event = NodeExitedEvent(
            session_id=session_id,
            node_id=node_id,
            node_type=node_type
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_pathway_selected(
        session_id: str,
        from_node_id: str,
        to_node_id: str,
        connection_id: Optional[str] = None,
        connection_label: Optional[str] = None,
        reasoning: Optional[str] = None,
        confidence_score: Optional[float] = None,
        available_pathways: Optional[list] = None,
        llm_response: Optional[str] = None
    ):
        """Emit pathway selected event."""
        event = PathwaySelectedEvent(
            session_id=session_id,
            from_node_id=from_node_id,
            to_node_id=to_node_id,
            connection_id=connection_id,
            connection_label=connection_label,
            reasoning=reasoning,
            confidence_score=confidence_score,
            available_pathways=available_pathways or [],
            llm_response=llm_response
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_variable_extracted(
        session_id: str,
        node_id: str,
        variable_name: str,
        variable_value: Any,
        all_variables: Dict[str, Any]
    ):
        """Emit variable extracted event."""
        event = VariableExtractedEvent(
            session_id=session_id,
            node_id=node_id,
            variable_name=variable_name,
            variable_value=variable_value,
            all_variables=all_variables
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_response_generated(
        session_id: str,
        node_id: str,
        response_text: str,
        tokens_used: Optional[int] = None
    ):
        """Emit response generated event."""
        event = ResponseGeneratedEvent(
            session_id=session_id,
            node_id=node_id,
            response_text=response_text,
            tokens_used=tokens_used
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_assistant_message(session_id: str, message: str, node_id: str):
        """Emit assistant message event."""
        event = AssistantMessageEvent(
            session_id=session_id,
            message=message,
            node_id=node_id
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_decision_step(
        session_id: str,
        step_name: str,
        node_id: str,
        node_name: Optional[str] = None,
        node_prompt: Optional[Dict[str, str]] = None,
        previous_node_id: Optional[str] = None,
        previous_node_name: Optional[str] = None,
        available_pathways: Optional[list] = None,
        chosen_pathway: Optional[str] = None,
        pathway_confidence: Optional[float] = None,
        llm_reasoning: Optional[str] = None,
        variables_extracted: Optional[Dict[str, Any]] = None,
        variables_status: Optional[Dict[str, bool]] = None,
        assistant_response: Optional[str] = None,
        timing_ms: Optional[float] = None,
        tokens_used: Optional[int] = None,
        cost_usd: Optional[float] = None,
        model_name: Optional[str] = None
    ):
        """Emit decision step event with detailed information."""
        event = DecisionStepEvent(
            session_id=session_id,
            step_name=step_name,
            node_id=node_id,
            node_name=node_name,
            node_prompt=node_prompt,
            previous_node_id=previous_node_id,
            previous_node_name=previous_node_name,
            available_pathways=available_pathways or [],
            chosen_pathway=chosen_pathway,
            pathway_confidence=pathway_confidence,
            llm_reasoning=llm_reasoning,
            variables_extracted=variables_extracted,
            variables_status=variables_status,
            assistant_response=assistant_response,
            timing_ms=timing_ms,
            tokens_used=tokens_used,
            cost_usd=cost_usd,
            model_name=model_name
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))

    @staticmethod
    def emit_error(session_id: str, error_message: str, error_type: str, node_id: Optional[str] = None):
        """Emit error event."""
        event = ErrorEvent(
            session_id=session_id,
            error_message=error_message,
            error_type=error_type,
            node_id=node_id
        )
        EventEmitter._emit_sync(ws_manager.send_event(event, session_id))
