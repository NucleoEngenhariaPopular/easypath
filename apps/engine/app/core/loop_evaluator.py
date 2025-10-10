"""
Loop condition evaluation functionality for conversation flows.

This module determines whether a node should loop (stay on current node)
or proceed to the next node based on the loop_condition configuration.
"""

import logging
from typing import Dict, Any
from ..models.flow import Node
from ..models.session import ChatSession
from ..llm.providers import get_llm

logger = logging.getLogger(__name__)


def should_loop(node: Node, session: ChatSession) -> tuple[bool, Dict[str, Any]]:
    """
    Evaluate if the current node should loop based on its loop configuration.

    This is checked AFTER response generation and variable extraction.
    If the loop condition is met, the flow stays on the current node.

    Args:
        node: Current node with loop configuration
        session: Current chat session

    Returns:
        Tuple of (should_loop: bool, llm_info: dict)
        - should_loop: True if node should loop, False if should proceed
        - llm_info: LLM timing and token usage information
    """
    logger.info("=" * 60)
    logger.info("LOOP EVALUATION STARTED")
    logger.info("Node ID: %s, loop_enabled: %s", node.id, node.loop_enabled)

    # Default LLM info for when we don't call LLM
    default_llm_info = {
        "timing_ms": 0.0,
        "model_name": "none",
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "estimated_cost_usd": 0.0,
        "reasoning": None,
        "condition_met": False
    }

    # If loop is not enabled, never loop
    if not node.loop_enabled:
        logger.info("Loop not enabled for node %s - proceeding", node.id)
        logger.info("LOOP EVALUATION COMPLETED - Result: proceed")
        logger.info("=" * 60)
        return False, default_llm_info

    # If loop_condition is empty, treat as documentation-only (proceed)
    if not node.loop_condition or not node.loop_condition.strip():
        logger.info("Loop enabled but no condition specified - proceeding")
        logger.info("LOOP EVALUATION COMPLETED - Result: proceed")
        logger.info("=" * 60)
        return False, default_llm_info

    logger.info("Evaluating loop condition: %s", node.loop_condition[:100])

    # Build evaluation prompt
    try:
        evaluation_prompt = _build_evaluation_prompt(node, session)
        logger.debug("Evaluation prompt built (length: %d chars)", len(evaluation_prompt))
    except Exception as e:
        logger.error("Failed to build evaluation prompt: %s", e, exc_info=True)
        logger.info("LOOP EVALUATION COMPLETED - Result: proceed (error)")
        logger.info("=" * 60)
        return False, default_llm_info

    # Call LLM to evaluate condition
    try:
        llm = get_llm()
        llm_response = llm.chat(
            messages=[{"content": evaluation_prompt, "role": "system"}],
            temperature=0.1  # Low temperature for consistent evaluation
        )

        llm_info = {
            "timing_ms": llm_response.timing_ms or 0.0,
            "model_name": llm_response.model_name or "unknown",
            "input_tokens": llm_response.input_tokens or 0,
            "output_tokens": llm_response.output_tokens or 0,
            "total_tokens": llm_response.total_tokens or 0,
            "estimated_cost_usd": llm_response.estimated_cost_usd or 0.0,
            "reasoning": llm_response.response if llm_response.success else None,
            "condition_met": False
        }

        if not llm_response.success:
            logger.warning("LLM evaluation failed: %s - proceeding", llm_response.error_message)
            logger.info("LOOP EVALUATION COMPLETED - Result: proceed (LLM error)")
            logger.info("=" * 60)
            return False, llm_info

        # Parse LLM response
        should_continue_loop = _parse_evaluation_response(llm_response.response)
        llm_info["condition_met"] = should_continue_loop

        logger.info(
            "Loop evaluation: %s - LLM reasoning: %s (llm_time=%.1fms tokens=%d cost=$%.6f model=%s)",
            "LOOP" if should_continue_loop else "PROCEED",
            llm_response.response[:100],
            llm_info["timing_ms"],
            llm_info["total_tokens"],
            llm_info["estimated_cost_usd"],
            llm_info["model_name"]
        )

        logger.info("LOOP EVALUATION COMPLETED - Result: %s", "loop" if should_continue_loop else "proceed")
        logger.info("=" * 60)
        return should_continue_loop, llm_info

    except Exception as e:
        logger.error("Error during loop evaluation: %s", e, exc_info=True)
        logger.info("LOOP EVALUATION COMPLETED - Result: proceed (exception)")
        logger.info("=" * 60)
        return False, default_llm_info


def _build_evaluation_prompt(node: Node, session: ChatSession) -> str:
    """
    Build the prompt for loop condition evaluation.

    Args:
        node: Current node with loop condition
        session: Current chat session

    Returns:
        Formatted evaluation prompt for LLM
    """
    # Get conversation context
    conversation_history = "\n".join([
        f"{msg.role.upper()}: {msg.content}"
        for msg in session.history[-6:]  # Last 6 messages for context
    ])

    # Get extracted variables
    variables_str = ""
    if session.extracted_variables:
        variables_str = "\nEXTRACTED VARIABLES:\n"
        for name, value in session.extracted_variables.items():
            variables_str += f"- {name}: {value}\n"

    prompt = f"""You are evaluating whether a conversation flow should LOOP (stay on current node) or PROCEED (move to next node).

LOOP CONDITION TO EVALUATE:
{node.loop_condition}

RECENT CONVERSATION:
{conversation_history}
{variables_str}

INSTRUCTIONS:
1. Carefully read the loop condition
2. Analyze the recent conversation and extracted variables
3. Determine if the condition for looping is STILL TRUE (should keep looping)
4. Answer with ONLY one word: "LOOP" or "PROCEED"

IMPORTANT:
- "LOOP" means the condition is still met and we should stay on this node
- "PROCEED" means the condition is no longer met and we should move forward
- If in doubt, answer "PROCEED" to avoid infinite loops

YOUR ANSWER (one word only):"""

    return prompt


def _parse_evaluation_response(response: str) -> bool:
    """
    Parse the LLM response to determine if we should loop.

    Args:
        response: Raw LLM response

    Returns:
        True if should loop, False if should proceed
    """
    if not response:
        logger.warning("Empty response from loop evaluator - defaulting to proceed")
        return False

    # Clean and normalize response
    cleaned = response.strip().upper()

    # Check for explicit answers
    if "LOOP" in cleaned and "PROCEED" not in cleaned:
        logger.debug("Loop evaluation result: LOOP")
        return True

    if "PROCEED" in cleaned:
        logger.debug("Loop evaluation result: PROCEED")
        return False

    # Default to proceed if unclear
    logger.warning("Unclear loop evaluation response: '%s' - defaulting to proceed", response[:100])
    return False


def evaluate_loop_condition_simple(node: Node, session: ChatSession) -> bool:
    """
    Simple synchronous wrapper for loop evaluation.
    Returns only the boolean result, discarding LLM info.

    Args:
        node: Current node
        session: Current chat session

    Returns:
        True if should loop, False if should proceed
    """
    should_continue_loop, _ = should_loop(node, session)
    return should_continue_loop
