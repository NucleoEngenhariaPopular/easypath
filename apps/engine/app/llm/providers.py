from .base import LLMClient
from .deepseek import DeepSeekClient
from ..config import settings


def get_llm() -> LLMClient:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "deepseek":
        return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)
    # Future: add other providers
    return DeepSeekClient(api_key=settings.DEEPSEEK_API_KEY)


