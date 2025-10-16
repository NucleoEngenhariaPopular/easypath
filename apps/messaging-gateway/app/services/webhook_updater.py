"""
Automatic webhook updater for messaging bots.

Updates webhook URLs when ngrok URL changes (e.g., on service restart).
"""
import logging
from sqlalchemy.orm import Session
from typing import Optional
import asyncio

from ..models import BotConfig
from ..database import SessionLocal, settings
from .telegram import telegram_service

logger = logging.getLogger(__name__)


async def update_all_webhooks(webhook_base_url: Optional[str] = None):
    """
    Update webhooks for all active bots.

    This should be called on service startup to ensure all bots have
    the correct webhook URL (especially important when ngrok URL changes).

    Args:
        webhook_base_url: Base URL for webhooks. If None, uses settings.webhook_base_url
    """
    if not webhook_base_url:
        webhook_base_url = settings.webhook_base_url

    if not webhook_base_url:
        logger.warning(
            "Cannot update webhooks: WEBHOOK_BASE_URL is not set. "
            "Skipping automatic webhook registration."
        )
        return

    logger.info(f"Starting automatic webhook update with base URL: {webhook_base_url}")

    db = SessionLocal()
    try:
        # Get all active bots
        active_bots = db.query(BotConfig).filter(BotConfig.is_active == True).all()

        if not active_bots:
            logger.info("No active bots found. Nothing to update.")
            return

        logger.info(f"Found {len(active_bots)} active bot(s) to update")

        success_count = 0
        failure_count = 0

        for bot in active_bots:
            try:
                # Construct webhook URL for this bot
                webhook_url = f"{webhook_base_url}/webhooks/{bot.platform}/{bot.id}"

                logger.info(
                    f"Updating webhook for bot '{bot.bot_name}' (id={bot.id}, "
                    f"platform={bot.platform})"
                )

                # Update webhook based on platform
                if bot.platform == "telegram":
                    success = await telegram_service.set_webhook(bot, webhook_url)

                    if success:
                        # Update database record
                        bot.webhook_url = webhook_url
                        db.commit()

                        logger.info(
                            f"✓ Webhook updated successfully for bot '{bot.bot_name}': "
                            f"{webhook_url}"
                        )
                        success_count += 1
                    else:
                        logger.error(
                            f"✗ Failed to set webhook for bot '{bot.bot_name}' (id={bot.id})"
                        )
                        failure_count += 1

                elif bot.platform == "whatsapp":
                    # WhatsApp webhook setup will be implemented later
                    logger.info(
                        f"⊘ Skipping WhatsApp bot '{bot.bot_name}' - not yet implemented"
                    )

                else:
                    logger.warning(
                        f"⊘ Unknown platform '{bot.platform}' for bot '{bot.bot_name}'"
                    )

            except Exception as e:
                logger.error(
                    f"✗ Error updating webhook for bot '{bot.bot_name}' (id={bot.id}): {e}",
                    exc_info=True
                )
                failure_count += 1

        # Summary
        logger.info(
            f"Webhook update complete: {success_count} successful, "
            f"{failure_count} failed, {len(active_bots)} total"
        )

    except Exception as e:
        logger.error(f"Error during webhook update process: {e}", exc_info=True)
    finally:
        db.close()


def sync_update_all_webhooks(webhook_base_url: Optional[str] = None):
    """
    Synchronous wrapper for update_all_webhooks.
    Used for startup events.
    """
    asyncio.run(update_all_webhooks(webhook_base_url))
