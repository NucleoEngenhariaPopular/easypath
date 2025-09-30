from .pathway_selector import choose_next
from .flow_executor import generate_response
from ..models.session import ChatSession
from ..models.flow import Flow
from time import perf_counter
import logging
from typing import Tuple, Dict


def run_step(flow: Flow, session: ChatSession, user_message: str) -> Tuple[str, Dict[str, float]]:
    t0 = perf_counter()
    session.add_user_message(user_message)

    t_choose = perf_counter()
    next_node_id, choose_llm_time = choose_next(flow, session, session.current_node_id)
    t_choose = perf_counter() - t_choose

    session.current_node_id = next_node_id

    t_exec = perf_counter()
    assistant_reply, exec_llm_time = generate_response(flow, session, next_node_id)
    t_exec = perf_counter() - t_exec

    session.add_assistant_message(assistant_reply)

    t_total = perf_counter() - t0
    
    step_timings = {
        "choose_next": round(t_choose, 3),
        "generate_response": round(t_exec, 3),
        "total": round(t_total, 3),
        "choose_next_llm_ms": round(choose_llm_time, 1),
        "generate_response_llm_ms": round(exec_llm_time, 1)
    }
    
    logging.info(
        "run_step timings: choose_next=%.3fs(llm=%.1fms) generate_response=%.3fs(llm=%.1fms) total=%.3fs node=%s",
        t_choose,
        choose_llm_time,
        t_exec,
        exec_llm_time,
        t_total,
        next_node_id,
    )
    
    return assistant_reply, step_timings


