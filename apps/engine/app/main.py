from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .utils.logging import setup_logging
from .config import settings
import logging
from .api.routes.health import router as health_router
from .api.routes.chat import router as chat_router
from .api.routes.flow import router as flow_router
from .api.routes.ws import router as ws_router

setup_logging(settings.LOG_LEVEL)

app = FastAPI(title="EasyPath Engine", version="0.1.0")

# CORS Configuration for WebSocket and HTTP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(flow_router, prefix="/flow", tags=["flow"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])


@app.get("/")
def read_root():
    return {"service": "engine", "status": "ok"}


@app.on_event("startup")
def startup_log_config():
    provider = settings.LLM_PROVIDER
    has_deepseek = bool(settings.DEEPSEEK_API_KEY)
    has_gemini = bool(settings.GOOGLE_API_KEY)
    logging.info(
        "Engine startup: provider=%s, deepseek_key=%s, gemini_key=%s",
        provider,
        "present" if has_deepseek else "missing",
        "present" if has_gemini else "missing",
    )
