"""WapBlaster (wapblaster.com) outbound WhatsApp — Path B provider."""

from __future__ import annotations

import logging
from collections.abc import Sequence

import httpx

from app.config import get_settings, is_test_mode_enabled, is_wapblaster_configured
from app.utils.phone import normalize_phone

logger = logging.getLogger(__name__)

# Meta UTILITY body parameters are limited to 30 characters each.
WAPBLASTER_UTILITY_PARAM_MAX_LEN = 30

# Templates using only body {{1}}..{{N}} (no dynamic URL button in API payload).
# Meta Utility body params are truncated to 30 chars for these names.
WAPBLASTER_BODY_ONLY_TEMPLATES = frozenset(
    {
        "approval_doctor",
        "conninter_notification",
        "confirmation_template",  # legacy alias
    }
)


def truncate_utility_param(value: str, max_len: int = WAPBLASTER_UTILITY_PARAM_MAX_LEN) -> str:
    text = (value or "").replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = " ".join(text.split())
    return (text or "—")[:max_len]


def template_fields_from_values(
    values: Sequence[str],
    *,
    max_len: int = WAPBLASTER_UTILITY_PARAM_MAX_LEN,
) -> dict[str, str]:
    """Map ordered values to WapBlaster body placeholders field_1, field_2, …"""
    return {
        f"field_{index}": truncate_utility_param(str(value), max_len)
        for index, value in enumerate(values, start=1)
    }


def _digits(phone: str) -> str:
    return normalize_phone(phone).lstrip("+")


def wapblaster_send_url() -> str:
    settings = get_settings()
    base = (settings.wapblaster_api_base or settings.whatsapp_api_url or "").rstrip("/")
    uid = (settings.wapblaster_vendor_uid or "").strip()
    return f"{base}/{uid}/contact/send-message"


def wapblaster_template_url() -> str:
    settings = get_settings()
    base = (settings.wapblaster_api_base or settings.whatsapp_api_url or "").rstrip("/")
    uid = (settings.wapblaster_vendor_uid or "").strip()
    return f"{base}/{uid}/contact/send-template-message"


def message_to_template_fields(message: str, field_count: int) -> dict[str, str]:
    """Split a plain message across field_1..field_N (pads with em dash if needed)."""
    count = max(1, field_count)
    text = (message or "").strip() or "—"
    chunk_size = min(WAPBLASTER_UTILITY_PARAM_MAX_LEN, max(8, (len(text) // count) + 1))
    parts: list[str] = []
    for i in range(count):
        start = i * chunk_size
        if start >= len(text):
            parts.append(parts[-1] if parts else "—")
        else:
            parts.append(text[start : start + chunk_size])
    return template_fields_from_values(parts[:count])


def send_wapblaster_text(phone: str, message: str) -> None:
    """
    POST plain text via WapBlaster contact/send-message.

    Authorization: Bearer <API token>
    Body: { "phone_number": "919876543210", "message_body": "..." }
    """
    settings = get_settings()
    if not is_wapblaster_configured(settings):
        raise RuntimeError(
            "WapBlaster is not configured. Set WAPBLASTER_VENDOR_UID, "
            "WAPBLASTER_ACCESS_TOKEN (or WHATSAPP_ACCESS_TOKEN), and "
            "WAPBLASTER_API_BASE (or WHATSAPP_API_URL)."
        )

    if is_test_mode_enabled(settings):
        logger.info("[HVTS_TEST_MODE] WapBlaster to %s: %s", phone, message[:500])
        return

    token = (settings.wapblaster_access_token or settings.whatsapp_access_token or "").strip()
    url = wapblaster_send_url()
    payload = {
        "phone_number": _digits(phone),
        "message_body": message[:4096],
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    response = httpx.post(url, json=payload, headers=headers, timeout=45)
    if response.status_code not in (200, 201):
        logger.error(
            "WapBlaster send failed to %s: %s %s",
            payload["phone_number"],
            response.status_code,
            response.text[:500],
        )
        response.raise_for_status()

    logger.info("WapBlaster message sent to %s", payload["phone_number"])


def send_wapblaster_template(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    fields: Sequence[str] | dict[str, str],
    extra: dict[str, str] | None = None,
) -> None:
    """
    POST approved WhatsApp template via WapBlaster contact/send-template-message.

    Body includes template_name, template_language, and field_1..field_N for body variables.
    """
    settings = get_settings()
    if not is_wapblaster_configured(settings):
        raise RuntimeError(
            "WapBlaster is not configured. Set WAPBLASTER_VENDOR_UID, "
            "WAPBLASTER_ACCESS_TOKEN (or WHATSAPP_ACCESS_TOKEN), and "
            "WAPBLASTER_API_BASE (or WHATSAPP_API_URL)."
        )

    name = (template_name or "").strip()
    if not name:
        raise ValueError("template_name is required")

    param_max = (
        WAPBLASTER_UTILITY_PARAM_MAX_LEN
        if name.lower() in WAPBLASTER_BODY_ONLY_TEMPLATES
        else 1024
    )
    if isinstance(fields, dict):
        field_map = {k: truncate_utility_param(str(v), param_max) for k, v in fields.items()}
    else:
        field_map = template_fields_from_values(fields, max_len=param_max)

    if is_test_mode_enabled(settings):
        logger.info(
            "[HVTS_TEST_MODE] WapBlaster template %s (%s) to %s: %s",
            name,
            template_language,
            phone,
            field_map,
        )
        return

    token = (settings.wapblaster_access_token or settings.whatsapp_access_token or "").strip()
    url = wapblaster_template_url()
    payload: dict[str, str] = {
        "phone_number": _digits(phone),
        "template_name": name,
        "template_language": (template_language or "en_GB").strip(),
        **field_map,
    }
    if extra:
        for key, value in extra.items():
            if value is not None and str(value).strip():
                payload[str(key)] = str(value)[:2048]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    response = httpx.post(url, json=payload, headers=headers, timeout=45)
    if response.status_code not in (200, 201):
        logger.error(
            "WapBlaster template %s failed to %s: %s %s",
            name,
            payload["phone_number"],
            response.status_code,
            response.text[:500],
        )
        response.raise_for_status()

    logger.info(
        "WapBlaster template %s sent to %s",
        name,
        payload["phone_number"],
    )


def send_wapblaster_appointment_approval(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    visitor_name: str,
    appointment_label: str,
    purpose: str,
    approval_code: str,
    brand_name: str = "Connitor",
) -> None:
    """
    Doctor visit approval on WhatsApp — no web links (those open a browser).

    Uses approval_doctor (or legacy confirmation_template) body vars (max 30 chars each)
    plus quick-reply payload confirm_{code} when the approved Meta template has a Confirm
    quick-reply button. Falls back to plain text: reply CONFIRM {code} to approve in-chat.
    """
    code = (approval_code or "").strip()
    confirm_payload = f"confirm_{code}" if code else "confirm"
    fields = [
        brand_name,
        visitor_name,
        appointment_label,
        purpose or "Visit",
        f"Reply CONFIRM {code}" if code else "Reply CONFIRM",
    ]
    extra = {
        "button_payload": confirm_payload,
        "button_1_payload": confirm_payload,
        "quick_reply_payload": confirm_payload,
    }
    try:
        send_wapblaster_template(
            phone,
            template_name=template_name,
            template_language=template_language,
            fields=fields,
            extra=extra,
        )
    except Exception as exc:
        logger.warning(
            "WapBlaster appointment template %s failed, using plain text: %s",
            template_name,
            exc,
        )
        fallback = (
            f"{brand_name}: New visit request\n"
            f"{truncate_utility_param(visitor_name, 40)}\n"
            f"{truncate_utility_param(appointment_label, 40)}\n"
            f"Reply CONFIRM {code} to approve now.\n"
            f"(Do not use a link — type CONFIRM {code} in this chat.)"
        )
        send_wapblaster_text(phone, fallback)
