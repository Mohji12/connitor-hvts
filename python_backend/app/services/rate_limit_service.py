import time
from dataclasses import dataclass

from fastapi import HTTPException, Request

from app.cache import incr_window, make_key
from app.config import get_settings, is_test_mode_enabled


@dataclass
class RateLimitRecord:
    count: int
    window_start: float


_storage: dict[str, RateLimitRecord] = {}


def _hit(storage_key: str, window_seconds: int) -> int:
    """Count this request in the current fixed window (Redis when available, else process memory)."""
    count = incr_window(make_key("rl", storage_key), window_seconds)
    if count is not None:
        return count

    now = time.time()
    record = _storage.get(storage_key)
    if not record or now - record.window_start > window_seconds:
        _storage[storage_key] = RateLimitRecord(count=1, window_start=now)
        return 1
    record.count += 1
    return record.count


class RateLimitService:
    def check_otp_rate_limit(self, request: Request) -> None:
        settings = get_settings()
        if settings.rate_limit_skip_in_test_mode and is_test_mode_enabled(settings):
            return

        client_ip = request.client.host if request.client else "unknown"
        if _hit(f"otp:{client_ip}", 3600) > settings.rate_limit_sms_per_hour:
            raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")

    def check_action_rate_limit(self, request: Request, key: str, *, limit: int, window_seconds: int = 3600) -> None:
        settings = get_settings()
        if settings.rate_limit_skip_in_test_mode and is_test_mode_enabled(settings):
            return

        client_ip = request.client.host if request.client else "unknown"
        if _hit(f"{key}:{client_ip}", window_seconds) > limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
