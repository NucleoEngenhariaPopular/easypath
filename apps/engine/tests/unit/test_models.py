from app.models.flow import Flow


def test_flow_model_parses_sample(tmp_path):
    sample = tmp_path / "flow.json"
    sample.write_text(
        (
            '{"first_node_id":"n1","nodes":[{"id":"n1","node_type":"start","prompt":{},'
            '"is_start":true,"is_end":false,"use_llm":true,"is_global":false,"extract_vars":[],'
            '"temperature":0.2,"skip_user_response":false,"overrides_global_pathway":true,"loop_condition":""}],'
            '"connections":[],"global_objective":"","global_tone":"","global_language":"","global_behaviour":"","global_values":""}'
        )
    )
    data = sample.read_text()
    flow = Flow.model_validate_json(data)
    assert flow.first_node_id == "n1"
    assert len(flow.nodes) == 1

