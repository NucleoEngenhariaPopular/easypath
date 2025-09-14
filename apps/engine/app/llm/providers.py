from .base import LLMClient
from .deepseek import DeepSeekClient
from .gemini import GeminiClient
from ..config import settings


def get_llm() -> LLMClient:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "deepseek":
        return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)
    if provider == "gemini":
        return GeminiClient()
    # default fallback
    return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)


