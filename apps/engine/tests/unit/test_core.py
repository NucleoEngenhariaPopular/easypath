from app.models.flow import Flow
from app.models.session import ChatSession
from app.core.orchestrator import run_step


def test_run_step_moves_to_next_node(monkeypatch):
    flow = Flow.model_validate(
        {
            "first_node_id": "start-node",
            "nodes": [
                {
                    "id": "start-node",
                    "node_type": "start",
                    "prompt": {},
                    "is_start": True,
                    "is_end": False,
                },
                {
                    "id": "end-node",
                    "node_type": "end",
                    "prompt": {},
                    "is_start": False,
                    "is_end": True,
                },
            ],
            "connections": [
                {
                    "id": "c1",
                    "label": "to-end",
                    "description": "",
                    "else_option": False,
                    "source": "start-node",
                    "target": "end-node",
                }
            ],
            "global_objective": "",
            "global_tone": "",
            "global_language": "",
            "global_behaviour": "",
            "global_values": "",
        }
    )

    session = ChatSession(session_id="s1", current_node_id="start-node")

    # Monkeypatch choose_next and generate_response to avoid LLM calls
    from app.core import pathway_selector, flow_executor

    monkeypatch.setattr(pathway_selector, "choose_next", lambda f, s, nid: "end-node")
    monkeypatch.setattr(flow_executor, "generate_response", lambda f, s, nid: "ok")

    reply = run_step(flow, session, "hi")
    assert reply == "ok"
    assert session.current_node_id == "end-node"
    assert len(session.history) == 2

