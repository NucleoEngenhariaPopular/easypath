"""
Variable extraction functionality for conversation flows.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from ..models.flow import Node, VariableExtraction
from ..models.session import ChatSession
from ..llm.providers import get_llm

logger = logging.getLogger(__name__)


def extract_variables(node: Node, session: ChatSession, max_retries: int = 2) -> Dict[str, Any]:
    """
    Extract variables from user message based on node configuration.

    Args:
        node: The current node with extraction configuration
        session: Current chat session
        max_retries: Maximum number of retry attempts for LLM failures

    Returns:
        Dictionary of extracted variables
    """
    logger.info("=" * 60)
    logger.info("VARIABLE EXTRACTION STARTED")
    logger.info("Node ID: %s, Extract configs: %d", node.id, len(node.extract_vars) if node.extract_vars else 0)

    if not node.extract_vars:
        logger.debug("No extraction variables configured for node %s", node.id)
        return {}

    if not session.history:
        logger.warning("No conversation history available for extraction")
        return {}

    # Get the last user message
    last_user_message = _get_last_user_message(session)

    if not last_user_message:
        logger.warning("No user message found in conversation history")
        return {}

    logger.info("User message to extract from: '%s'", last_user_message[:100])
    logger.debug("Full user message: %s", last_user_message)

    # Validate user input
    if not _validate_user_input(last_user_message):
        logger.warning("User input failed validation checks")
        return {}

    # Build extraction prompt
    try:
        extraction_prompt = _build_extraction_prompt(node.extract_vars, last_user_message, session)
        logger.debug("Extraction prompt built successfully (length: %d chars)", len(extraction_prompt))
    except Exception as e:
        logger.error("Failed to build extraction prompt: %s", e, exc_info=True)
        return {}

    # Call LLM for extraction with retry logic
    extracted = {}
    for attempt in range(max_retries + 1):
        try:
            logger.info("LLM extraction attempt %d/%d", attempt + 1, max_retries + 1)

            llm = get_llm()
            llm_response = llm.chat(
                messages=[{"content": extraction_prompt, "role": "system"}],
                temperature=0.1  # Low temperature for consistent extraction
            )

            logger.debug("LLM response received - Success: %s, Response length: %d",
                        llm_response.success, len(llm_response.response or ""))

            if not llm_response.success:
                logger.warning("LLM extraction failed (attempt %d): %s",
                             attempt + 1, llm_response.error_message)
                if attempt < max_retries:
                    logger.info("Retrying extraction...")
                    continue
                else:
                    logger.error("Max retries reached for LLM extraction")
                    return {}

            if not llm_response.response:
                logger.warning("LLM returned empty response (attempt %d)", attempt + 1)
                if attempt < max_retries:
                    continue
                else:
                    return {}

            # Parse extracted variables
            logger.debug("Raw LLM response: %s", llm_response.response[:500])
            extracted = _parse_extraction_response(llm_response.response, node.extract_vars)

            logger.info("Successfully extracted %d variables: %s",
                       len(extracted), list(extracted.keys()))
            logger.debug("Extracted values: %s", extracted)
            break

        except json.JSONDecodeError as e:
            logger.error("JSON parsing error (attempt %d): %s - Response: %s",
                        attempt + 1, e, llm_response.response[:200] if llm_response.response else "", exc_info=True)
            if attempt >= max_retries:
                return {}
        except Exception as e:
            logger.error("Unexpected error during extraction (attempt %d): %s",
                        attempt + 1, e, exc_info=True)
            if attempt >= max_retries:
                return {}

    logger.info("VARIABLE EXTRACTION COMPLETED - Extracted: %s", list(extracted.keys()))
    logger.info("=" * 60)
    return extracted


def _get_last_user_message(session: ChatSession) -> Optional[str]:
    """Get the last user message from conversation history."""
    for msg in reversed(session.history):
        if msg.role == "user":
            return msg.content
    return None


def _validate_user_input(user_message: str) -> bool:
    """
    Validate user input for extraction.

    Args:
        user_message: The user's message

    Returns:
        True if valid, False otherwise
    """
    # Check for empty or whitespace-only messages
    if not user_message or not user_message.strip():
        logger.warning("User message is empty or whitespace-only")
        return False

    # Check for excessively long messages (potential attack or error)
    max_length = 10000
    if len(user_message) > max_length:
        logger.warning("User message exceeds maximum length (%d > %d)",
                      len(user_message), max_length)
        return False

    # Check for suspicious patterns (e.g., command injection attempts)
    suspicious_patterns = ["system:", "ignore previous", "disregard", "<script>", "javascript:"]
    lower_message = user_message.lower()
    for pattern in suspicious_patterns:
        if pattern in lower_message:
            logger.warning("Suspicious pattern detected in user input: '%s'", pattern)
            # Don't reject, just warn - could be legitimate

    return True


def _build_extraction_prompt(var_configs: List[VariableExtraction], user_message: str, session: ChatSession) -> str:
    """
    Build the prompt for variable extraction.

    Args:
        var_configs: List of variable extraction configurations
        user_message: The user's message to extract from
        session: Current chat session with history

    Returns:
        Formatted extraction prompt for LLM

    Raises:
        ValueError: If var_configs is empty or invalid
    """
    if not var_configs:
        raise ValueError("Variable extraction configs cannot be empty")

    logger.debug("Building extraction prompt for %d variables", len(var_configs))

    # Sanitize user message for prompt injection
    sanitized_message = _sanitize_for_prompt(user_message)

    prompt = """You are a precise information extractor. Your task is to extract specific information from the user's message.

    USER MESSAGE:
    "{}"

    VARIABLES TO EXTRACT:
    """.format(sanitized_message)

    for var in var_configs:
        required_text = "REQUIRED" if var.required else "OPTIONAL"
        prompt += f"- {var.name} ({required_text}): {var.description}\n"
        logger.debug("  - %s (%s): %s", var.name, required_text, var.description)

    # Add context from previously extracted variables
    if session.extracted_variables:
        prompt += "\nPREVIOUSLY EXTRACTED VARIABLES:\n"
        for name, value in session.extracted_variables.items():
            prompt += f"- {name}: {value}\n"
        logger.debug("Added %d previously extracted variables to context",
                    len(session.extracted_variables))

    prompt += """
    INSTRUCTIONS:
    1. Extract only the requested information from the user's message
    2. If information is not present or clear, do not invent it
    3. For required variables not found, use "NOT_FOUND"
    4. For optional variables not found, use "NOT_PROVIDED"
    5. Be precise and extract exactly what is stated, not what you think is implied
    6. Return ONLY a valid JSON object, nothing else

    RESPONSE FORMAT (only JSON, no markdown, no explanations):
    {
    "variable_name": "extracted_value",
    "another_variable": "another_value"
    }

    RESPONSE:"""

    return prompt


def _sanitize_for_prompt(text: str) -> str:
    """
    Sanitize text to prevent prompt injection attacks.

    Args:
        text: Text to sanitize

    Returns:
        Sanitized text
    """
    # Escape quotes to prevent breaking out of prompt
    sanitized = text.replace('"', '\\"').replace("'", "\\'")

    # Log if sanitization changed the text significantly
    if sanitized != text:
        logger.debug("Text sanitized for prompt injection protection")

    return sanitized


def _parse_extraction_response(response: str, var_configs: List[VariableExtraction]) -> Dict[str, Any]:
    """
    Parse the LLM response to extract variables.

    Args:
        response: Raw LLM response
        var_configs: List of variable extraction configurations

    Returns:
        Dictionary of extracted variables

    Raises:
        ValueError: If response is invalid or cannot be parsed
        json.JSONDecodeError: If JSON is malformed
    """
    logger.debug("Parsing extraction response (length: %d)", len(response))

    if not response or not response.strip():
        raise ValueError("Empty response from LLM")

    # Clean up the response to get just the JSON
    response = response.strip()

    # Remove common markdown code block wrappers
    if response.startswith("```json"):
        response = response[7:]
    elif response.startswith("```"):
        response = response[3:]
    if response.endswith("```"):
        response = response[:-3]

    response = response.strip()

    # Find JSON in the response
    start_idx = response.find('{')
    end_idx = response.rfind('}')

    if start_idx == -1 or end_idx == -1:
        logger.error("No JSON object found in response: %s", response[:200])
        raise ValueError("No valid JSON found in extraction response")

    json_str = response[start_idx:end_idx + 1]
    logger.debug("Extracted JSON string: %s", json_str[:200])

    # Parse JSON
    try:
        extracted_raw = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error("JSON decode error at position %d: %s", e.pos, e.msg)
        logger.error("Problematic JSON: %s", json_str[:500])
        raise ValueError(f"Invalid JSON in extraction response: {e}")

    if not isinstance(extracted_raw, dict):
        raise ValueError(f"Expected JSON object, got {type(extracted_raw).__name__}")

    logger.debug("Parsed JSON successfully: %s", extracted_raw)

    # Process and validate extracted variables
    extracted = {}
    missing_required = []

    for var_config in var_configs:
        raw_value = extracted_raw.get(var_config.name)

        logger.debug("Processing variable '%s': raw_value=%s, required=%s",
                    var_config.name, raw_value, var_config.required)

        if raw_value is None:
            if var_config.required:
                logger.warning("Required variable '%s' missing from LLM response", var_config.name)
                missing_required.append(var_config.name)
            continue

        # Handle special markers
        if raw_value in ["NOT_FOUND", "NOT_PROVIDED"]:
            if var_config.required and raw_value == "NOT_FOUND":
                logger.warning("Required variable '%s' not found in user message", var_config.name)
                missing_required.append(var_config.name)
            else:
                logger.debug("Variable '%s' not provided (optional)", var_config.name)
            continue

        # Clean and validate the extracted value
        cleaned_value = str(raw_value).strip()

        if not cleaned_value:
            logger.warning("Variable '%s' has empty value after cleaning", var_config.name)
            if var_config.required:
                missing_required.append(var_config.name)
            continue

        # Additional validation for specific types
        if not _validate_extracted_value(var_config, cleaned_value):
            logger.warning("Variable '%s' failed validation: %s", var_config.name, cleaned_value)
            if var_config.required:
                missing_required.append(var_config.name)
            continue

        extracted[var_config.name] = cleaned_value
        logger.info("Successfully extracted '%s' = '%s'", var_config.name, cleaned_value[:50])

    if missing_required:
        logger.warning("Missing required variables after extraction: %s", missing_required)

    return extracted


def _validate_extracted_value(var_config: VariableExtraction, value: str) -> bool:
    """
    Validate an extracted value based on variable configuration.

    Args:
        var_config: Variable extraction configuration
        value: Extracted value to validate

    Returns:
        True if valid, False otherwise
    """
    # Basic length check
    if len(value) > 1000:
        logger.warning("Extracted value too long: %d characters", len(value))
        return False

    # Type-specific validation based on variable name patterns
    var_name_lower = var_config.name.lower()

    # Email validation
    if "email" in var_name_lower:
        if "@" not in value or "." not in value:
            logger.debug("Email validation failed for: %s", value)
            return False

    # Phone validation (basic)
    if "phone" in var_name_lower or "telefone" in var_name_lower:
        # Remove common formatting characters
        digits = ''.join(c for c in value if c.isdigit())
        if len(digits) < 8:  # Minimum reasonable phone length
            logger.debug("Phone validation failed for: %s (too few digits)", value)
            return False

    # Age/number validation
    if "age" in var_name_lower or "idade" in var_name_lower:
        try:
            age = int(value)
            if age < 0 or age > 150:
                logger.debug("Age validation failed: %d", age)
                return False
        except ValueError:
            logger.debug("Age is not a valid number: %s", value)
            return False

    return True


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
        logger.debug("No extraction vars configured, not continuing extraction")
        return False

    required_vars = [var.name for var in node.extract_vars if var.required]
    missing_required = [var for var in required_vars if var not in extracted_vars]

    if missing_required:
        logger.info("Extraction incomplete - Missing required variables: %s", missing_required)
        logger.debug("Currently extracted: %s, Required: %s",
                    list(extracted_vars.keys()), required_vars)
        return True

    logger.info("All required variables extracted - Continuing flow")
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