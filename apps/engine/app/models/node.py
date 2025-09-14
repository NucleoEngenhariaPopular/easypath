from pydantic import BaseModel


class NodeState(BaseModel):
    node_id: str
    visited: bool = False


