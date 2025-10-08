from .pathway_selector import choose_next
from .flow_executor import generate_response
from .variable_extractor import extract_variables, should_continue_extraction
from ..models.session import ChatSession
from ..models.flow import Flow
from ..ws.emitter import EventEmitter
from time import perf_counter
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)


def run_step(flow: Flow, session: ChatSession, user_message: str) -> Tuple[str, Dict[str, float]]:
    """
    Execute one step of the conversation flow.

    Args:
        flow: The conversation flow
        session: Current chat session
        user_message: User's input message

    Returns:
        Tuple of (assistant_reply, step_timings)

    Raises:
        ValueError: If user_message is invalid or flow/session is malformed
        Exception: For unexpected errors during execution
    """
    logger.info("=" * 80)
    logger.info("RUN_STEP STARTED - Session: %s, Current Node: %s",
                session.session_id, session.current_node_id)
    logger.debug("User message: %s", user_message[:200])

    t0 = perf_counter()

    # Validate inputs
    try:
        _validate_run_step_inputs(flow, session, user_message)
    except ValueError as e:
        logger.error("Input validation failed: %s", e)
        error_message = "Desculpe, não consegui processar sua mensagem. Por favor, tente novamente."
        return error_message, _create_error_timings(perf_counter() - t0)

    # Add user message to session
    try:
        session.add_user_message(user_message)
        logger.debug("User message added to session history")

        # Emit WebSocket event
        EventEmitter.emit_user_message(session.session_id, user_message, session.current_node_id)
    except Exception as e:
        logger.error("Failed to add user message to session: %s", e, exc_info=True)
        return "Erro ao processar mensagem.", _create_error_timings(perf_counter() - t0)
    
    # Get current node for variable extraction
    try:
        current_node = flow.get_node_by_id(session.current_node_id)
        logger.debug("Current node retrieved: %s (type: %s)", current_node.id, current_node.node_type)
    except Exception as e:
        logger.error("Failed to get current node '%s': %s", session.current_node_id, e, exc_info=True)
        return "Erro no fluxo de conversação.", _create_error_timings(perf_counter() - t0)

    # Extract variables if node has extraction configuration
    if current_node.extract_vars:
        logger.info("Node has %d variables to extract", len(current_node.extract_vars))
        t_extract = perf_counter()

        try:
            extracted = extract_variables(current_node, session)
            logger.debug("Extraction completed - Variables: %s", list(extracted.keys()))
        except Exception as e:
            logger.error("Variable extraction failed: %s", e, exc_info=True)
            # Continue flow even if extraction fails
            extracted = {}

        # Update session with extracted variables
        for name, value in extracted.items():
            session.set_variable(name, value)
            logger.debug("Session variable set: %s = %s", name, value[:50] if len(value) > 50 else value)

            # Emit WebSocket event for each extracted variable
            EventEmitter.emit_variable_extracted(
                session.session_id,
                current_node.id,
                name,
                value,
                session.extracted_variables
            )

        t_extract = perf_counter() - t_extract
        logger.info("Variable extraction completed: %.3fs, extracted: %s", t_extract, list(extracted.keys()))

        # Check if we need to continue extraction (missing required variables)
        if should_continue_extraction(current_node, session.extracted_variables):
            # Stay on current node, generate a prompt asking for missing info
            missing_vars = [var for var in current_node.extract_vars
                          if var.required and var.name not in session.extracted_variables]

            logger.info("Requesting missing variables from user: %s", [v.name for v in missing_vars])

            assistant_reply = f"Preciso de mais algumas informações. Você poderia me informar: {', '.join([var.description for var in missing_vars])}?"
            session.add_assistant_message(assistant_reply)

            t_total = perf_counter() - t0
            step_timings = {
                "choose_next": 0.0,
                "generate_response": 0.0,
                "total": round(t_total, 3),
                "choose_next_llm_ms": 0.0,
                "generate_response_llm_ms": 0.0,
                "choose_next_model": "none",
                "generate_response_model": "none",
                "choose_next_tokens": {
                    "input": 0, "output": 0, "total": 0, "cost_usd": 0.0
                },
                "generate_response_tokens": {
                    "input": 0, "output": 0, "total": 0, "cost_usd": 0.0
                }
            }

            logger.info("Staying on node %s for variable extraction", session.current_node_id)
            logger.info("RUN_STEP COMPLETED (extraction loop)")
            logger.info("=" * 80)
            return assistant_reply, step_timings

    # Choose next node in the flow
    logger.info("Choosing next node from current node: %s", session.current_node_id)
    t_choose = perf_counter()
    old_node_id = session.current_node_id

    try:
        next_node_id, choose_llm_info = choose_next(flow, session, session.current_node_id)
        t_choose = perf_counter() - t_choose
        logger.info("Next node selected: %s (took %.3fs)", next_node_id, t_choose)
        logger.debug("Choose next LLM info: %s", choose_llm_info)

        # Emit WebSocket events for node transition
        EventEmitter.emit_node_exited(session.session_id, old_node_id, flow.get_node_by_id(old_node_id).node_type)

        # Find connection info if available
        connection = flow.get_connection(old_node_id, next_node_id)
        EventEmitter.emit_pathway_selected(
            session.session_id,
            old_node_id,
            next_node_id,
            connection.id if connection else None,
            connection.label if connection else None,
            choose_llm_info.get("reasoning")
        )
    except Exception as e:
        logger.error("Failed to choose next node: %s", e, exc_info=True)
        t_choose = perf_counter() - t_choose
        return "Desculpe, ocorreu um erro ao processar sua solicitação.", _create_error_timings(perf_counter() - t0)

    # Update session with new node
    session.current_node_id = next_node_id
    logger.debug("Session current_node_id updated to: %s", next_node_id)

    # Emit node entered event
    next_node = flow.get_node_by_id(next_node_id)
    EventEmitter.emit_node_entered(
        session.session_id,
        next_node_id,
        next_node.node_type,
        next_node.prompt.objective if next_node.prompt else None
    )

    # Generate response for the new node
    logger.info("Generating response for node: %s", next_node_id)
    t_exec = perf_counter()

    try:
        assistant_reply, exec_llm_info = generate_response(flow, session, next_node_id)
        t_exec = perf_counter() - t_exec
        logger.info("Response generated (took %.3fs): %s", t_exec, assistant_reply[:100])
        logger.debug("Generate response LLM info: %s", exec_llm_info)

        # Emit WebSocket event for response generation
        EventEmitter.emit_response_generated(
            session.session_id,
            next_node_id,
            assistant_reply,
            exec_llm_info.get("total_tokens")
        )
    except Exception as e:
        logger.error("Failed to generate response: %s", e, exc_info=True)
        t_exec = perf_counter() - t_exec
        return "Desculpe, não consegui gerar uma resposta.", _create_error_timings(perf_counter() - t0)

    # Add assistant message to session
    try:
        session.add_assistant_message(assistant_reply)
        logger.debug("Assistant message added to session history")

        # Emit WebSocket event for assistant message
        EventEmitter.emit_assistant_message(session.session_id, assistant_reply, next_node_id)
    except Exception as e:
        logger.error("Failed to add assistant message to session: %s", e, exc_info=True)
        # Continue anyway since we have the response

    t_total = perf_counter() - t0

    step_timings = {
        "choose_next": round(t_choose, 3),
        "generate_response": round(t_exec, 3),
        "total": round(t_total, 3),
        "choose_next_llm_ms": choose_llm_info["timing_ms"],
        "generate_response_llm_ms": exec_llm_info["timing_ms"],
        "choose_next_model": choose_llm_info["model_name"],
        "generate_response_model": exec_llm_info["model_name"],
        "choose_next_tokens": {
            "input": choose_llm_info["input_tokens"],
            "output": choose_llm_info["output_tokens"],
            "total": choose_llm_info["total_tokens"],
            "cost_usd": choose_llm_info["estimated_cost_usd"]
        },
        "generate_response_tokens": {
            "input": exec_llm_info["input_tokens"],
            "output": exec_llm_info["output_tokens"],
            "total": exec_llm_info["total_tokens"],
            "cost_usd": exec_llm_info["estimated_cost_usd"]
        }
    }

    total_cost = choose_llm_info["estimated_cost_usd"] + exec_llm_info["estimated_cost_usd"]
    total_tokens = choose_llm_info["total_tokens"] + exec_llm_info["total_tokens"]

    logger.info(
        "Step completed: choose_next=%.3fs(llm=%.1fms,tokens=%d,cost=$%.6f,%s) generate_response=%.3fs(llm=%.1fms,tokens=%d,cost=$%.6f,%s) total=%.3fs total_cost=$%.6f node=%s",
        t_choose,
        choose_llm_info["timing_ms"],
        choose_llm_info["total_tokens"],
        choose_llm_info["estimated_cost_usd"],
        choose_llm_info["model_name"],
        t_exec,
        exec_llm_info["timing_ms"],
        exec_llm_info["total_tokens"],
        exec_llm_info["estimated_cost_usd"],
        exec_llm_info["model_name"],
        t_total,
        total_cost,
        next_node_id,
    )

    logger.info("RUN_STEP COMPLETED SUCCESSFULLY")
    logger.info("=" * 80)

    return assistant_reply, step_timings


def _validate_run_step_inputs(flow: Flow, session: ChatSession, user_message: str) -> None:
    """
    Validate inputs to run_step function.

    Args:
        flow: The conversation flow
        session: Current chat session
        user_message: User's input message

    Raises:
        ValueError: If any input is invalid
    """
    if not flow:
        raise ValueError("Flow cannot be None")

    if not session:
        raise ValueError("Session cannot be None")

    if not user_message:
        raise ValueError("User message cannot be empty")

    if not isinstance(user_message, str):
        raise ValueError(f"User message must be string, got {type(user_message)}")

    # Validate message content
    if not user_message.strip():
        raise ValueError("User message cannot be whitespace-only")

    if len(user_message) > 10000:
        raise ValueError(f"User message too long: {len(user_message)} characters")

    # Validate session has current_node_id
    if not session.current_node_id:
        raise ValueError("Session current_node_id cannot be empty")

    logger.debug("Input validation passed")


def _create_error_timings(total_time: float) -> Dict[str, Any]:
    """
    Create error timing information.

    Args:
        total_time: Total execution time

    Returns:
        Dictionary with error timing information
    """
    return {
        "choose_next": 0.0,
        "generate_response": 0.0,
        "total": round(total_time, 3),
        "choose_next_llm_ms": 0.0,
        "generate_response_llm_ms": 0.0,
        "choose_next_model": "error",
        "generate_response_model": "error",
        "choose_next_tokens": {
            "input": 0, "output": 0, "total": 0, "cost_usd": 0.0
        },
        "generate_response_tokens": {
            "input": 0, "output": 0, "total": 0, "cost_usd": 0.0
        }
    }


