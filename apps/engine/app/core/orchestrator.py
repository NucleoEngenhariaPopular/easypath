from .pathway_selector import choose_next
from .flow_executor import generate_response
from ..models.session import ChatSession
from ..models.flow import Flow


def run_step(flow: Flow, session: ChatSession, user_message: str) -> str:
    session.add_user_message(user_message)
    next_node_id = choose_next(flow, session, session.current_node_id)
    session.current_node_id = next_node_id
    assistant_reply = generate_response(flow, session, next_node_id)
    session.add_assistant_message(assistant_reply)
    return assistant_reply


