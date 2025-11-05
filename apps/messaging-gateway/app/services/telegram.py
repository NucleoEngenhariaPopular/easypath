import logging
import httpx
import asyncio
from typing import Dict, Any, Optional
from telegram import Bot, Update
from telegram.ext import Application
from telegram.constants import ChatAction
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime, timezone

from ..models import BotConfig, PlatformConversation, ConversationMessage
from .engine_client import engine_client
from .engine_ws_client import engine_ws_client

logger = logging.getLogger(__name__)


class TelegramService:
    """Handles Telegram bot interactions and message forwarding"""

    def __init__(self):
        self.bots: Dict[int, Bot] = {}  # bot_config_id -> Bot instance
        # Record container startup time to ignore old messages
        self.startup_time = datetime.now(timezone.utc)
        logger.info(f"TelegramService initialized at {self.startup_time.isoformat()}")

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

            # Check if message is older than container startup (ignore stale messages)
            message_date = update.message.date
            if message_date < self.startup_time:
                age_seconds = (self.startup_time - message_date).total_seconds()
                logger.info(
                    f"Ignoring old message from before container startup: "
                    f"message_date={message_date.isoformat()}, "
                    f"startup_time={self.startup_time.isoformat()}, "
                    f"age={age_seconds:.0f}s, "
                    f"update_id={update.update_id}"
                )
                return True  # Acknowledge but don't process

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
            # Update last_message_at timestamp
            conversation.last_message_at = datetime.now(timezone.utc)
            db.commit()

            # Try streaming mode first
            streaming_success = await self._process_with_streaming(
                bot_config=bot_config,
                chat_id=chat_id,
                conversation=conversation,
                user_message=user_message,
                flow_data=flow_data,
                db=db
            )

            if streaming_success:
                logger.info(
                    f"Message processed successfully (streaming): bot={bot_config.id}, "
                    f"session={conversation.session_id}"
                )
                return True

            # Fall back to HTTP-only mode if streaming failed
            logger.warning(
                f"Streaming failed, falling back to HTTP-only: session={conversation.session_id}"
            )

            # Forward to engine (HTTP)
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
            # Update last_message_at timestamp
            conversation.last_message_at = datetime.now(timezone.utc)
            db.commit()

            # Send reply to Telegram
            await self._send_telegram_message(
                bot_config=bot_config,
                chat_id=chat_id,
                text=assistant_reply
            )

            logger.info(
                f"Message processed successfully (HTTP fallback): bot={bot_config.id}, "
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

    async def _send_typing_indicator(
        self,
        bot_config: BotConfig,
        chat_id: int
    ):
        """Send typing indicator to Telegram (expires after 5 seconds)"""
        try:
            bot = self.get_bot(bot_config)
            await bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
            logger.debug(f"Sent typing indicator: chat_id={chat_id}")
        except Exception as e:
            logger.warning(f"Error sending typing indicator: {e}")
            # Non-critical, don't raise

    async def _keep_typing_alive(
        self,
        bot_config: BotConfig,
        chat_id: int,
        stop_event: asyncio.Event
    ):
        """Keep typing indicator alive by resending every 4 seconds"""
        try:
            while not stop_event.is_set():
                await self._send_typing_indicator(bot_config, chat_id)
                # Wait 4 seconds (typing expires at 5s) or until stopped
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=4.0)
                    break  # Event was set, stop
                except asyncio.TimeoutError:
                    continue  # Resend typing indicator
        except asyncio.CancelledError:
            logger.debug("Typing indicator task cancelled")
        except Exception as e:
            logger.warning(f"Error in typing indicator loop: {e}")

    async def _process_with_streaming(
        self,
        bot_config: BotConfig,
        chat_id: int,
        conversation: PlatformConversation,
        user_message: str,
        flow_data: Dict[str, Any],
        db: Session
    ) -> bool:
        """
        Process message using WebSocket streaming for real-time message delivery.

        Returns:
            True if successful, False if should fall back to HTTP-only
        """
        try:
            logger.info(
                f"Starting streaming mode: session={conversation.session_id}, "
                f"chat_id={chat_id}"
            )

            # Start typing indicator
            stop_typing = asyncio.Event()
            typing_task = asyncio.create_task(
                self._keep_typing_alive(bot_config, chat_id, stop_typing)
            )

            # Start listening for assistant messages via WebSocket
            message_count = 0
            messages_received = []
            messages_sent = {}  # Track (message_text, timestamp) for deduplication
            dedup_window = 2.0  # Only dedupe within 2-second window
            messages_to_save = []  # Batch messages for single commit

            try:
                # Create tasks for WebSocket listener and engine HTTP call
                ws_task = asyncio.create_task(
                    self._collect_assistant_messages(
                        conversation.session_id,
                        messages_received
                    )
                )

                # Trigger engine execution (don't wait for reply, WebSocket handles it)
                engine_task = asyncio.create_task(
                    engine_client.send_message(
                        session_id=conversation.session_id,
                        user_message=user_message,
                        flow_data=flow_data
                    )
                )

                # Wait for messages to arrive via WebSocket
                # As messages arrive, send them to Telegram
                last_check = asyncio.get_event_loop().time()
                processing_timeout = 90.0  # 90 seconds max

                while True:
                    # Check if we have new messages
                    if len(messages_received) > message_count:
                        # Reset timeout when new messages arrive
                        last_check = asyncio.get_event_loop().time()
                        # New message arrived!
                        for i in range(message_count, len(messages_received)):
                            message_text = messages_received[i]

                            # Deduplication: Skip if we sent this exact message within the last 2 seconds
                            current_time = asyncio.get_event_loop().time()
                            if message_text in messages_sent:
                                time_since_sent = current_time - messages_sent[message_text]
                                if time_since_sent < dedup_window:
                                    logger.warning(
                                        f"Skipping duplicate message (sent {time_since_sent:.2f}s ago): "
                                        f"session={conversation.session_id}, message_len={len(message_text)}"
                                    )
                                    message_count += 1
                                    continue
                                else:
                                    # Outside dedup window - this is a legitimate repeat
                                    logger.debug(
                                        f"Sending repeated message (last sent {time_since_sent:.2f}s ago)"
                                    )

                            # Stop typing before sending message
                            stop_typing.set()
                            if not typing_task.done():
                                typing_task.cancel()
                                try:
                                    await typing_task
                                except asyncio.CancelledError:
                                    pass

                            await asyncio.sleep(0.1)  # Brief pause

                            # Send message to Telegram
                            await self._send_telegram_message(
                                bot_config=bot_config,
                                chat_id=chat_id,
                                text=message_text
                            )

                            # Prepare message for database (batch commit later)
                            assistant_msg = ConversationMessage(
                                conversation_id=conversation.id,
                                role="assistant",
                                content=message_text
                            )
                            messages_to_save.append(assistant_msg)

                            # Mark as sent with timestamp
                            messages_sent[message_text] = current_time

                            logger.info(
                                f"Sent streaming message {message_count+1}: session={conversation.session_id}, "
                                f"message_len={len(message_text)}, total_unique={len(messages_sent)}"
                            )

                            message_count += 1

                        # Wait a bit to see if more messages arrive quickly
                        await asyncio.sleep(0.5)

                        # Only restart typing if:
                        # 1. WebSocket is still connected (more messages might come)
                        # 2. No new messages arrived during the wait
                        # 3. Engine hasn't completed yet
                        if not ws_task.done() and len(messages_received) == message_count:
                            # Check if engine task is still running (indicates more processing)
                            if not engine_task.done():
                                stop_typing.clear()
                                typing_task = asyncio.create_task(
                                    self._keep_typing_alive(bot_config, chat_id, stop_typing)
                                )
                                logger.debug("Restarted typing indicator (expecting more messages)")

                    # Check if WebSocket is done
                    if ws_task.done():
                        logger.info(
                            f"WebSocket completed: session={conversation.session_id}, "
                            f"messages_sent={message_count}"
                        )
                        break

                    # Check timeout
                    elapsed = asyncio.get_event_loop().time() - last_check
                    if elapsed > processing_timeout:
                        logger.warning(
                            f"Streaming timeout after {processing_timeout}s: "
                            f"session={conversation.session_id}"
                        )
                        break

                    # Small delay before checking again
                    await asyncio.sleep(0.2)

                # Stop typing indicator
                stop_typing.set()
                if not typing_task.done():
                    typing_task.cancel()

                # Batch commit all messages to database
                if messages_to_save:
                    try:
                        for msg in messages_to_save:
                            db.add(msg)
                        # Update last_message_at timestamp when messages are saved
                        conversation.last_message_at = datetime.now(timezone.utc)
                        db.commit()
                        logger.debug(f"Committed {len(messages_to_save)} messages to database")
                    except Exception as e:
                        logger.error(f"Failed to commit messages to database: {e}")
                        db.rollback()

                # Wait for engine response (for metadata)
                try:
                    engine_response = await asyncio.wait_for(engine_task, timeout=5.0)
                except asyncio.TimeoutError:
                    logger.warning("Engine HTTP response timed out (WebSocket already handled messages)")
                    engine_response = None

                logger.info(
                    f"Streaming completed successfully: session={conversation.session_id}, "
                    f"messages={message_count}"
                )

                return message_count > 0

            except Exception as e:
                logger.error(f"Error in streaming processing: {e}", exc_info=True)
                # Stop typing on error
                stop_typing.set()
                if not typing_task.done():
                    typing_task.cancel()
                return False

        except Exception as e:
            logger.error(f"Failed to start streaming mode: {e}", exc_info=True)
            return False

    async def _collect_assistant_messages(
        self,
        session_id: str,
        messages_list: list
    ):
        """Collect assistant messages from WebSocket and append to list"""
        try:
            async for message in engine_ws_client.listen_for_assistant_messages(session_id):
                messages_list.append(message)
                logger.debug(f"Collected message: session={session_id}, total={len(messages_list)}")
        except Exception as e:
            logger.error(f"Error collecting messages from WebSocket: {e}", exc_info=True)


# Singleton instance
telegram_service = TelegramService()
