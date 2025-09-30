from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class LLMResult:
    success: bool
    response: Optional[str]
    error_message: Optional[str] = None
    timing_ms: Optional[float] = None
    model_name: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None


class LLMClient:
    def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> LLMResult:
        raise NotImplementedError


