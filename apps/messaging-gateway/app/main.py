from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

from .database import Base, engine, settings
from .api import webhooks_router, bots_router
from .api.sessions import router as sessions_router
from .core.logging_config import setup_logging

# Configure logging with file rotation
setup_logging(log_level=settings.log_level, log_dir="logs")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler"""
    # Startup
    logger.info("Starting Messaging Gateway service...")
    logger.info(f"Engine API URL: {settings.engine_api_url}")
    logger.info(f"Webhook Base URL: {settings.webhook_base_url}")

    # Create database tables (if they don't exist)
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

    # Run database migrations
    logger.info("Running database migrations...")
    from .utils.migrations import run_migrations
    try:
        run_migrations()
    except Exception as e:
        logger.error(f"Failed to run migrations: {e}", exc_info=True)

    # Auto-update webhooks for all active bots
    # This is crucial when ngrok URL changes on restart
    logger.info("Updating webhooks for all active bots...")
    from .services.webhook_updater import update_all_webhooks
    try:
        await update_all_webhooks()
    except Exception as e:
        logger.error(f"Failed to update webhooks on startup: {e}", exc_info=True)

    yield

    # Shutdown
    logger.info("Shutting down Messaging Gateway service...")


app = FastAPI(
    title="EasyPath Messaging Gateway",
    description="Gateway service for connecting messaging platforms (Telegram, WhatsApp) to EasyPath flows",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks_router, tags=["Webhooks"])
app.include_router(bots_router, prefix="/api", tags=["Bot Management"])
app.include_router(sessions_router, prefix="/api", tags=["Session Management"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "EasyPath Messaging Gateway",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
