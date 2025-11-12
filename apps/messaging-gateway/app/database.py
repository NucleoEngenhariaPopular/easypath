import logging
import os
from functools import lru_cache
from typing import Optional

import httpx
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings


logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    database_url: str
    engine_api_url: str
    platform_api_url: Optional[str] = "http://localhost:8000"  # Platform backend URL
    host: str = "0.0.0.0"
    port: int = 8082
    log_level: str = "INFO"
    webhook_base_url: Optional[str] = None
    secret_key: str
    ngrok_authtoken: str

    # WebSocket configuration (optional, with defaults)
    websocket_timeout: float = 120.0  # 120 seconds default timeout
    websocket_connection_timeout: float = 10.0  # 10 seconds for connection establishment
    websocket_cleanup_delay: float = 5.0  # 5 seconds delay before cleanup

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()


def _discover_ngrok_url() -> Optional[str]:
    ngrok_api_base = os.getenv("NGROK_API_URL", "http://ngrok:4040")
    try:
        response = httpx.get(f"{ngrok_api_base}/api/tunnels", timeout=3.0)
        response.raise_for_status()
        data = response.json()
        for tunnel in data.get("tunnels", []):
            if tunnel.get("proto") == "https" and tunnel.get("public_url"):
                return tunnel["public_url"].rstrip("/")
    except Exception as exc:  # pylint: disable=broad-except
        logger.debug("Unable to auto-detect ngrok tunnel: %s", exc)
    return None


if not settings.webhook_base_url:
    discovered_url = _discover_ngrok_url()
    if discovered_url:
        settings.webhook_base_url = discovered_url
        logger.info("Auto-detected webhook base URL from ngrok: %s", discovered_url)
    else:
        logger.warning(
            "WEBHOOK_BASE_URL is not set and no ngrok tunnel was detected. "
            "Telegram webhooks may fail to register."
        )

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
