"""
Flow format converter for messaging gateway.

Converts between Canvas format (from platform database) and Engine format.
"""
from typing import Dict, Any, List, Optional


def is_canvas_format(flow_data: Dict[str, Any]) -> bool:
    """Check if flow data is in canvas format (frontend)"""
    return (
        "nodes" in flow_data
        and "edges" in flow_data
        and "globalConfig" in flow_data
    )


def is_engine_format(flow_data: Dict[str, Any]) -> bool:
    """Check if flow data is in engine format"""
    return (
        "nodes" in flow_data
        and "connections" in flow_data
        and "first_node_id" in flow_data
    )


def convert_canvas_to_engine(canvas_flow: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert canvas flow format to engine format.

    Canvas format (from frontend):
    - nodes: list of React Flow nodes with position, type, data
    - edges: list of connections
    - globalConfig: global settings

    Engine format:
    - first_node_id: starting node
    - nodes: list with node_type, prompt, is_start, is_end, etc
    - connections: list with source, target, label, description
    - global_*: global configuration fields
    """
    nodes = canvas_flow.get("nodes", [])
    edges = canvas_flow.get("edges", [])
    global_config = canvas_flow.get("globalConfig", {})

    # Find start node
    start_node = next((n for n in nodes if n.get("data", {}).get("isStart")), None)
    first_node_id = start_node["id"] if start_node else (nodes[0]["id"] if nodes else "")

    # Convert nodes
    engine_nodes = []
    for node in nodes:
        node_id = node.get("id", "")
        node_type = node.get("type", "normal")
        data = node.get("data", {})

        # Extract prompt data
        prompt_data = data.get("prompt", {})

        # Convert extract_vars
        extract_vars = []
        for var in data.get("extractVars", []):
            extract_vars.append({
                "name": var.get("name", ""),
                "description": var.get("description", ""),
                "required": var.get("required", False),
                "var_type": var.get("varType", "string"),
            })

        # Determine if end node
        is_end = node_type == "end" or data.get("name") == "End"

        # Model options
        model_options = data.get("modelOptions", {})

        engine_node = {
            "id": node_id,
            "node_type": node_type,
            "prompt": {
                "context": prompt_data.get("context", ""),
                "objective": prompt_data.get("objective", ""),
                "notes": prompt_data.get("notes", ""),
                "examples": prompt_data.get("examples", ""),
                "custom_fields": prompt_data.get("custom_fields", {}),
            },
            "is_start": data.get("isStart", False),
            "is_end": is_end,
            "use_llm": node_type not in ["start", "end"],
            "is_global": data.get("isGlobal", False),
            "node_description": data.get("nodeDescription", ""),
            "auto_return_to_previous": data.get("autoReturnToPrevious", False),
            "extract_vars": extract_vars,
            "temperature": model_options.get("temperature", 0.2),
            "skip_user_response": model_options.get("skipUserResponse", False),
            "loop_enabled": data.get("loopEnabled", False),
            "overrides_global_pathway": False,
            "loop_condition": data.get("condition", ""),
        }

        engine_nodes.append(engine_node)

    # Convert edges to connections
    engine_connections = []
    for edge in edges:
        edge_data = edge.get("data", {})
        engine_connection = {
            "id": edge.get("id", ""),
            "label": edge.get("label", ""),
            "description": edge_data.get("description", ""),
            "else_option": edge_data.get("else_option", False),
            "source": edge.get("source", ""),
            "target": edge.get("target", ""),
        }
        engine_connections.append(engine_connection)

    # Build engine flow
    engine_flow = {
        "first_node_id": first_node_id,
        "nodes": engine_nodes,
        "connections": engine_connections,
        "global_objective": global_config.get("roleAndObjective", ""),
        "global_tone": global_config.get("toneAndStyle", ""),
        "global_language": global_config.get("languageAndFormatRules", ""),
        "global_behaviour": global_config.get("behaviorAndFallbacks", ""),
        "global_values": global_config.get("placeholdersAndVariables", ""),
    }

    return engine_flow


def ensure_engine_format(flow_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensure flow data is in engine format.
    Converts if necessary.
    """
    if is_engine_format(flow_data):
        return flow_data
    elif is_canvas_format(flow_data):
        return convert_canvas_to_engine(flow_data)
    else:
        raise ValueError("Unknown flow format - missing required fields")
