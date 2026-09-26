import json
import logging
import threading
import time
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from core.config import settings

logger = logging.getLogger(__name__)


class TTLCache:
    def __init__(self) -> None:
        self._redis: Redis | None = (
            Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            if settings.REDIS_URL
            else None
        )
        self._memory: dict[str, tuple[float, str]] = {}
        self._lock = threading.Lock()

    def _key(self, key: str) -> str:
        return f"medsync:{key}"

    def get(self, key: str) -> Any | None:
        full_key = self._key(key)
        if self._redis is not None:
            try:
                raw = self._redis.get(full_key)
                return json.loads(raw) if raw is not None else None
            except RedisError:
                logger.warning("Redis down — using in-process cache")
        with self._lock:
            entry = self._memory.get(full_key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at <= time.monotonic():
                self._memory.pop(full_key, None)
                return None
            return json.loads(value)

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        encoded = json.dumps(value, separators=(",", ":"))
        full_key = self._key(key)
        if self._redis is not None:
            try:
                self._redis.set(full_key, encoded, ex=ttl_seconds)
                return
            except RedisError:
                logger.warning("Redis down — using in-process cache")
        with self._lock:
            self._memory[full_key] = (time.monotonic() + ttl_seconds, encoded)

    def delete_prefix(self, prefix: str) -> None:
        full_prefix = self._key(prefix)
        if self._redis is not None:
            try:
                keys = list(self._redis.scan_iter(match=f"{full_prefix}*"))
                if keys:
                    self._redis.delete(*keys)
            except RedisError:
                logger.warning("Could not invalidate Redis prefix")
        with self._lock:
            for key in [k for k in self._memory if k.startswith(full_prefix)]:
                self._memory.pop(key, None)


cache = TTLCache()
