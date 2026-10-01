"""Normalize WapBlaster inbound webhook payloads to doctor approval replies."""

from __future__ import annotations

from typing import Any


def _dig(obj: Any, *keys: str) -> Any:
    current = obj
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def parse_wapblaster_inbound(payload: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
    """
    Return (from_phone, body_text, button_id).

    Supports multiple shapes (WapBlaster / Meta-forwarded). Extend when a live sample is captured.
    """
    if not payload:
        return None, None, None

    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    if not isinstance(data, dict):
        data = payload

    phone = (
        data.get("phone_number")
        or data.get("from_phone")
        or data.get("from")
        or data.get("phone")
        or data.get("sender")
        or _dig(data, "contact", "phone_number")
        or _dig(payload, "contact", "phone_number")
    )
    if phone is not None:
        phone = str(phone).strip() or None

    button_obj = data.get("button") if isinstance(data.get("button"), dict) else {}
    message_obj = data.get("message") if isinstance(data.get("message"), dict) else {}
    reply_obj = data.get("reply") if isinstance(data.get("reply"), dict) else {}
    button_id = (
        data.get("button_id")
        or data.get("button_payload")
        or data.get("button_text")
        or data.get("buttonText")
        or button_obj.get("payload")
        or button_obj.get("text")
        or reply_obj.get("payload")
        or reply_obj.get("text")
        or _dig(data, "interactive", "button_reply", "id")
        or _dig(data, "interactive", "button_reply", "title")
        or _dig(message_obj, "button", "payload")
        or _dig(message_obj, "button", "text")
        or _dig(message_obj, "interactive", "button_reply", "id")
        or _dig(message_obj, "interactive", "button_reply", "title")
    )
    if isinstance(button_id, dict):
        button_id = button_id.get("id") or button_id.get("payload") or button_id.get("text")
    if button_id is not None:
        button_id = str(button_id).strip() or None

    raw_message = data.get("message")
    body = (
        data.get("message_body")
        or data.get("body")
        or (data.get("text") if isinstance(data.get("text"), str) else None)
        or (raw_message if isinstance(raw_message, str) else None)
        or reply_obj.get("text")
        or _dig(data, "text", "body")
        or _dig(message_obj, "text", "body")
        or (message_obj.get("body") if isinstance(message_obj.get("body"), str) else None)
    )
    if body is not None:
        body = str(body).strip() or None
    if not phone:
        phone = (
            message_obj.get("from")
            or _dig(data, "participants", "sender", "from")
            or _dig(payload, "participants", "sender", "from")
        )
        if phone is not None:
            phone = str(phone).strip() or None

    # Meta-style envelope nested under entry/changes
    if not phone and not body and not button_id:
        for entry in payload.get("entry") or []:
            for change in entry.get("changes") or []:
                value = change.get("value") or {}
                for message in value.get("messages") or []:
                    nested_phone = message.get("from")
                    if nested_phone:
                        phone = str(nested_phone)
                    msg_type = message.get("type")
                    if msg_type == "text":
                        body = (message.get("text") or {}).get("body")
                    elif msg_type == "button":
                        button_id = (message.get("button") or {}).get("payload")
                    elif msg_type == "interactive":
                        interactive = message.get("interactive") or {}
                        if interactive.get("type") == "button_reply":
                            button_id = (interactive.get("button_reply") or {}).get("id")
                    if phone or body or button_id:
                        return phone, body, button_id

    return phone, body, button_id
