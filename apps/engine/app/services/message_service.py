from ..models.session import ChatSession


def format_system_message(text: str) -> dict:
    return {"role": "system", "content": text}


def build_message_history(session: ChatSession) -> list[dict]:
    return session.to_llm_messages()


