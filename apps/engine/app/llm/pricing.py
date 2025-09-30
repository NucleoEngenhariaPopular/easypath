"""
Token pricing information for different LLM providers.
Prices are in USD per 1M tokens.
"""

# DeepSeek pricing (as of 2024)
DEEPSEEK_PRICING = {
    "deepseek-chat": {
        "input": 0.14,   # $0.14 per 1M input tokens
        "output": 0.28   # $0.28 per 1M output tokens
    }
}

# Gemini pricing (as of 2024)
GEMINI_PRICING = {
    "gemini-1.5-flash": {
        "input": 0.075,   # $0.075 per 1M input tokens
        "output": 0.30    # $0.30 per 1M output tokens
    },
    "gemini-1.5-pro": {
        "input": 3.50,    # $3.50 per 1M input tokens
        "output": 10.50   # $10.50 per 1M output tokens
    },
    "gemini-2.0-flash": {
        "input": 0.075,   # $0.075 per 1M input tokens
        "output": 0.30    # $0.30 per 1M output tokens
    },
    "gemini-2.5-flash": {
        "input": 0.075,   # $0.075 per 1M input tokens (estimated)
        "output": 0.30    # $0.30 per 1M output tokens (estimated)
    }
}

def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculate estimated cost in USD for token usage.
    
    Args:
        model_name: Name of the model used
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        
    Returns:
        Estimated cost in USD
    """
    if not model_name or not input_tokens or not output_tokens:
        return 0.0
    
    # Normalize model name
    model_name = model_name.lower()
    
    # Check DeepSeek pricing
    if "deepseek" in model_name:
        pricing = DEEPSEEK_PRICING.get("deepseek-chat", {})
        if pricing:
            input_cost = (input_tokens / 1_000_000) * pricing["input"]
            output_cost = (output_tokens / 1_000_000) * pricing["output"]
            return round(input_cost + output_cost, 6)
    
    # Check Gemini pricing
    if "gemini" in model_name:
        # Try exact match first
        pricing = GEMINI_PRICING.get(model_name)
        if not pricing:
            # Fallback to flash pricing for unknown Gemini models
            pricing = GEMINI_PRICING.get("gemini-2.5-flash", {})
        
        if pricing:
            input_cost = (input_tokens / 1_000_000) * pricing["input"]
            output_cost = (output_tokens / 1_000_000) * pricing["output"]
            return round(input_cost + output_cost, 6)
    
    # Unknown model
    return 0.0

def get_pricing_info(model_name: str) -> dict:
    """
    Get pricing information for a model.
    
    Args:
        model_name: Name of the model
        
    Returns:
        Dictionary with pricing info or empty dict if not found
    """
    if not model_name:
        return {}
    
    model_name = model_name.lower()
    
    if "deepseek" in model_name:
        return DEEPSEEK_PRICING.get("deepseek-chat", {})
    
    if "gemini" in model_name:
        pricing = GEMINI_PRICING.get(model_name)
        if not pricing:
            pricing = GEMINI_PRICING.get("gemini-2.5-flash", {})
        return pricing or {}
    
    return {}