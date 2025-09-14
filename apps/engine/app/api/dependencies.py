from typing import Generator

from ..storage.redis_client import get_redis


def redis_dep() -> Generator:
    client = get_redis()
    try:
        yield client
    finally:
        pass


