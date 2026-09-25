"""Application timezone helpers — all stored datetimes use IST (Asia/Kolkata)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

try:
    from zoneinfo import ZoneInfo

    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    IST = timezone(timedelta(hours=5, minutes=30))

IST_LABEL = "Asia/Kolkata"


def now_ist() -> datetime:
    """Current time as naive datetime in IST (for MySQL DATETIME columns)."""
    return datetime.now(IST).replace(tzinfo=None)


def today_start_ist() -> datetime:
    n = now_ist()
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


def today_end_ist() -> datetime:
    n = now_ist()
    return n.replace(hour=23, minute=59, second=59, microsecond=999999)


def ist_day_bounds() -> tuple[datetime, datetime]:
    return today_start_ist(), today_end_ist()


def parse_to_ist_naive(value: str) -> datetime:
    """Parse ISO datetime string and return naive IST wall time."""
    normalized = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt.astimezone(IST).replace(tzinfo=None)


def naive_ist_to_utc(dt: datetime) -> datetime:
    """Convert naive IST (or aware) datetime to UTC aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST).astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)


def format_ist_datetime(dt: datetime | None, fmt: str = "%d %b %Y %H:%M") -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime(fmt)


def format_ist_clock(dt: datetime | None) -> str:
    """Short IST wall clock like 6:55 PM."""
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%I:%M %p").lstrip("0")
