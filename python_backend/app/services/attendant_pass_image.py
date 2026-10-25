"""Compose the patient attendant pass on the glassy Conninter artwork."""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

from app.services.meeting_pass_image import (
    _BLUE,
    _NAVY as _MEETING_NAVY,
    _BLACK,
    _center_text,
    _fit_text,
    _paste_circle,
    _paste_logo,
    paste_crisp_qr,
)

BLANK_PASS_PATH = Path(__file__).resolve().parents[1] / "assets" / "attendant_pass_blank.png"

# Coordinates match attendant_pass_blank.png at 525x1024 (flat centred design).
_BASE_WIDTH = 525
_BASE_HEIGHT = 1024
_PHOTO_CENTER = (263, 152)
_PHOTO_RADIUS = 56
# Centred identity lines under the photo ring.
_NAME_Y = 222
_TITLE_Y = 258
_ROLE_Y = 282
# Values sit above the printed underlines inside each box.
_LEFT_VALUE = (106, 139)
_RIGHT_VALUE = (347, 138)
_ROW1_Y = 350
_ROW2_Y = 415
# Open white band (~y450-783) above "Valid for today only".
_QR_TOP = 465
_QR_SIZE = 230
_LOGO_BOX = (130, 700, 395, 772)
_PHONE_X = 330
_PHONE_Y = 950
_PHONE_WIDTH = 130
_NAVY = _MEETING_NAVY


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

    _center_text(draw, _NAME_Y, content.attendant_name, size=26, fill=_NAVY)
    _center_text(draw, _TITLE_Y, "Attendant Pass", size=16, fill=_NAVY)
    _center_text(draw, _ROLE_Y, "Attendant", size=13, fill=_BLACK, bold=False)

    left_x, left_width = _LEFT_VALUE
    right_x, right_width = _RIGHT_VALUE
    _fit_text(draw, (left_x, _ROW1_Y), content.attendant_name, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, _ROW1_Y), content.pass_number, max_width=right_width, size=12, fill=_NAVY)
    _fit_text(draw, (left_x, _ROW2_Y), content.issued_on, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, _ROW2_Y), content.validity, max_width=right_width, size=12, fill=_NAVY)

    try:
        if content.qr_png:
            qr_left = (_BASE_WIDTH - _QR_SIZE) // 2
            paste_crisp_qr(base, content.qr_png, qr_left, _QR_TOP, _QR_SIZE)
        if content.logo_png:
            _paste_logo(base, content.logo_png, _LOGO_BOX, plate=True, pad=6)
        elif content.hospital_name:
            _center_text(draw, _LOGO_BOX[1] + 14, content.hospital_name, size=14, fill=_NAVY)
    except Exception:
        pass

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
            if content.qr_png:
                qr_left = (base.width - _QR_SIZE * output_scale) // 2
                paste_crisp_qr(
                    base,
                    content.qr_png,
                    qr_left,
                    _QR_TOP * output_scale,
                    _QR_SIZE * output_scale,
                )
            if content.logo_png:
                _paste_logo(
                    base,
                    content.logo_png,
                    tuple(v * output_scale for v in _LOGO_BOX),
                    plate=True,
                    pad=6 * output_scale,
                )
        except Exception:
            pass

    flat = base.convert("RGB")
    buffer = io.BytesIO()
    flat.save(buffer, format="PNG")
    return buffer.getvalue()
