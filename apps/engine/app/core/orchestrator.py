from .pathway_selector import choose_next
from .flow_executor import generate_response
from ..models.session import ChatSession
from ..models.flow import Flow
from time import perf_counter
import logging


def run_step(flow: Flow, session: ChatSession, user_message: str) -> str:
    t0 = perf_counter()
    session.add_user_message(user_message)

    t_choose = perf_counter()
    next_node_id = choose_next(flow, session, session.current_node_id)
    t_choose = perf_counter() - t_choose

    session.current_node_id = next_node_id

    t_exec = perf_counter()
    assistant_reply = generate_response(flow, session, next_node_id)
    t_exec = perf_counter() - t_exec

    session.add_assistant_message(assistant_reply)

    t_total = perf_counter() - t0
    logging.info(
        "run_step timings: choose_next=%.3fs generate_response=%.3fs total=%.3fs node=%s",
        t_choose,
        t_exec,
        t_total,
        next_node_id,
    )
    return assistant_reply


