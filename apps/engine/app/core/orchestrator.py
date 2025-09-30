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
    next_node_id, choose_llm_info = choose_next(flow, session, session.current_node_id)
    t_choose = perf_counter() - t_choose

    session.current_node_id = next_node_id

    t_exec = perf_counter()
    assistant_reply, exec_llm_info = generate_response(flow, session, next_node_id)
    t_exec = perf_counter() - t_exec

    session.add_assistant_message(assistant_reply)

    t_total = perf_counter() - t0
    
    step_timings = {
        "choose_next": round(t_choose, 3),
        "generate_response": round(t_exec, 3),
        "total": round(t_total, 3),
        "choose_next_llm_ms": choose_llm_info["timing_ms"],
        "generate_response_llm_ms": exec_llm_info["timing_ms"],
        "choose_next_model": choose_llm_info["model_name"],
        "generate_response_model": exec_llm_info["model_name"],
        "choose_next_tokens": {
            "input": choose_llm_info["input_tokens"],
            "output": choose_llm_info["output_tokens"],
            "total": choose_llm_info["total_tokens"],
            "cost_usd": choose_llm_info["estimated_cost_usd"]
        },
        "generate_response_tokens": {
            "input": exec_llm_info["input_tokens"],
            "output": exec_llm_info["output_tokens"],
            "total": exec_llm_info["total_tokens"],
            "cost_usd": exec_llm_info["estimated_cost_usd"]
        }
    }
    
    total_cost = choose_llm_info["estimated_cost_usd"] + exec_llm_info["estimated_cost_usd"]
    total_tokens = choose_llm_info["total_tokens"] + exec_llm_info["total_tokens"]
    
    logging.info(
        "run_step timings: choose_next=%.3fs(llm=%.1fms,tokens=%d,cost=$%.6f,%s) generate_response=%.3fs(llm=%.1fms,tokens=%d,cost=$%.6f,%s) total=%.3fs total_cost=$%.6f node=%s",
        t_choose,
        choose_llm_info["timing_ms"],
        choose_llm_info["total_tokens"],
        choose_llm_info["estimated_cost_usd"],
        choose_llm_info["model_name"],
        t_exec,
        exec_llm_info["timing_ms"],
        exec_llm_info["total_tokens"],
        exec_llm_info["estimated_cost_usd"],
        exec_llm_info["model_name"],
        t_total,
        total_cost,
        next_node_id,
    )
    
    return assistant_reply, step_timings


