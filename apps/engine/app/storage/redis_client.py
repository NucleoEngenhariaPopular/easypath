from __future__ import annotations
from typing import Any, Optional
import redis.asyncio as redis
from ..config import settings

redis_client: Optional[redis.Redis] = None

async def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        url = settings.REDIS_URL or "redis://localhost:6379/0"
        redis_client = redis.from_url(url, decode_responses=True)
    return redis_client

async def set_json(key: str, value: str, ex_seconds: int | None = None) -> None:
    client = await get_redis()
    await client.set(name=key, value=value, ex=ex_seconds)

async def get_json(key: str) -> str | None:
    client = await get_redis()
    return await client.get(name=key)