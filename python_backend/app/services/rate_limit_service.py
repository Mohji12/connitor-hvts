import time
from dataclasses import dataclass

from fastapi import HTTPException, Request

from app.config import get_settings, is_test_mode_enabled


@dataclass
class RateLimitRecord:
    count: int
    window_start: float


_storage: dict[str, RateLimitRecord] = {}


class RateLimitService:
    def check_otp_rate_limit(self, request: Request) -> None:
        settings = get_settings()
        if settings.rate_limit_skip_in_test_mode and is_test_mode_enabled(settings):
            return

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        record = _storage.get(client_ip)
        limit = settings.rate_limit_sms_per_hour
        window = 3600

        if not record or now - record.window_start > window:
            _storage[client_ip] = RateLimitRecord(count=1, window_start=now)
            return

        if record.count >= limit:
            raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")

        record.count += 1

    def check_action_rate_limit(self, request: Request, key: str, *, limit: int, window_seconds: int = 3600) -> None:
        settings = get_settings()
        if settings.rate_limit_skip_in_test_mode and is_test_mode_enabled(settings):
            return

        client_ip = request.client.host if request.client else "unknown"
        storage_key = f"{key}:{client_ip}"
        now = time.time()
        record = _storage.get(storage_key)

        if not record or now - record.window_start > window_seconds:
            _storage[storage_key] = RateLimitRecord(count=1, window_start=now)
            return

        if record.count >= limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

        record.count += 1
