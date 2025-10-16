from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
import logging
import httpx
from typing import Dict, Any

from ..database import get_db
from ..models import BotConfig
from ..services.telegram import telegram_service
from ..utils.flow_converter import ensure_engine_format

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/webhooks/telegram/{bot_config_id}")
async def telegram_webhook(
    bot_config_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Telegram webhook endpoint.
    Receives updates from Telegram and processes them.

    URL format: POST /webhooks/telegram/{bot_config_id}
    """
    try:
        # Get bot configuration
        bot_config = db.query(BotConfig).filter(
            BotConfig.id == bot_config_id,
            BotConfig.platform == "telegram",
            BotConfig.is_active == True
        ).first()

        if not bot_config:
            logger.error(f"Bot config not found or inactive: {bot_config_id}")
            raise HTTPException(status_code=404, detail="Bot not found or inactive")

        # Get update data from Telegram
        update_data = await request.json()

        # Extract message text for logging
        message_text = ""
        if update_data.get("message") and update_data["message"].get("text"):
            message_text = update_data["message"]["text"]

        logger.info(
            f"Received Telegram webhook: bot_id={bot_config_id}, "
            f"user_id={update_data.get('message', {}).get('from', {}).get('id')}, "
            f"message=\"{message_text[:100]}\""
        )
        logger.debug(f"Full update data: {update_data}")

        # Fetch flow data from platform database
        flow_data = await _fetch_flow_data(bot_config.flow_id)

        if not flow_data:
            logger.error(f"Flow not found: flow_id={bot_config.flow_id}")
            raise HTTPException(status_code=500, detail="Flow configuration not found")

        # Convert flow format if needed (canvas → engine)
        try:
            flow_data = ensure_engine_format(flow_data)
            logger.debug(f"Flow format validated/converted for flow_id={bot_config.flow_id}")
        except ValueError as e:
            logger.error(f"Invalid flow format: flow_id={bot_config.flow_id}, error={str(e)}")
            raise HTTPException(status_code=500, detail=f"Invalid flow format: {str(e)}")

        # Process the update
        success = await telegram_service.process_update(
            update_data=update_data,
            bot_config=bot_config,
            flow_data=flow_data,
            db=db
        )

        if success:
            return {"status": "ok"}
        else:
            raise HTTPException(status_code=500, detail="Failed to process update")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


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
