import json
import requests
from typing import Any, Dict
import os
from time import perf_counter
import logging

def getLLMAnswer(messages: list, temperature:float = 0.2, model:str = "deepseek") -> dict[str, bool | str |Exception]:
    if model == "deepseek":
        url = "https://api.deepseek.com/chat/completions"   
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {os.getenv("DEEPSEEK_API_KEY")}'
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
            "top_logprobs": None
        }
        
        logging.info(f'\nHeaders: \n {json.dumps(headers, indent=4)}\n')
        logging.info(f'\n\nBody : \n {json.dumps(data, indent=4)}\n')
        
        responseTime = perf_counter()
        try:
            response = requests.post(url, headers=headers, data=json.dumps(data))
        except Exception as error:
            logging.error(f'\n\nAPI call failed with error: {error}\n')
            return {"success":False,"response":"","error_message":error}
        
        logging.info(f'\n\nResponse: {perf_counter()-responseTime}s \n {json.dumps(response.json(), indent=4)}\n')
        
        if response.status_code == 200:
            return {"success":True,"response":str(response.json().get("choices", [{}])[0].get("message", {}).get("content", ""))}
        else:
            
            raise Exception(f"API call failed with status code {response.status_code}")
    else:
        logging.warning(f'\n\nLLM model not found in available list: {model}\n')
        return {"success":False,"response":"","error_message":"Model option not valid"}
