"""Enums used across the messaging-gateway application."""

from enum import StrEnum


class MessagingPlatform(StrEnum):
    """Supported messaging platforms."""
    TELEGRAM = "TELEGRAM"
    WHATSAPP = "WHATSAPP"
    SMS = "SMS"


class BotStatus(StrEnum):
    """Bot configuration status."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class PlatformConversationStatus(StrEnum):
    """Platform conversation status."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class ConversationMessageRoles(StrEnum):
    """Roles for conversation messages."""
    USER = "USER"
    ASSISTANT = "ASSISTANT"

