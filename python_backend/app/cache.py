"""Simple in-memory TTL cache for expensive read endpoints."""

import time
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

T = TypeVar("T")

_store: dict[str, tuple[float, Any]] = {}


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
