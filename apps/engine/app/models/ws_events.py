"""WebSocket event models for real-time flow visualization."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Types of WebSocket events emitted during flow execution."""

    # Session events
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"

    # Node events
    NODE_ENTERED = "node_entered"
    NODE_EXITED = "node_exited"

    # Flow events
    PATHWAY_SELECTED = "pathway_selected"
    VARIABLE_EXTRACTED = "variable_extracted"
    RESPONSE_GENERATED = "response_generated"

    # Decision events
    DECISION_STEP = "decision_step"

    # Message events
    USER_MESSAGE = "user_message"
    ASSISTANT_MESSAGE = "assistant_message"
    MESSAGE_PROCESSING_COMPLETE = "message_processing_complete"

    # Error events
    ERROR = "error"


class BaseEvent(BaseModel):
    """Base event model with common fields."""

    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SessionStartedEvent(BaseEvent):
    """Emitted when a conversation session starts."""

    event_type: EventType = EventType.SESSION_STARTED
    flow_id: str
    flow_name: Optional[str] = None


class SessionEndedEvent(BaseEvent):
    """Emitted when a conversation session ends."""

    event_type: EventType = EventType.SESSION_ENDED
    total_messages: int
    duration_seconds: float


class NodeEnteredEvent(BaseEvent):
    """Emitted when flow execution enters a node."""

    event_type: EventType = EventType.NODE_ENTERED
    node_id: str
    node_type: str
    node_name: Optional[str] = None


class NodeExitedEvent(BaseEvent):
    """Emitted when flow execution exits a node."""

    event_type: EventType = EventType.NODE_EXITED
    node_id: str
    node_type: str


class PathwaySelectedEvent(BaseEvent):
    """Emitted when pathway selector chooses next node."""

    event_type: EventType = EventType.PATHWAY_SELECTED
    from_node_id: str
    to_node_id: str
    connection_id: Optional[str] = None
    connection_label: Optional[str] = None
    reasoning: Optional[str] = None
    confidence_score: Optional[float] = None
    available_pathways: List[Dict[str, str]] = Field(default_factory=list)
    llm_response: Optional[str] = None


class VariableExtractedEvent(BaseEvent):
    """Emitted when a variable is extracted from user message."""

    event_type: EventType = EventType.VARIABLE_EXTRACTED
    node_id: str
    variable_name: str
    variable_value: Any
    all_variables: Dict[str, Any]


class ResponseGeneratedEvent(BaseEvent):
    """Emitted when assistant response is generated."""

    event_type: EventType = EventType.RESPONSE_GENERATED
    node_id: str
    response_text: str
    tokens_used: Optional[int] = None


class UserMessageEvent(BaseEvent):
    """Emitted when user sends a message."""

    event_type: EventType = EventType.USER_MESSAGE
    message: str
    current_node_id: Optional[str] = None


class AssistantMessageEvent(BaseEvent):
    """Emitted when assistant sends a message."""

    event_type: EventType = EventType.ASSISTANT_MESSAGE
    message: str
    node_id: str


class MessageProcessingCompleteEvent(BaseEvent):
    """Emitted when the engine completes processing a user message."""

    event_type: EventType = EventType.MESSAGE_PROCESSING_COMPLETE
    current_node_id: str


class DecisionStepEvent(BaseEvent):
    """Emitted for each decision-making step with detailed information."""

    event_type: EventType = EventType.DECISION_STEP
    step_name: str  # e.g., "Pathway Selection", "Variable Extraction", "Response Generation"
    node_id: str
    node_name: Optional[str] = None
    node_prompt: Optional[Dict[str, str]] = None  # context, objective, notes, examples
    previous_node_id: Optional[str] = None
    previous_node_name: Optional[str] = None
    available_pathways: List[Dict[str, str]] = Field(default_factory=list)
    chosen_pathway: Optional[str] = None
    pathway_confidence: Optional[float] = None
    llm_reasoning: Optional[str] = None
    variables_extracted: Optional[Dict[str, Any]] = None
    variables_status: Optional[Dict[str, bool]] = None  # variable_name: was_extracted
    assistant_response: Optional[str] = None
    timing_ms: Optional[float] = None
    tokens_used: Optional[int] = None
    cost_usd: Optional[float] = None
    model_name: Optional[str] = None


class ErrorEvent(BaseEvent):
    """Emitted when an error occurs during flow execution."""

    event_type: EventType = EventType.ERROR
    error_message: str
    error_type: str
    node_id: Optional[str] = None


# Union type for all events
Event = (
    SessionStartedEvent
    | SessionEndedEvent
    | NodeEnteredEvent
    | NodeExitedEvent
    | PathwaySelectedEvent
    | VariableExtractedEvent
    | ResponseGeneratedEvent
    | UserMessageEvent
    | AssistantMessageEvent
    | DecisionStepEvent
    | ErrorEvent
)


class FlowExecutionState(BaseModel):
    """Current state of flow execution (sent on connection)."""

    session_id: str
    current_node_id: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    message_history: List[Dict[str, str]] = Field(default_factory=list)
    is_active: bool = True
