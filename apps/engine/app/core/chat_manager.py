from ..models.session import ChatSession


def new_session(session_id: str, first_node_id: str) -> ChatSession:
    return ChatSession(session_id=session_id, current_node_id=first_node_id)


