"""Compose the patient attendant pass on the glassy Conninter artwork."""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

from app.services.meeting_pass_image import (
    _fit_text,
    _paste_circle,
    paste_aligned_qr_and_logo,
)

BLANK_PASS_PATH = Path(__file__).resolve().parents[1] / "assets" / "attendant_pass_blank.png"

# Coordinates match attendant_pass_blank.png at 525x1024.
_BASE_WIDTH = 525
_BASE_HEIGHT = 1024
_PHOTO_CENTER = (128, 198)
_PHOTO_RADIUS = 62
_BAR_X = 268
_BAR_WIDTH = 214
_BAR_YS = (150, 192, 230)
_ISSUED_X = 372
_ISSUED_Y = 266
_ISSUED_WIDTH = 112
_VALUE_X = 232
_VALUE_WIDTH = 252
_VALUE_YS = (350, 400, 450, 496)
# Outer corner-bracket frame on the blank artwork.
_QR_FRAME = (46, 535, 223, 686)
_QR_SIZE = 124
# Same top/height as the QR square (not a separate lower band).
_LOGO_LEFT = 276
_LOGO_RIGHT = 496
_PHONE_X = 262
_PHONE_Y = 952
_PHONE_WIDTH = 210
_NAVY = (16, 32, 84)


def _centered_origin(frame: tuple[int, int, int, int], size: int) -> tuple[int, int]:
    left, top, right, bottom = frame
    return left + (right - left - size) // 2, top + (bottom - top - size) // 2


@dataclass
class AttendantPassContent:
    attendant_name: str
    attendant_phone: str
    pass_number: str
    issued_on: str
    patient_name: str
    patient_id: str
    relationship: str
    validity: str
    hospital_name: str
    ward_name: str
    companion: str | None = None
    security_phone: str | None = None
    qr_png: bytes | None = None
    photo_png: bytes | None = None
    logo_png: bytes | None = None


def render_attendant_pass(content: AttendantPassContent, *, scale: int = 1) -> bytes:
    """Return a PNG of the attendant pass with values drawn in the printed boxes."""
    base = Image.open(BLANK_PASS_PATH).convert("RGBA")
    if base.width != _BASE_WIDTH or base.height != _BASE_HEIGHT:
        base = base.resize((_BASE_WIDTH, _BASE_HEIGHT), Image.Resampling.LANCZOS)

    if content.photo_png:
        try:
            _paste_circle(base, content.photo_png, _PHOTO_CENTER, _PHOTO_RADIUS)
        except Exception:
            pass

    draw = ImageDraw.Draw(base)
    _fit_text(draw, (_BAR_X, _BAR_YS[0]), content.attendant_name, max_width=_BAR_WIDTH, size=15, fill=_NAVY)
    _fit_text(draw, (_BAR_X, _BAR_YS[1]), content.attendant_phone, max_width=_BAR_WIDTH, size=13, fill=_NAVY)
    _fit_text(draw, (_BAR_X, _BAR_YS[2]), content.pass_number, max_width=_BAR_WIDTH, size=13, fill=_NAVY)
    _fit_text(draw, (_ISSUED_X, _ISSUED_Y), content.issued_on, max_width=_ISSUED_WIDTH, size=11, fill=_NAVY)
    _fit_text(draw, (_VALUE_X, _VALUE_YS[0]), content.patient_name, max_width=_VALUE_WIDTH, size=14, fill=_NAVY)
    _fit_text(draw, (_VALUE_X, _VALUE_YS[1]), content.patient_id, max_width=_VALUE_WIDTH, size=14, fill=_NAVY)
    _fit_text(draw, (_VALUE_X, _VALUE_YS[2]), content.relationship, max_width=_VALUE_WIDTH, size=14, fill=_NAVY)
    _fit_text(draw, (_VALUE_X, _VALUE_YS[3]), content.validity, max_width=_VALUE_WIDTH, size=13, fill=_NAVY)

    qr_left, qr_top = _centered_origin(_QR_FRAME, _QR_SIZE)

    if not content.logo_png and content.hospital_name:
        _fit_text(
            draw,
            (_LOGO_LEFT, qr_top + 48),
            content.hospital_name,
            max_width=_LOGO_RIGHT - _LOGO_LEFT - 8,
            size=14,
            fill=_NAVY,
        )

    if content.security_phone:
        _fit_text(
            draw,
            (_PHONE_X, _PHONE_Y),
            content.security_phone,
            max_width=_PHONE_WIDTH,
            size=13,
            fill=(255, 255, 255),
        )

    output_scale = scale if scale > 1 else 1
    if output_scale > 1:
        base = base.resize(
            (base.width * output_scale, base.height * output_scale),
            Image.Resampling.LANCZOS,
        )

    try:
        paste_aligned_qr_and_logo(
            base,
            qr_png=content.qr_png,
            logo_png=content.logo_png,
            qr_left=qr_left * output_scale,
            row_top=qr_top * output_scale,
            side=_QR_SIZE * output_scale,
            logo_left=_LOGO_LEFT * output_scale,
            logo_right=_LOGO_RIGHT * output_scale,
        )
    except Exception:
        pass

    flat = base.convert("RGB")
    buffer = io.BytesIO()
    flat.save(buffer, format="PNG")
    return buffer.getvalue()
