from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from .message import Message


class ChatSession(BaseModel):
    session_id: str
    current_node_id: str
    previous_node_id: Optional[str] = None  # Track previous node for global node auto-return
    history: List[Message] = Field(default_factory=list)
    extracted_variables: Dict[str, Any] = Field(default_factory=dict)

    def add_user_message(self, content: str) -> None:
        self.history.append(Message(role="user", content=content))

    def add_assistant_message(self, content: str) -> None:
        self.history.append(Message(role="assistant", content=content))

    def last_message(self) -> str:
        return self.history[-1].content if self.history else ""

    def to_llm_messages(self) -> List[Dict[str, Any]]:
        return [{"content": m.content, "role": m.role} for m in self.history]
    
    def set_variable(self, name: str, value: Any) -> None:
        """Set an extracted variable value"""
        self.extracted_variables[name] = value
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get an extracted variable value"""
        return self.extracted_variables.get(name, default)
    
    def get_variables_text(self) -> str:
        """Get a formatted text of all extracted variables for LLM context"""
        if not self.extracted_variables:
            return ""
        
        vars_text = "\nVariáveis extraídas:\n"
        for name, value in self.extracted_variables.items():
            vars_text += f"- {name}: {value}\n"
        return vars_text


