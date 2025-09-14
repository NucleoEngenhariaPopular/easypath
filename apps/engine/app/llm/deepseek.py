import json
import logging
import os
from time import perf_counter
from typing import Any, Dict, List
import requests

from .base import LLMClient, LLMResult


class DeepSeekClient(LLMClient):
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        self.url = "https://api.deepseek.com/chat/completions"

    def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> LLMResult:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        data = {
            "messages": messages,
            "model": "deepseek-chat",
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

        logging.info(f"\nHeaders: \n {json.dumps(headers, indent=4)}\n")
        logging.info(f"\n\nBody : \n {json.dumps(data, indent=4)}\n")

        response_time = perf_counter()
        try:
            response = requests.post(self.url, headers=headers, data=json.dumps(data))
        except Exception as error:  # noqa: BLE001
            logging.error(f"\n\nAPI call failed with error: {error}\n")
            return LLMResult(success=False, response=None, error_message=str(error))

        logging.info(f"\n\nResponse: {perf_counter()-response_time}s \n {json.dumps(response.json(), indent=4)}\n")

        if response.status_code == 200:
            content = str(response.json().get("choices", [{}])[0].get("message", {}).get("content", ""))
            return LLMResult(success=True, response=content)
        return LLMResult(success=False, response=None, error_message=f"HTTP {response.status_code}")


