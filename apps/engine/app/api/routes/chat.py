from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from time import perf_counter

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
    t_total_start = perf_counter()

    t0 = perf_counter()
    session = await load_session(payload.session_id)
    t_session = perf_counter() - t0

    t0 = perf_counter()
    flow = try_load_flow(payload.flow_path)
    t_flow = perf_counter() - t0

    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")

    if session is None:
        session = new_session(session_id=payload.session_id, first_node_id=flow.first_node_id)

    t0 = perf_counter()
    reply = run_step(flow, session, payload.user_message)
    t_run_step = perf_counter() - t0

    t0 = perf_counter()
    await save_session(session)
    t_save = perf_counter() - t0

    t_total = perf_counter() - t_total_start

    logging.info(
        "chat.message timings: session_load=%.3fs flow_load=%.3fs run_step=%.3fs save_session=%.3fs total=%.3fs session_id=%s current_node=%s",
        t_session,
        t_flow,
        t_run_step,
        t_save,
        t_total,
        payload.session_id,
        session.current_node_id,
    )

    return {"reply": reply, "current_node_id": session.current_node_id}