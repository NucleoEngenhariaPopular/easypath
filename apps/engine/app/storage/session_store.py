import json
from typing import Optional
from .redis_client import set_json, get_json
from ..models.session import ChatSession

async def save_session(session: ChatSession) -> None:
    await set_json(f"session:{session.session_id}", session.model_dump_json())

async def load_session(session_id: str) -> Optional[ChatSession]:
    data = await get_json(f"session:{session_id}")
    if not data:
        return None
    return ChatSession.model_validate_json(data)