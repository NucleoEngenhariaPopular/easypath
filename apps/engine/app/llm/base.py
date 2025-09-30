from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class LLMResult:
    success: bool
    response: Optional[str]
    error_message: Optional[str] = None
    timing_ms: Optional[float] = None


class LLMClient:
    def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> LLMResult:
        raise NotImplementedError


