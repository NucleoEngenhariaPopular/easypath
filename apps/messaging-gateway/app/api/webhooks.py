from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session
from telegram import Update
import logging
import httpx
from typing import Dict, Any

from ..database import get_db, SessionLocal
from ..models import BotConfig
from ..services.telegram import telegram_service
from ..utils.flow_converter import ensure_engine_format
from ..utils.constants import BotStatus, MessagingPlatform

router = APIRouter()
logger = logging.getLogger(__name__)


async def _process_telegram_update_background(
    bot_config: BotConfig,
    update: Update,
    flow_data: Dict[str, Any]
):
    """
    Background task to process Telegram update.
    This runs after we've already returned 200 OK to Telegram.
    """
    db = SessionLocal()
    try:
        # Process the update
        success = await telegram_service.process_update(
            update=update,
            bot_config=bot_config,
            flow_data=flow_data,
            db=db
        )

        if not success:
            logger.error(f"Failed to process update in background: bot_id={bot_config.id}")

    except Exception as e:
        logger.error(f"Error in background processing: {e}", exc_info=True)
    finally:
        db.close()


@router.post("/webhooks/telegram/{bot_config_id}")
async def telegram_webhook(
    bot_config_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Telegram webhook endpoint.
    Receives updates from Telegram and processes them.

    IMPORTANT: Returns 200 OK immediately to prevent Telegram retries.
    Processing happens in the background.

    URL format: POST /webhooks/telegram/{bot_config_id}
    """
    try:
        # Get bot configuration
        bot_config = db.query(BotConfig).filter(
            BotConfig.id == bot_config_id,
            BotConfig.platform == MessagingPlatform.TELEGRAM,
            BotConfig.is_active == BotStatus.ACTIVE
        ).first()

        if not bot_config:
            logger.error(f"Bot config not found or inactive: {bot_config_id}")
            logger.error(f"Query returned: {bot_config}")
            # Return 200 to prevent Telegram retries (error logged internally)
            return {"status": "error", "message": "Bot not found or inactive"}

        # Get update data from Telegram
        update_data = await request.json()
        update = Update.de_json(update_data)

        if not update.message or not update.message.text:
            logger.warning(f"Received update without text message: {update.update_id}")
            return {"status": "ok", "message": "Received update without text message"}

        if not update.message.from_user:
            logger.warning(f"Received update without from user: {update.update_id}")
            return {"status": "error", "message": "Received update without from user"}

        logger.info(
            f"Received Telegram webhook: bot_id={bot_config_id}, "
            f"user_id={update.message.from_user.id}, "
            f"message=\"{update.message.text[:100]}\""
        )
        logger.debug(f"Full update data: {update}")

        # Fetch flow data from platform database
        flow_data = await _fetch_flow_data(bot_config.flow_id)

        if not flow_data:
            logger.error(f"Flow not found: flow_id={bot_config.flow_id}")
            # Return 200 to prevent Telegram retries (error logged internally)
            return {"status": "error", "message": "Flow configuration not found"}

        # Convert flow format if needed (canvas → engine)
        try:
            #TODO: Check if I really want the format between platform and engine to be different
            flow_data = ensure_engine_format(flow_data)
            logger.debug(f"Flow format validated/converted for flow_id={bot_config.flow_id}")
        except ValueError as e:
            logger.error(f"Invalid flow format: flow_id={bot_config.flow_id}, error={str(e)}")
            # Return 200 to prevent Telegram retries (error logged internally)
            return {"status": "error", "message": f"Invalid flow format: {str(e)}"}

        # Schedule background processing
        background_tasks.add_task(
            _process_telegram_update_background,
            bot_config=bot_config,
            update=update,
            flow_data=flow_data
        )

        # Return 200 OK immediately to prevent Telegram retries
        logger.info(f"Webhook accepted, processing in background: bot_id={bot_config_id}")
        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Error in telegram webhook: {e}", exc_info=True)
        # Always return 200 to prevent Telegram retries (error logged internally)
        return {"status": "error", "message": "Internal server error"}


async def _fetch_flow_data(flow_id: int) -> Dict[str, Any] | None:
    """
    Fetch flow data from the platform database.
    This queries the platform's flows table to get the flow definition.

    Returns:
        Flow data dict in engine format, or None if not found
    """
    try:
        # Import here to avoid circular dependency
        from ..database import settings

        # Query the platform database for the flow
        # We'll use the same database connection since it's shared
        from ..database import SessionLocal

        db = SessionLocal()
        try:
            # Query flows table (from platform backend)
            from sqlalchemy import text

            query = text("SELECT flow_data FROM flows WHERE id = :flow_id")
            result = db.execute(query, {"flow_id": flow_id}).fetchone()

            if result:
                flow_data = result[0]  # flow_data is a JSON column
                logger.debug(f"Fetched flow data: flow_id={flow_id}")
                return flow_data
            else:
                logger.error(f"Flow not found in database: flow_id={flow_id}")
                return None

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error fetching flow data: {e}", exc_info=True)
        return None


@router.get("/webhooks/telegram/{bot_config_id}/info")
async def telegram_webhook_info(
    bot_config_id: int,
    db: Session = Depends(get_db)
):
    """
    Get webhook information for a Telegram bot.
    Useful for debugging and verification.
    """
    try:
        bot_config = db.query(BotConfig).filter(BotConfig.id == bot_config_id).first()

        if not bot_config:
            raise HTTPException(status_code=404, detail="Bot config not found")

        # Get webhook info from Telegram
        bot = telegram_service.get_bot(bot_config)
        webhook_info = await bot.get_webhook_info()

        return {
            "bot_config_id": bot_config_id,
            "bot_name": bot_config.bot_name,
            "is_active": bot_config.is_active,
            "webhook_url": webhook_info.url,
            "pending_update_count": webhook_info.pending_update_count,
            "last_error_date": webhook_info.last_error_date,
            "last_error_message": webhook_info.last_error_message
        }

    except Exception as e:
        logger.error(f"Error getting webhook info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
