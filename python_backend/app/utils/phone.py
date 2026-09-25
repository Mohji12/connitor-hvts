"""Phone number normalization for SMS and inbound webhook lookup."""

from __future__ import annotations

from app.config import get_settings


def normalize_phone(phone: str, *, country_code: str | None = None) -> str:
    """Normalize to E.164-style +{country}{number} for Twilio and DB comparison."""
    settings = get_settings()
    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+"):
        return cleaned
    cc = (country_code or settings.sms_default_country_code).lstrip("+")
    if cleaned.startswith("0"):
        cleaned = cleaned.lstrip("0")
    return f"+{cc}{cleaned}"


def phones_match(stored: str, incoming: str) -> bool:
    """Return True when two phone strings refer to the same number after normalization."""
    return normalize_phone(stored) == normalize_phone(incoming)


def strip_channel_prefix(phone: str) -> str:
    """Remove Twilio channel prefixes such as whatsapp: or sms:."""
    lowered = phone.strip().lower()
    for prefix in ("whatsapp:", "sms:"):
        if lowered.startswith(prefix):
            return phone.strip()[len(prefix) :]
    return phone.strip()
