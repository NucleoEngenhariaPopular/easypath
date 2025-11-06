from datetime import datetime
from typing import Optional

from cryptography.fernet import Fernet
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy import Enum as DBEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, settings
from easypath_shared.constants import (
    BotStatus,
    ConversationMessageRoles,
    MessagingPlatform,
    PlatformConversationStatus,
    TableNames,
)


class BotConfig(Base):
    """Configuration for messaging platform bots (Telegram, WhatsApp, etc.)"""

    __tablename__ = TableNames.BOT_CONFIGS

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    platform: Mapped[MessagingPlatform] = mapped_column(
        DBEnum(MessagingPlatform, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    bot_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    bot_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    flow_id: Mapped[int] = mapped_column(
        nullable=False
    )  # References flows.id in platform DB
    owner_id: Mapped[str] = mapped_column(
        nullable=False
    )  # References users.id in platform DB
    is_active: Mapped[BotStatus] = mapped_column(
        DBEnum(BotStatus, values_callable=lambda x: [e.value for e in x]),
        default=BotStatus.ACTIVE,
    )
    webhook_url: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # Configured webhook URL
    webhook_secret: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # For webhook validation
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

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

    __tablename__ = TableNames.PLATFORM_CONVERSATIONS

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    bot_config_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(f"{TableNames.BOT_CONFIGS}.id"), nullable=False
    )
    platform_user_id: Mapped[str] = mapped_column(
        String, nullable=False
    )  # Telegram user ID, WhatsApp number, etc.
    platform_user_name: Mapped[Optional[str]] = mapped_column(
        String
    )  # Username or display name
    session_id: Mapped[str] = mapped_column(
        String, nullable=False
    )  # EasyPath engine session ID
    status: Mapped[PlatformConversationStatus] = mapped_column(
        DBEnum(
            PlatformConversationStatus, values_callable=lambda x: [e.value for e in x]
        ),
        default=PlatformConversationStatus.ACTIVE,
    )
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    # TODO: Create a way to standardize relationships across the app
    bot_config = relationship("BotConfig", back_populates="conversations")
    messages = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class ConversationMessage(Base):
    """Individual messages in a conversation (for history/debugging)"""

    __tablename__ = TableNames.CONVERSATION_MESSAGES

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(f"{TableNames.PLATFORM_CONVERSATIONS}.id"), nullable=False
    )
    role: Mapped[ConversationMessageRoles] = mapped_column(
        DBEnum(
            ConversationMessageRoles, values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    platform_message_id: Mapped[Optional[str]] = mapped_column(
        String
    )  # Original platform message ID
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    conversation = relationship("PlatformConversation", back_populates="messages")
