import json
import requests
from typing import Any, Dict
from dotenv import load_dotenv
import os
from time import perf_counter

# Load environment variables from .env file
load_dotenv()

def getAnswer(globalPrompt: str, nodePrompt: str, lastMessage: str, chatHistory: list) -> str:
    url = "https://api.deepseek.com/chat/completions"
    if(lastMessage): chatHistory.append( {"content": lastMessage, "role": "user"})
    chatHistory.append( {"content": globalPrompt +"\n"+ nodePrompt, "role": "system"})
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {os.getenv("DEEPSEEK_API_KEY")}'
    }
    data = {
        "messages": chatHistory,
        "model": "deepseek-chat",
        "frequency_penalty": 0,
        "max_tokens": 8000,
        "presence_penalty": 0,
        "response_format": {"type": "text"},
        "stop": None,
        "stream": False,
        "stream_options": None,
        "temperature": 0.2,
        "top_p": 1,
        "tools": None,
        "tool_choice": "none",
        "logprobs": False,
        "top_logprobs": None
    }
    print(f'\n-----------------------------------------------------------\nHeaders: \n {json.dumps(headers, indent=4)}\n')
    print(f'\n\nBody : \n {json.dumps(data, indent=4)}\n')
    responseTime = perf_counter()
    response = requests.post(url, headers=headers, data=json.dumps(data))
    print(f'\n-----------------------------------------------------------\nResponse: {perf_counter()-responseTime}s \n {json.dumps(response.json(), indent=4)}\n')
    
    if response.status_code == 200:
        return response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
    else:
        raise Exception(f"API call failed with status code {response.status_code}")


if __name__ == "__main__":
    print(getAnswer("Você é um agente virtual, conversando com um usuário no Whatsapp. Mantenha um tom de conversa leve, despojado e altivo. Não use emojis, a menos que explicitamente solicitado, e algumas gírias, se sentir que faz sentido. Tente ao máximo parecer com um ser humando real utilizando o Whatsapp", 
                    "Seu objetivo nesse ponto da conversa é descobrir o nome do usuário.","",[]))