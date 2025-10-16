from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from ..database import Base
from cryptography.fernet import Fernet
from ..database import settings


class BotConfig(Base):
    """Configuration for messaging platform bots (Telegram, WhatsApp, etc.)"""
    __tablename__ = "bot_configs"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String, nullable=False)  # 'telegram', 'whatsapp', 'sms'
    bot_name = Column(String)  # Friendly name for the bot
    bot_token_encrypted = Column(Text, nullable=False)  # Encrypted bot token/credentials
    flow_id = Column(Integer, nullable=False)  # References flows.id in platform DB
    owner_id = Column(String, nullable=False)  # References users.id in platform DB
    is_active = Column(Boolean, default=True)
    webhook_url = Column(String, nullable=True)  # Configured webhook URL
    webhook_secret = Column(String, nullable=True)  # For webhook validation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    conversations = relationship("PlatformConversation", back_populates="bot_config")

    @property
    def bot_token(self) -> str:
        """Decrypt and return bot token"""
        f = Fernet(settings.secret_key.encode())
        return f.decrypt(self.bot_token_encrypted.encode()).decode()

    @bot_token.setter
    def bot_token(self, value: str):
        """Encrypt and store bot token"""
        f = Fernet(settings.secret_key.encode())
        self.bot_token_encrypted = f.encrypt(value.encode()).decode()


class PlatformConversation(Base):
    """Tracks conversations between platform users and bots"""
    __tablename__ = "platform_conversations"

    id = Column(Integer, primary_key=True, index=True)
    bot_config_id = Column(Integer, ForeignKey("bot_configs.id"), nullable=False)
    platform_user_id = Column(String, nullable=False)  # Telegram user ID, WhatsApp number, etc.
    platform_user_name = Column(String)  # Username or display name
    session_id = Column(String, nullable=False)  # EasyPath engine session ID
    status = Column(String, default='active')  # active, closed, archived
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    bot_config = relationship("BotConfig", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan")


class ConversationMessage(Base):
    """Individual messages in a conversation (for history/debugging)"""
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("platform_conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    platform_message_id = Column(String)  # Original platform message ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("PlatformConversation", back_populates="messages")
