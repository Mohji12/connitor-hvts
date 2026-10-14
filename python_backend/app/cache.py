"""Caching: Redis (shared, survives restarts) with an in-memory TTL store as legacy fallback.

Redis is optional. When REDIS_URL is unset, CACHE_ENABLED=false, or Redis errors, every helper
fails open: reads miss, writes are skipped, and callers fall through to the database.
"""

import json
import logging
import time
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

import redis
from fastapi.encoders import jsonable_encoder

from app.config import get_settings

T = TypeVar("T")
logger = logging.getLogger(__name__)

_store: dict[str, tuple[float, Any]] = {}

_REDIS_RETRY_AFTER_SECONDS = 30
_client: redis.Redis | None = None
_client_url: str | None = None
_down_until = 0.0
_MISS = object()


def cached(ttl_seconds: int = 60) -> Callable[[Callable[..., T]], Callable[..., T]]:
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            key = f"{func.__module__}.{func.__qualname__}:{args!r}:{sorted(kwargs.items())!r}"
            now = time.monotonic()
            hit = _store.get(key)
            if hit and now - hit[0] < ttl_seconds:
                return hit[1]
            value = func(*args, **kwargs)
            _store[key] = (now, value)
            return value

        return wrapper

    return decorator


def clear_cache() -> None:
    _store.clear()


def get_redis() -> redis.Redis | None:
    """Shared client, or None when caching is off or Redis recently failed."""
    global _client, _client_url
    settings = get_settings()
    if not settings.cache_enabled or not settings.redis_url:
        return None
    if time.monotonic() < _down_until:
        return None
    if _client is None or _client_url != settings.redis_url:
        _client = redis.Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=1.0,
            socket_connect_timeout=2.0,
            health_check_interval=30,
            retry_on_timeout=False,
        )
        _client_url = settings.redis_url
    return _client


def _mark_down(action: str, exc: Exception) -> None:
    global _down_until
    _down_until = time.monotonic() + _REDIS_RETRY_AFTER_SECONDS
    logger.warning("Redis %s failed, bypassing cache for %ss: %s", action, _REDIS_RETRY_AFTER_SECONDS, exc)


def reset_redis_state() -> None:
    global _client, _client_url, _down_until
    _client = None
    _client_url = None
    _down_until = 0.0


def make_key(*parts: object) -> str:
    return ":".join([get_settings().cache_key_prefix, *(str(p) for p in parts)])


def cache_get_json(key: str) -> Any:
    """Cached value, or the module-level ``_MISS`` sentinel (use ``is_miss``)."""
    r = get_redis()
    if r is None:
        return _MISS
    try:
        raw = r.get(key)
    except redis.RedisError as exc:
        _mark_down("read", exc)
        return _MISS
    if raw is None:
        return _MISS
    try:
        return json.loads(raw)
    except ValueError:
        return _MISS


def is_miss(value: Any) -> bool:
    return value is _MISS


def cache_set_json(key: str, value: Any, ttl_seconds: int) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        r.set(key, json.dumps(jsonable_encoder(value)), ex=ttl_seconds)
    except (redis.RedisError, TypeError, ValueError) as exc:
        if isinstance(exc, redis.RedisError):
            _mark_down("write", exc)
        else:
            logger.warning("Cache value for %s is not JSON-serialisable: %s", key, exc)


def cache_delete(*keys: str) -> None:
    r = get_redis()
    if r is None or not keys:
        return
    try:
        r.delete(*keys)
    except redis.RedisError as exc:
        _mark_down("delete", exc)


def namespace_version(namespace: str) -> str:
    """Current version of a key namespace; bumping it orphans every key built with the old one."""
    r = get_redis()
    if r is None:
        return "0"
    try:
        return r.get(make_key("ns", namespace)) or "0"
    except redis.RedisError as exc:
        _mark_down("read", exc)
        return "0"


def bump_namespace(*namespaces: str) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        pipe = r.pipeline(transaction=False)
        for namespace in namespaces:
            pipe.incr(make_key("ns", namespace))
        pipe.execute()
    except redis.RedisError as exc:
        _mark_down("bump", exc)


def remember(key: str, ttl_seconds: int, loader: Callable[[], T]) -> T:
    """Return the cached JSON value for ``key``, else call ``loader`` and cache its result."""
    hit = cache_get_json(key)
    if not is_miss(hit):
        return hit
    value = loader()
    cache_set_json(key, value, ttl_seconds)
    return value


def remember_in_namespace(namespace: str, key_parts: tuple[object, ...], ttl_seconds: int, loader: Callable[[], T]) -> T:
    key = make_key(namespace, f"v{namespace_version(namespace)}", *key_parts)
    return remember(key, ttl_seconds, loader)


def incr_window(key: str, window_seconds: int) -> int | None:
    """Fixed-window counter: returns the count after incrementing, or None if Redis is unavailable."""
    r = get_redis()
    if r is None:
        return None
    try:
        pipe = r.pipeline(transaction=True)
        pipe.incr(key)
        pipe.ttl(key)
        count, ttl = pipe.execute()
        if ttl is None or int(ttl) < 0:
            r.expire(key, window_seconds)
        return int(count)
    except redis.RedisError as exc:
        _mark_down("incr", exc)
        return None
