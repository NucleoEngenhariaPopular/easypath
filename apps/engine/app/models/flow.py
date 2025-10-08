from typing import List, Optional
from pydantic import BaseModel


class Prompt(BaseModel):
    context: str = ""
    objective: str = ""
    notes: str = ""
    examples: str = ""


class VariableExtraction(BaseModel):
    name: str = ""
    description: str = ""
    required: bool = True


class Node(BaseModel):
    id: str
    node_type: str
    prompt: Prompt = Prompt()
    is_start: bool = False
    is_end: bool = False
    use_llm: bool = True
    is_global: bool = False
    extract_vars: List[VariableExtraction] = []
    temperature: float = 0.2
    skip_user_response: bool = False
    overrides_global_pathway: bool = True
    loop_condition: str = ""


class Connection(BaseModel):
    id: str
    label: str
    description: str
    else_option: bool = False
    source: str
    target: str


class Flow(BaseModel):
    first_node_id: str
    nodes: List[Node]
    connections: List[Connection]
    global_objective: str = ""
    global_tone: str = ""
    global_language: str = ""
    global_behaviour: str = ""
    global_values: str = ""

    def get_node_by_id(self, node_id: str) -> Node:
        return next(node for node in self.nodes if node.id == node_id)

    def get_connection(self, source_id: str, target_id: str) -> Optional[Connection]:
        """Get connection between two nodes, if it exists."""
        for conn in self.connections:
            if conn.source == source_id and conn.target == target_id:
                return conn
        return None


