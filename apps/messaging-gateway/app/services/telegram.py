import logging
import httpx
from typing import Dict, Any, Optional
from telegram import Bot, Update
from telegram.ext import Application
from sqlalchemy.orm import Session
from uuid import uuid4

from ..models import BotConfig, PlatformConversation, ConversationMessage
from .engine_client import engine_client

logger = logging.getLogger(__name__)


class TelegramService:
    """Handles Telegram bot interactions and message forwarding"""

    def __init__(self):
        self.bots: Dict[int, Bot] = {}  # bot_config_id -> Bot instance

    def get_bot(self, bot_config: BotConfig) -> Bot:
        """Get or create a Telegram Bot instance for a bot config"""
        if bot_config.id not in self.bots:
            self.bots[bot_config.id] = Bot(token=bot_config.bot_token)
        return self.bots[bot_config.id]

    async def set_webhook(self, bot_config: BotConfig, webhook_url: str) -> bool:
        """Configure webhook for a Telegram bot"""
        try:
            bot = self.get_bot(bot_config)
            success = await bot.set_webhook(url=webhook_url)

            if success:
                logger.info(f"Webhook set successfully for bot {bot_config.id}: {webhook_url}")
                return True
            else:
                logger.error(f"Failed to set webhook for bot {bot_config.id}")
                return False

        except Exception as e:
            logger.error(f"Error setting webhook for bot {bot_config.id}: {e}", exc_info=True)
            return False

    async def process_update(
        self,
        update_data: Dict[str, Any],
        bot_config: BotConfig,
        flow_data: Dict[str, Any],
        db: Session
    ) -> bool:
        """
        Process a Telegram webhook update.

        Args:
            update_data: Raw Telegram update JSON
            bot_config: Bot configuration from database
            flow_data: Flow definition to execute
            db: Database session

        Returns:
            True if processed successfully, False otherwise
        """
        try:
            # Parse Telegram update
            update = Update.de_json(update_data, bot=None)

            if not update.message or not update.message.text:
                logger.warning(f"Received update without text message: {update.update_id}")
                return True  # Not an error, just ignore

            user_message = update.message.text
            telegram_user_id = str(update.message.from_user.id)
            telegram_username = update.message.from_user.username or update.message.from_user.first_name
            chat_id = update.message.chat_id

            logger.info(
                f"Processing Telegram message: bot={bot_config.id}, "
                f"user={telegram_user_id} (@{telegram_username}), "
                f"message=\"{user_message[:100]}\""
            )

            # Get or create conversation
            conversation = db.query(PlatformConversation).filter(
                PlatformConversation.bot_config_id == bot_config.id,
                PlatformConversation.platform_user_id == telegram_user_id
            ).first()

            # Check if conversation is closed
            if conversation and conversation.status == 'closed':
                logger.info(
                    f"Ignoring message for closed session: session={conversation.session_id}, "
                    f"user={telegram_user_id}"
                )
                # Optionally send a message to the user
                await self._send_telegram_message(
                    bot_config=bot_config,
                    chat_id=chat_id,
                    text="This conversation has been closed. Please start a new conversation."
                )
                return True  # Not an error, just ignored

            if not conversation:
                # Create new conversation with unique session ID
                session_id = f"telegram-{bot_config.id}-{telegram_user_id}-{uuid4().hex[:8]}"
                conversation = PlatformConversation(
                    bot_config_id=bot_config.id,
                    platform_user_id=telegram_user_id,
                    platform_user_name=telegram_username,
                    session_id=session_id
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                logger.info(f"Created new conversation: id={conversation.id}, session={session_id}")

            # Store user message
            user_msg = ConversationMessage(
                conversation_id=conversation.id,
                role="user",
                content=user_message,
                platform_message_id=str(update.message.message_id)
            )
            db.add(user_msg)
            db.commit()

            # Forward to engine
            engine_response = await engine_client.send_message(
                session_id=conversation.session_id,
                user_message=user_message,
                flow_data=flow_data
            )

            if not engine_response:
                # Engine error - send error message to user
                await self._send_telegram_message(
                    bot_config=bot_config,
                    chat_id=chat_id,
                    text="Sorry, I'm experiencing technical difficulties. Please try again later."
                )
                return False

            # Get assistant reply
            assistant_reply = engine_response.get("reply", "")

            # Store assistant message
            assistant_msg = ConversationMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=assistant_reply
            )
            db.add(assistant_msg)
            db.commit()

            # Send reply to Telegram
            await self._send_telegram_message(
                bot_config=bot_config,
                chat_id=chat_id,
                text=assistant_reply
            )

            logger.info(
                f"Message processed successfully: bot={bot_config.id}, "
                f"session={conversation.session_id}, "
                f"node={engine_response.get('current_node_id')}, "
                f"reply_preview=\"{assistant_reply[:100]}\""
            )

            return True

        except Exception as e:
            logger.error(f"Error processing Telegram update: {e}", exc_info=True)
            return False

    async def _send_telegram_message(
        self,
        bot_config: BotConfig,
        chat_id: int,
        text: str
    ):
        """Send a message via Telegram Bot API"""
        try:
            bot = self.get_bot(bot_config)

            # Telegram has a 4096 character limit
            if len(text) > 4096:
                # Split long messages
                chunks = [text[i:i+4090] for i in range(0, len(text), 4090)]
                for chunk in chunks:
                    await bot.send_message(chat_id=chat_id, text=chunk)
            else:
                await bot.send_message(chat_id=chat_id, text=text)

            logger.debug(f"Sent Telegram message: chat_id={chat_id}, text_len={len(text)}")

        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}", exc_info=True)
            raise


# Singleton instance
telegram_service = TelegramService()
