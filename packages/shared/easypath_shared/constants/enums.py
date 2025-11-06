"""Shared enums used across EasyPath services."""

import sys

# StrEnum was added in Python 3.11, provide compatibility for older versions
if sys.version_info >= (3, 11):
    from enum import StrEnum
else:
    from enum import Enum
    
    class StrEnum(str, Enum):
        """
        Enum where members are also instances of str.
        Compatible with Python 3.9+ (StrEnum was added in 3.11).
        """
        def __new__(cls, *args):
            for arg in args:
                if not isinstance(arg, (str, type(None))):
                    raise TypeError(
                        f'{cls.__name__} values must be strings: '
                        f'{arg!r} is a {type(arg).__name__}'
                    )
            return super().__new__(cls, *args)
        
        def __str__(self):
            return self.value
        
        def __repr__(self):
            return f'{self.__class__.__name__}.{self.name}'


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

