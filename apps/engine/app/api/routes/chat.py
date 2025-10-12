from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from time import perf_counter
from typing import Dict, Any, Optional

from ...core.chat_manager import new_session
from ...core.orchestrator import run_step
from ...storage.session_store import load_session, save_session
from ...storage.flow_repository import try_load_flow
from ...models.flow import Flow


router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    flow_path: str
    user_message: str


class ChatRequestWithFlow(BaseModel):
    session_id: str
    flow: Dict[str, Any]
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

    # Auto-advance through nodes with skip_user_response enabled
    max_auto_advances = 10  # Safety limit to prevent infinite loops
    auto_advance_count = 0
    while auto_advance_count < max_auto_advances:
        current_node = flow.get_node_by_id(session.current_node_id)
        if current_node and current_node.skip_user_response:
            logging.info(
                "Node %s has skip_user_response=True, auto-advancing to next node",
                session.current_node_id
            )
            t0 = perf_counter()
            reply, step_timings = run_step(flow, session, "[AUTO_ADVANCE]")
            t_run_step += perf_counter() - t0
            auto_advance_count += 1
        else:
            break

    if auto_advance_count >= max_auto_advances:
        logging.warning(
            "Auto-advance limit reached (%d). Stopping to prevent infinite loop.",
            max_auto_advances
        )

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


@router.post("/message-with-flow")
async def post_message_with_flow(payload: ChatRequestWithFlow):
    """
    Chat endpoint that accepts the flow definition directly in the request.
    Used for test mode where the flow might not be saved to a file yet.
    """
    t_total_start = perf_counter()

    t0 = perf_counter()
    session = await load_session(payload.session_id)
    t_session = perf_counter() - t0

    t0 = perf_counter()
    # Parse the flow from the request payload
    try:
        flow = Flow(**payload.flow)
    except Exception as e:
        logging.error(f"Failed to parse flow from payload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid flow format: {str(e)}")
    t_flow = perf_counter() - t0

    if session is None:
        session = new_session(session_id=payload.session_id, first_node_id=flow.first_node_id)

    t0 = perf_counter()
    reply, step_timings = run_step(flow, session, payload.user_message)
    t_run_step = perf_counter() - t0

    # Auto-advance through nodes with skip_user_response enabled
    max_auto_advances = 10  # Safety limit to prevent infinite loops
    auto_advance_count = 0
    while auto_advance_count < max_auto_advances:
        current_node = flow.get_node_by_id(session.current_node_id)
        if current_node and current_node.skip_user_response:
            logging.info(
                "Node %s has skip_user_response=True, auto-advancing to next node",
                session.current_node_id
            )
            t0 = perf_counter()
            reply, step_timings = run_step(flow, session, "[AUTO_ADVANCE]")
            t_run_step += perf_counter() - t0
            auto_advance_count += 1
        else:
            break

    if auto_advance_count >= max_auto_advances:
        logging.warning(
            "Auto-advance limit reached (%d). Stopping to prevent infinite loop.",
            max_auto_advances
        )

    t0 = perf_counter()
    await save_session(session)
    t_save = perf_counter() - t0

    t_total = perf_counter() - t_total_start

    logging.info(
        "chat.message-with-flow timings: session_load=%.3fs flow_parse=%.3fs run_step=%.3fs save_session=%.3fs total=%.3fs session_id=%s current_node=%s",
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