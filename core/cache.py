import json
import logging
import threading
import time
from typing import Any, Callable, Type

from pydantic import BaseModel
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

    # ── READ ──
    def get(self, key: str) -> Any | None:
        full_key = self._key(key)
        if self._redis is not None:
            try:
                raw = self._redis.get(full_key)
                if raw is None:
                    return None
                try:
                    return json.loads(raw)
                except (TypeError, ValueError):
                    self._redis.delete(full_key)
                    return None
            except RedisError:
                logger.warning("Redis unavailable — falling back to memory cache")

        with self._lock:
            entry = self._memory.get(full_key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at <= time.monotonic():
                self._memory.pop(full_key, None)
                return None
            try:
                return json.loads(value)
            except (TypeError, ValueError):
                self._memory.pop(full_key, None)
                return None

    # ── WRITE ──
    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        try:
            encoded = json.dumps(value, separators=(",", ":"), default=str)
        except (TypeError, ValueError):
            logger.warning("Cache value for %r is not JSON-serializable — skipped", key)
            return

        full_key = self._key(key)
        if self._redis is not None:
            try:
                self._redis.set(full_key, encoded, ex=ttl_seconds)
                return
            except RedisError:
                logger.warning("Redis unavailable — falling back to memory cache")

        with self._lock:
            self._memory[full_key] = (time.monotonic() + ttl_seconds, encoded)

    # ── GET-OR-LOAD ──
    def get_or_set(self, key: str, ttl_seconds: int, loader: Callable[[], Any]) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = loader()
        self.set(key, value, ttl_seconds)
        return value

    # ── INVALIDATE ──
    def delete(self, key: str) -> None:
        full_key = self._key(key)
        if self._redis is not None:
            try:
                self._redis.delete(full_key)
            except RedisError:
                logger.warning("Could not delete Redis key %s", full_key)
        with self._lock:
            self._memory.pop(full_key, None)

    def delete_prefix(self, prefix: str) -> None:
        full_prefix = self._key(prefix)
        patterns = (full_prefix, f"{full_prefix}:*")

        if self._redis is not None:
            try:
                keys: list[str] = []
                for pattern in patterns:
                    keys.extend(self._redis.scan_iter(match=pattern))
                if keys:
                    self._redis.delete(*keys)
            except RedisError:
                logger.warning("Could not invalidate Redis prefix %s", full_prefix)

        with self._lock:
            for stored in [
                k for k in self._memory
                if k == full_prefix or k.startswith(f"{full_prefix}:")
            ]:
                self._memory.pop(stored, None)

    # ── SHUTDOWN ──
    def close(self) -> None:
        if self._redis is not None:
            try:
                self._redis.close()
            except RedisError:
                pass


cache = TTLCache()


def get_cached_model(
    key: str,
    ttl: int,
    schema: Type[BaseModel],
    loader: Callable[[], Any],
) -> dict:
    """Cache a JSON-safe dict; loader() may return ORM objects (schema needs from_attributes=True)."""
    cached = cache.get(key)
    if cached is not None:
        return cached

    payload = schema.model_validate(loader()).model_dump(mode="json")
    cache.set(key, payload, ttl)
    return payload
