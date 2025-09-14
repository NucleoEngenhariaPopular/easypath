import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_health():
    client = TestClient(app)
    r = client.get("/health/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_chat_message_with_sample_flow(tmp_path):
    # write a sample flow file
    flow_path = tmp_path / "flow.json"
    flow_path.write_text(
        json.dumps(
            {
                "first_node_id": "start-node",
                "nodes": [
                    {"id": "start-node", "node_type": "start", "prompt": {}, "is_start": True, "is_end": False},
                    {"id": "end-node", "node_type": "end", "prompt": {}, "is_start": False, "is_end": True},
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
    )

    # monkeypatch LLM-dependent functions by direct import override pattern
    from app.core import pathway_selector, flow_executor

    orig_choose_next = pathway_selector.choose_next
    orig_generate_response = flow_executor.generate_response
    pathway_selector.choose_next = lambda f, s, nid: "end-node"
    flow_executor.generate_response = lambda f, s, nid: "ok"

    client = TestClient(app)
    r = client.post(
        "/chat/message",
        json={"session_id": "s1", "flow_path": str(flow_path), "user_message": "hi"},
    )

    # restore
    pathway_selector.choose_next = orig_choose_next
    flow_executor.generate_response = orig_generate_response

    assert r.status_code == 200
    body = r.json()
    assert body["reply"] == "ok"
    assert body["current_node_id"] == "end-node"


