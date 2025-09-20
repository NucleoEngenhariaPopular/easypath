from .base import LLMClient
from .deepseek import DeepSeekClient
from .gemini import GeminiClient
from ..config import settings
import logging


def get_llm() -> LLMClient:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "deepseek":
        return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)
    if provider == "gemini":
        try:
            return GeminiClient()
        except Exception as exc:  # noqa: BLE001
            logging.error("Failed to init GeminiClient, falling back to DeepSeek: %s", exc)
            return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)
    # default fallback
    return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)


