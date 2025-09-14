from typing import Any, Dict, List, Optional

from .base import LLMClient, LLMResult
from ..config import settings


class GeminiClient(LLMClient):
    """
    Supports two modes:
    - API key mode via google-genai (GOOGLE_API_KEY)
    - Vertex AI mode via google-genai with vertexai=True (uses ADC or env)
    """

    def __init__(self) -> None:
        self.model = settings.GOOGLE_GEMINI_MODEL
        self.mode = settings.GEMINI_PROVIDER_MODE  # "api" or "vertex"

        try:
            from google import genai  # type: ignore
            from google.genai.types import HttpOptions  # type: ignore
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError("google-genai package is required for GeminiClient") from exc

        if self.mode == "vertex":
            self.client = genai.Client(http_options=HttpOptions(api_version="v1"))
            self.vertex = True
        else:
            # API key mode
            api_key = settings.GOOGLE_API_KEY
            if not api_key:
                raise RuntimeError("GOOGLE_API_KEY is required for GEMINI_PROVIDER_MODE=api")
            # google-genai automatically reads GOOGLE_API_KEY env var; client can be created without params
            self.client = genai.Client(http_options=HttpOptions(api_version="v1"))
            self.vertex = False

    def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> LLMResult:
        try:
            # Convert to library's expected format: list of contents with role ordering.
            # google-genai supports passing messages via contents=[{role, parts:[{text}...]}]
            contents = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                contents.append({"role": role, "parts": [{"text": content}]})

            resp = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config={"temperature": float(temperature)},
            )

            # google-genai responses often have .text for combined text output
            text = getattr(resp, "text", None)
            if isinstance(text, str):
                return LLMResult(success=True, response=text)
            return LLMResult(success=False, response=None, error_message="Empty Gemini response")
        except Exception as exc:  # noqa: BLE001
            return LLMResult(success=False, response=None, error_message=str(exc))


