"""
Variable extraction functionality for conversation flows.
"""

import json
import logging
from typing import Dict, Any, List
from ..models.flow import Node, VariableExtraction
from ..models.session import ChatSession
from ..llm.providers import get_llm


def extract_variables(node: Node, session: ChatSession) -> Dict[str, Any]:
    """
    Extract variables from user message based on node configuration.
    
    Args:
        node: The current node with extraction configuration
        session: Current chat session
        
    Returns:
        Dictionary of extracted variables
    """
    if not node.extract_vars or not session.history:
        return {}
    
    # Get the last user message
    last_user_message = ""
    for msg in reversed(session.history):
        if msg.role == "user":
            last_user_message = msg.content
            break
    
    if not last_user_message:
        return {}
    
    # Build extraction prompt
    extraction_prompt = _build_extraction_prompt(node.extract_vars, last_user_message, session)
    
    # Call LLM for extraction
    llm = get_llm()
    llm_response = llm.chat(
        messages=[{"content": extraction_prompt, "role": "system"}],
        temperature=0.1  # Low temperature for consistent extraction
    )
    
    if not llm_response.success or not llm_response.response:
        logging.warning("Variable extraction failed: %s", llm_response.error_message)
        return {}
    
    # Parse extracted variables
    try:
        extracted = _parse_extraction_response(llm_response.response, node.extract_vars)
        logging.info("Variables extracted: %s", list(extracted.keys()))
        return extracted
    except Exception as e:
        logging.error("Failed to parse extraction response: %s", e)
        return {}


def _build_extraction_prompt(var_configs: List[VariableExtraction], user_message: str, session: ChatSession) -> str:
    """Build the prompt for variable extraction."""
    
    prompt = """You are a precise information extractor. Your task is to extract specific information from the user's message.

USER MESSAGE:
"{}"

VARIABLES TO EXTRACT:
""".format(user_message)

    for var in var_configs:
        required_text = "REQUIRED" if var.required else "OPTIONAL"
        prompt += f"- {var.name} ({required_text}): {var.description}\n"
    
    # Add context from previously extracted variables
    if session.extracted_variables:
        prompt += "\nEXTRACTED VARIABLES:\n"
        for name, value in session.extracted_variables.items():
            prompt += f"- {name}: {value}\n"
    
    prompt += """
INSTRUCTIONS:
1. Extract only the requested information from the user's message
2. If an information is not present or clear, do not invent it
3. For required variables not found, use "NOT_FOUND"
4. For optional variables not found, use "NOT_PROVIDED"
5. Return only a valid JSON in the format:

{
  "variable_name": "extracted_value",
  "another_variable": "another_value"
}

RESPONSE (only JSON):"""

    return prompt


def _parse_extraction_response(response: str, var_configs: List[VariableExtraction]) -> Dict[str, Any]:
    """Parse the LLM response to extract variables."""
    
    # Clean up the response to get just the JSON
    response = response.strip()
    
    # Find JSON in the response
    start_idx = response.find('{')
    end_idx = response.rfind('}')
    
    if start_idx == -1 or end_idx == -1:
        raise ValueError("No valid JSON found in extraction response")
    
    json_str = response[start_idx:end_idx + 1]
    
    try:
        extracted_raw = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in extraction response: {e}")
    
    # Process and validate extracted variables
    extracted = {}
    
    for var_config in var_configs:
        raw_value = extracted_raw.get(var_config.name)
        
        if raw_value and raw_value not in ["NOT_FOUND", "NOT_PROVIDED"]:
            # Clean and validate the extracted value
            cleaned_value = str(raw_value).strip()
            if cleaned_value:
                extracted[var_config.name] = cleaned_value
        elif var_config.required and raw_value == "NOT_FOUND":
            # Required variable not found - this might trigger a loop or re-ask
            logging.warning("Required variable '%s' not found in user message", var_config.name)
    
    return extracted


def should_continue_extraction(node: Node, extracted_vars: Dict[str, Any]) -> bool:
    """
    Determine if extraction should continue based on required variables.
    
    Args:
        node: Current node with extraction configuration
        extracted_vars: Variables that were extracted
        
    Returns:
        True if extraction should continue (missing required vars), False otherwise
    """
    if not node.extract_vars:
        return False
    
    required_vars = [var.name for var in node.extract_vars if var.required]
    missing_required = [var for var in required_vars if var not in extracted_vars]
    
    if missing_required:
        logging.info("Missing required variables: %s", missing_required)
        return True
    
    return False


def format_variables_for_prompt(session: ChatSession) -> str:
    """
    Format extracted variables for inclusion in LLM prompts.
    
    Args:
        session: Current chat session
        
    Returns:
        Formatted string of variables for prompt context
    """
    if not session.extracted_variables:
        return ""
    
    formatted = "\n\n=== USER INFORMATION ===\n"
    for name, value in session.extracted_variables.items():
        # Make variable names more readable
        readable_name = name.replace("_", " ").replace("user ", "").title()
        formatted += f"{readable_name}: {value}\n"
    formatted += "================================\n"
    
    return formatted