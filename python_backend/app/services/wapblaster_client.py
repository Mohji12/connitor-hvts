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
        "conninter_phone_otp",
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
                text = str(value)
                limit = 8192 if text.startswith("http") else 2048
                payload[str(key)] = text[:limit]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    response = httpx.post(url, json=payload, headers=headers, timeout=45)
    body_text = response.text[:500]
    accepted = response.status_code in (200, 201)
    if accepted:
        try:
            result = response.json()
        except ValueError:
            result = {}
        if isinstance(result, dict) and str(result.get("result", "success")).lower() not in ("success", "ok", ""):
            accepted = False
    if not accepted:
        logger.error(
            "WapBlaster template %s failed to %s: %s %s",
            name,
            payload["phone_number"],
            response.status_code,
            body_text,
        )
        raise RuntimeError(
            body_text or f"WapBlaster template was not accepted ({response.status_code})"
        )

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
    doctor_name: str,
    visitor_name: str,
    organization: str,
    visitor_type: str,
    purpose: str,
    department: str,
    requested_date: str,
    requested_time: str,
    items_carrying: str,
    visit_id: str,
    approval_code: str,
    brand_name: str = "Conninter",
) -> None:
    """
    Doctor visit approval via conninter_doctor_visit_approval.

    Body {{1}}..{{10}} match the approved template. {{9}} is what the visitor
    is carrying and {{10}} is the visit id. Confirm Visit is button_0 and
    Reject Visit is button_1.
    """
    code = (approval_code or "").strip()
    fields = [
        doctor_name or "Doctor",
        visitor_name or "Visitor",
        organization or "—",
        visitor_type or "General",
        purpose or "Visit",
        department or "—",
        requested_date or "—",
        requested_time or "—",
        items_carrying or "—",
        visit_id or code or "—",
    ]
    extra = {
        "button_0": f"confirm_{code}" if code else "confirm",
        "button_1": f"no_{code}" if code else "no",
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
            f"{truncate_utility_param(requested_date, 40)} {truncate_utility_param(requested_time, 20)}\n"
            f"Reply CONFIRM {code} to approve, or REJECT {code} to decline."
        )
        send_wapblaster_text(phone, fallback)


def send_wapblaster_visit_rejected(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    visitor_name: str,
    doctor_name: str,
    hospital_name: str,
    department: str,
    requested_date: str,
    requested_time: str,
    visit_id: str,
) -> None:
    """Visitor notice when a doctor rejects a visit.

    Body order matches conninter_visit_rejected: visitor, doctor, hospital,
    department, date, time, visit id.
    """
    fields = [
        visitor_name or "Visitor",
        doctor_name or "Doctor",
        hospital_name or "Hospital",
        department or "—",
        requested_date or "—",
        requested_time or "—",
        visit_id or "—",
    ]
    send_wapblaster_template(
        phone,
        template_name=template_name,
        template_language=template_language,
        fields=fields,
    )


def send_wapblaster_meeting_pass(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    visitor_name: str,
    doctor_name: str,
    hospital_name: str,
    department: str,
    requested_date: str,
    requested_time: str,
    purpose: str,
    items_carrying: str,
    image_url: str,
) -> None:
    """Visitor meeting pass. Header image is the composed pass.

    Body order matches conninter_meeting_pass: visitor, doctor, hospital,
    department, purpose, items carrying, date, time.
    """
    fields = [
        visitor_name or "Visitor",
        doctor_name or "Doctor",
        hospital_name or "Hospital",
        department or "—",
        purpose or "Visit",
        items_carrying or "—",
        requested_date or "—",
        requested_time or "—",
    ]
    media = (image_url or "").strip()
    extra = None
    if media.startswith("http"):
        extra = {
            "header_image": media,
            "header_image_url": media,
            "header_media_url": media,
            "media_url": media,
        }
    send_wapblaster_template(
        phone,
        template_name=template_name,
        template_language=template_language,
        fields=fields,
        extra=extra,
    )


def send_wapblaster_delivery_pass(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    driver_name: str,
    deliver_to: str,
    po_number: str,
    item_text: str,
    vehicle_text: str,
    date_text: str,
    time_text: str,
    image_url: str,
) -> None:
    """Driver delivery pass. Header image is the composed glassy card.

    Body order matches the approved conninter_delivery_pass: driver name,
    delivery to, PO number, item details, vehicle, date, time.
    """
    fields = [
        driver_name or "Driver",
        deliver_to or "Hospital",
        po_number or "—",
        item_text or "—",
        vehicle_text or "—",
        date_text or "—",
        time_text or "—",
    ]
    media = (image_url or "").strip()
    extra = None
    if media.startswith("http"):
        extra = {
            "header_image": media,
            "header_image_url": media,
            "header_media_url": media,
            "media_url": media,
        }
    send_wapblaster_template(
        phone,
        template_name=template_name,
        template_language=template_language,
        fields=fields,
        extra=extra,
    )


def send_wapblaster_order_delivered(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    recipient_name: str,
    hospital_name: str,
    branch_name: str,
    branch_address: str,
    receiving_department: str,
    order_id: str,
    po_number: str,
    order_date: str,
    items: str,
    total_quantity: str,
    delivered_by: str,
    vehicle_number: str,
    delivery_date: str,
    delivery_time: str,
    delivery_reference: str,
) -> None:
    """Hospital order delivered. Body matches conninter_hospital_order_delivered.

    {{1}} name, {{2}} hospital, {{3}} branch, {{4}} address, {{5}} receiving
    department, {{6}} order id, {{7}} PO, {{8}} order date, {{9}} items,
    {{10}} quantity, {{11}} delivered by, {{12}} vehicle, {{13}} delivery date,
    {{14}} delivery time, {{15}} delivery reference.
    """
    fields = [
        recipient_name or "Team",
        hospital_name or "Hospital",
        branch_name or "—",
        branch_address or "—",
        receiving_department or "Receiving",
        order_id or "—",
        po_number or "—",
        order_date or "—",
        items or "—",
        total_quantity or "—",
        delivered_by or "Driver",
        vehicle_number or "—",
        delivery_date or "—",
        delivery_time or "—",
        delivery_reference or order_id or "—",
    ]
    send_wapblaster_template(
        phone,
        template_name=template_name,
        template_language=template_language,
        fields=fields,
    )


def send_wapblaster_attendant_pass(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    attendant_name: str,
    patient_name: str,
    patient_id: str,
    relationship: str,
    issued_on: str,
    validity: str,
    image_url: str,
) -> None:
    """Patient attendant pass. Header image is the pass card.

    Body matches conninter_patient_attendant_pass:
    {{1}} attendant name, {{2}} patient name, {{3}} patient ID,
    {{4}} relationship, {{5}} issued on, {{6}} validity.
    """
    fields = [
        attendant_name or "Attendant",
        patient_name or "Patient",
        patient_id or "—",
        relationship or "—",
        issued_on or "—",
        validity or "—",
    ]
    media = (image_url or "").strip()
    extra = None
    if media.startswith("http"):
        extra = {
            "header_image": media,
            "header_image_url": media,
            "header_media_url": media,
            "media_url": media,
        }
    send_wapblaster_template(
        phone,
        template_name=template_name,
        template_language=template_language,
        fields=fields,
        extra=extra,
    )


def send_wapblaster_phone_otp(
    phone: str,
    *,
    template_name: str,
    template_language: str,
    otp: str,
    valid_minutes: int = 5,
) -> None:
    """Visitor profile phone OTP via otp_verification. field_1 is the code for {{1}} and Copy code.

    valid_minutes is not sent. That Authentication template has no minutes variable.
    """
    logger.debug("Phone OTP template expiry is fixed at %s minutes", valid_minutes)
    code = otp.strip()
    send_wapblaster_template(
        phone,
        template_name=template_name,
        template_language=template_language,
        fields=[code],
        extra={"button_0": code},
    )
