from typing import List, Dict, Any
from pydantic import BaseModel, Field
from .message import Message


class ChatSession(BaseModel):
    session_id: str
    current_node_id: str
    history: List[Message] = Field(default_factory=list)

    def add_user_message(self, content: str) -> None:
        self.history.append(Message(role="user", content=content))

    def add_assistant_message(self, content: str) -> None:
        self.history.append(Message(role="assistant", content=content))

    def last_message(self) -> str:
        return self.history[-1].content if self.history else ""

    def to_llm_messages(self) -> List[Dict[str, Any]]:
        return [{"content": m.content, "role": m.role} for m in self.history]


