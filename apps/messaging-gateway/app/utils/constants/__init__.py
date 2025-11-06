"""
Constants module for messaging-gateway application.

This module provides centralized constants including enums and database table names.
All constants are re-exported here for backward compatibility with existing imports.
"""

# Re-export all enums for backward compatibility
from .enums import (
    BotStatus,
    ConversationMessageRoles,
    MessagingPlatform,
    PlatformConversationStatus,
)

# Re-export table names
from .tables import TableNames

__all__ = [
    # Enums
    "BotStatus",
    "ConversationMessageRoles",
    "MessagingPlatform",
    "PlatformConversationStatus",
    # Table names
    "TableNames",
]

