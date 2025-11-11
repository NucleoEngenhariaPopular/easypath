"""Shared database table name constants across all EasyPath services."""


class TableNames:
    """
    Centralized database table names for consistency across all services.
    
    This ensures that table names are standardized and can be referenced
    consistently across the monorepo, even when services use different databases.
    """
    
    # Platform backend tables
    USERS = "users"
    FLOWS = "flows"
    
    # Messaging-gateway tables
    BOT_CONFIGS = "bot_configs"
    PLATFORM_CONVERSATIONS = "platform_conversations"
    CONVERSATION_MESSAGES = "conversation_messages"
    EXTRACTED_VARIABLES = "extracted_variables"

