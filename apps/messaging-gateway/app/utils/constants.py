from enum import StrEnum

# INFO: Tables Enums
MessagingPlatform = StrEnum("Platform", ["TELEGRAM", "WHATSAPP", "SMS"])
BotStatus = StrEnum("BotStatus", ["ACTIVE", "INACTIVE"])
PlatformConversationStatus = StrEnum(
    "PlatformConversationStatus", ["ACTIVE", "INACTIVE", "ARCHIVED"]
)
ConversationMessageRoles = StrEnum("ConversationMessageRoles", ["USER", "ASSISTANT"])

#TODO: Create a way to standardize tables names across the app