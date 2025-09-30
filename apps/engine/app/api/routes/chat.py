from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from time import perf_counter
from typing import Dict, Any, Optional

from ...core.chat_manager import new_session
from ...core.orchestrator import run_step
from ...storage.session_store import load_session, save_session
from ...storage.flow_repository import try_load_flow


router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    flow_path: str
    user_message: str


class TokenInfo(BaseModel):
    input: int
    output: int
    total: int
    cost_usd: float


class StepTimingInfo(BaseModel):
    choose_next: float
    generate_response: float
    total: float
    choose_next_llm_ms: float
    generate_response_llm_ms: float
    choose_next_model: str
    generate_response_model: str
    choose_next_tokens: TokenInfo
    generate_response_tokens: TokenInfo


class TimingInfo(BaseModel):
    session_load: float
    flow_load: float
    run_step: float
    save_session: float
    total: float
    step_details: StepTimingInfo


class ChatResponse(BaseModel):
    reply: str
    current_node_id: str
    timing: TimingInfo
    extracted_variables: Optional[Dict[str, Any]] = None


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
    reply, step_timings = run_step(flow, session, payload.user_message)
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

    step_timing_info = StepTimingInfo(
        choose_next=step_timings["choose_next"],
        generate_response=step_timings["generate_response"],
        total=step_timings["total"],
        choose_next_llm_ms=step_timings["choose_next_llm_ms"],
        generate_response_llm_ms=step_timings["generate_response_llm_ms"],
        choose_next_model=step_timings["choose_next_model"],
        generate_response_model=step_timings["generate_response_model"],
        choose_next_tokens=TokenInfo(**step_timings["choose_next_tokens"]),
        generate_response_tokens=TokenInfo(**step_timings["generate_response_tokens"])
    )
    
    timing_info = TimingInfo(
        session_load=round(t_session, 3),
        flow_load=round(t_flow, 3),
        run_step=round(t_run_step, 3),
        save_session=round(t_save, 3),
        total=round(t_total, 3),
        step_details=step_timing_info
    )
    
    return ChatResponse(
        reply=reply,
        current_node_id=session.current_node_id,
        timing=timing_info,
        extracted_variables=session.extracted_variables if session.extracted_variables else None
    )