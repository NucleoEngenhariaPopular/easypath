"""
EasyPath Shared Package

A shared Python package containing constants, enums, and utilities
used across multiple EasyPath services.
"""

__version__ = "0.1.0"

# Re-export constants for convenience
from .constants import (
    BotStatus,
    ConversationMessageRoles,
    MessagingPlatform,
    PlatformConversationStatus,
    TableNames,
)

__all__ = [
    "__version__",
    "BotStatus",
    "ConversationMessageRoles",
    "MessagingPlatform",
    "PlatformConversationStatus",
    "TableNames",
]

