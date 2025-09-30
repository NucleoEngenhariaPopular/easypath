import json
import logging
import os
from time import perf_counter
from typing import Any, Dict, List
import requests

from .base import LLMClient, LLMResult
from .pricing import calculate_cost


class DeepSeekClient(LLMClient):
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        self.url = "https://api.deepseek.com/chat/completions"
        self.model_name = "deepseek-chat"

    def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> LLMResult:
        if not self.api_key:
            logging.error("DeepSeekClient: DEEPSEEK_API_KEY ausente. Configure a chave para habilitar o LLM.")
            return LLMResult(success=False, response=None, error_message="DEEPSEEK_API_KEY missing")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        data = {
            "messages": messages,
            "model": self.model_name,
            "frequency_penalty": 0,
            "max_tokens": 8000,
            "presence_penalty": 0,
            "response_format": {"type": "text"},
            "stop": None,
            "stream": False,
            "stream_options": None,
            "temperature": temperature,
            "top_p": 1,
            "tools": None,
            "tool_choice": "none",
            "logprobs": False,
            "top_logprobs": None,
        }

        masked_headers = dict(headers)
        if masked_headers.get("Authorization"):
            masked_headers["Authorization"] = "Bearer ****"
        logging.info(f"\nHeaders: \n {json.dumps(masked_headers, indent=4)}\n")
        logging.info(f"\n\nBody : \n {json.dumps(data, indent=4)}\n")

        start_time = perf_counter()
        try:
            response = requests.post(self.url, headers=headers, data=json.dumps(data))
        except Exception as error:  # noqa: BLE001
            logging.error(f"\n\nAPI call failed with error: {error}\n")
            return LLMResult(success=False, response=None, error_message=str(error))
        
        response_time_ms = (perf_counter() - start_time) * 1000

        # Tenta decodificar JSON do provider para logging; captura erros de parse
        try:
            response_json = response.json()
        except Exception:
            response_json = {"raw_text": response.text[:500]}

        logging.info(f"\n\nResponse: {response_time_ms:.1f}ms \n {json.dumps(response_json, indent=4)}\n")

        if response.status_code == 200:
            content: str = ""
            input_tokens = 0
            output_tokens = 0
            total_tokens = 0
            
            if isinstance(response_json, dict):
                choices = response_json.get("choices")
                if isinstance(choices, list) and choices:
                    first = choices[0]
                    if isinstance(first, dict):
                        message = first.get("message")
                        if isinstance(message, dict):
                            content = str(message.get("content", ""))
                
                # Extract token usage
                usage = response_json.get("usage", {})
                if isinstance(usage, dict):
                    input_tokens = usage.get("prompt_tokens", 0)
                    output_tokens = usage.get("completion_tokens", 0)
                    total_tokens = usage.get("total_tokens", 0)
            
            # Calculate cost
            estimated_cost = calculate_cost(self.model_name, input_tokens, output_tokens)
            
            return LLMResult(
                success=True, 
                response=content, 
                timing_ms=round(response_time_ms, 1), 
                model_name=self.model_name,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost
            )
        if isinstance(response_json, dict):
            err_obj = response_json.get("error")
            error_msg = err_obj.get("message") if isinstance(err_obj, dict) else None
        else:
            error_msg = None
        if not error_msg:
            error_msg = f"HTTP {response.status_code}"
        logging.error(f"DeepSeekClient: chamada falhou: {error_msg}")
        return LLMResult(
            success=False, 
            response=None, 
            error_message=error_msg, 
            timing_ms=round(response_time_ms, 1), 
            model_name=self.model_name,
            input_tokens=0,
            output_tokens=0,
            total_tokens=0,
            estimated_cost_usd=0.0
        )


