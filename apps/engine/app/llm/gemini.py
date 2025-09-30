from typing import Any, Dict, List, Optional

from .base import LLMClient, LLMResult
from .pricing import calculate_cost
from ..config import settings
import logging


class GeminiClient(LLMClient):
    """
    Supports two modes:
    - API key mode via google-genai (GOOGLE_API_KEY)
    - Vertex AI mode (library uses ADC or env); we use default client init
    """

    def __init__(self) -> None:
        self.model = settings.GOOGLE_GEMINI_MODEL
        self.mode = settings.GEMINI_PROVIDER_MODE  # "api" or "vertex"

        try:
            from google import genai  # type: ignore
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError("google-genai package is required for GeminiClient") from exc

        if self.mode == "vertex":
            # For vertex mode, rely on defaults/ADC
            self.client = genai.Client()
            self.vertex = True
        else:
            # API key mode requires GOOGLE_API_KEY present in env
            api_key = settings.GOOGLE_API_KEY
            if not api_key:
                raise RuntimeError("GOOGLE_API_KEY is required for GEMINI_PROVIDER_MODE=api")
            # google-genai reads GOOGLE_API_KEY from env; no params necessary
            self.client = genai.Client()
            self.vertex = False

    def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> LLMResult:
        try:
            import time
            t0 = time.perf_counter()
            contents: List[Dict[str, Any]] = []
            system_chunks: List[str] = []

            for msg in messages:
                raw_role = str(msg.get("role", "user")).lower()
                content = msg.get("content", "")

                if raw_role == "system":
                    if isinstance(content, str) and content:
                        system_chunks.append(content)
                    continue

                role = "user"
                if raw_role == "assistant":
                    role = "model"
                elif raw_role == "user":
                    role = "user"
                else:
                    # Fallback seguro: tudo que não for user/assistant vira user
                    role = "user"

                contents.append({"role": role, "parts": [{"text": str(content)}]})

            system_instruction = "\n\n".join(system_chunks) if system_chunks else None

            # If we only have system messages, convert to user message for Gemini
            if not contents and system_instruction:
                contents.append({"role": "user", "parts": [{"text": system_instruction}]})
                system_instruction = None

            gen_config: Dict[str, Any] = {"temperature": float(temperature)}
            if system_instruction:
                gen_config["system_instruction"] = {"text": system_instruction}

            t_prep = time.perf_counter() - t0

            t1 = time.perf_counter()
            resp = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=gen_config,
            )
            t_llm = time.perf_counter() - t1

            total_time_ms = (t_prep + t_llm) * 1000
            text = getattr(resp, "text", None)
            
            # Extract token usage from response
            input_tokens = 0
            output_tokens = 0
            total_tokens = 0
            
            usage_metadata = getattr(resp, "usage_metadata", None)
            if usage_metadata:
                input_tokens = getattr(usage_metadata, "prompt_token_count", 0)
                output_tokens = getattr(usage_metadata, "candidates_token_count", 0)
                total_tokens = getattr(usage_metadata, "total_token_count", 0)
            
            # Calculate cost
            estimated_cost = calculate_cost(self.model, input_tokens, output_tokens)
            
            if isinstance(text, str):
                logging.info("Gemini timings: prep=%.3fs llm=%.3fs total=%.1fms tokens=%d/%d cost=$%.6f model=%s", 
                           t_prep, t_llm, total_time_ms, input_tokens, output_tokens, estimated_cost, self.model)
                return LLMResult(
                    success=True, 
                    response=text, 
                    timing_ms=round(total_time_ms, 1), 
                    model_name=self.model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    estimated_cost_usd=estimated_cost
                )
            return LLMResult(
                success=False, 
                response=None, 
                error_message="Empty Gemini response", 
                timing_ms=round(total_time_ms, 1), 
                model_name=self.model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost
            )
        except Exception as exc:  # noqa: BLE001
            logging.error("GeminiClient error: %s", exc)
            return LLMResult(
                success=False, 
                response=None, 
                error_message=str(exc), 
                timing_ms=None, 
                model_name=self.model,
                input_tokens=0,
                output_tokens=0,
                total_tokens=0,
                estimated_cost_usd=0.0
            )


