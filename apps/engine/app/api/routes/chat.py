from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...core.chat_manager import new_session
from ...core.orchestrator import run_step
from ...storage.session_store import load_session, save_session
from ...storage.flow_repository import try_load_flow


router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    flow_path: str
    user_message: str


@router.post("/message")
async def post_message(payload: ChatRequest):
    session = await load_session(payload.session_id)
    flow = try_load_flow(payload.flow_path)

    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")

    if session is None:
        session = new_session(session_id=payload.session_id, first_node_id=flow.first_node_id)

    reply = run_step(flow, session, payload.user_message)
    await save_session(session)

    return {"reply": reply, "current_node_id": session.current_node_id}