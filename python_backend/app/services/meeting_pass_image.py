"""Compose the visitor meeting pass on the blank Conninter artwork."""

from __future__ import annotations

import base64
import io
import json
from dataclasses import dataclass
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.utils.timezone import now_ist

ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"
BLANK_PASS_PATH = ASSETS_DIR / "meeting_pass_blank.png"
HOSPITAL_LOGO_DIR = ASSETS_DIR / "hospital-logos"

# Coordinates match meeting_pass_blank.png at 525x1024.
_BASE_WIDTH = 525
_BASE_HEIGHT = 1024
_PHOTO_CENTER = (124, 236)
_PHOTO_RADIUS = 68
_IDENTITY_BOX = (258, 192, 504, 268)
# Value lines sit on the printed underlines and stop at the end of each line.
_LEFT_VALUE = (108, 130)
_RIGHT_VALUE = (354, 128)
# Open band between the date card and "Valid for today only" (text starts ~y=710).
# Divider is the printed line at x=262. The QR and logo fill that band.
_CARD_TOP = 518
_CARD_SIZE = 150
_DIVIDER_X = 262
_NAVY = (16, 32, 84)
_BLACK = (20, 28, 48)
_BLUE = (0, 112, 214)
_CARD = (230, 241, 251)

_ROLE_LABELS = {
    "SALES_REPRESENTATIVE": "Medical Representative",
    "VENDOR": "Vendor",
    "GENERAL": "General",
}


@dataclass
class MeetingPassContent:
    visitor_name: str
    role_label: str
    company_name: str | None
    doctor_name: str
    hospital_name: str
    department: str
    date_text: str
    time_text: str
    qr_png: bytes | None = None
    photo_png: bytes | None = None
    logo_png: bytes | None = None


def role_label_for(visitor_type: str | None) -> str:
    kind = (visitor_type or "GENERAL").upper()
    return _ROLE_LABELS.get(kind, "General")


def company_for_pass(visitor_type: str | None, company_name: str | None) -> str | None:
    if (visitor_type or "").upper() != "SALES_REPRESENTATIVE":
        return None
    name = (company_name or "").strip()
    return name or None


def doctor_line(name: str | None) -> str:
    text = (name or "Doctor").strip() or "Doctor"
    lowered = text.lower()
    if lowered.startswith("dr.") or lowered.startswith("dr "):
        return text
    return f"Dr. {text}"


def _load_font(size: int, *, bold: bool) -> ImageFont.ImageFont:
    names = ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf") if bold else (
        "arial.ttf",
        "Arial.ttf",
        "DejaVuSans.ttf",
    )
    search = [
        Path("C:/Windows/Fonts"),
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/share/fonts/truetype/liberation"),
        ASSETS_DIR / "fonts",
    ]
    for folder in search:
        for name in names:
            path = folder / name
            if path.is_file():
                return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def _fit_text(
    draw: ImageDraw.ImageDraw,
    origin: tuple[int, int],
    text: str,
    *,
    max_width: int,
    size: int,
    fill: tuple[int, int, int],
    bold: bool = True,
) -> None:
    cleaned = " ".join((text or "").split()) or "—"
    font = _load_font(size, bold=bold)
    while size > 8 and draw.textlength(cleaned, font=font) > max_width:
        size -= 1
        font = _load_font(size, bold=bold)
    if draw.textlength(cleaned, font=font) > max_width:
        trimmed = cleaned
        while trimmed and draw.textlength(trimmed + "…", font=font) > max_width:
            trimmed = trimmed[:-1].rstrip()
        cleaned = (trimmed or "—") + "…"
    draw.text(origin, cleaned, font=font, fill=fill)


def _paste_circle(base: Image.Image, photo_png: bytes, center: tuple[int, int], radius: int) -> None:
    photo = Image.open(io.BytesIO(photo_png)).convert("RGBA")
    diameter = radius * 2
    photo = ImageOps.fit(photo, (diameter, diameter), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    photo.putalpha(mask)
    base.paste(photo, (center[0] - radius, center[1] - radius), photo)


def _trim_logo(logo: Image.Image) -> Image.Image:
    """Drop the blank margin so the mark lines up with the QR card."""
    pixels = logo.load()
    min_x, min_y = logo.size
    max_x = max_y = 0
    found = False
    for y in range(logo.size[1]):
        for x in range(logo.size[0]):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 20 and not (red > 245 and green > 245 and blue > 245):
                found = True
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if not found:
        return logo
    return logo.crop((min_x, min_y, max_x + 1, max_y + 1))


def _paste_logo(
    base: Image.Image,
    logo_png: bytes,
    box: tuple[int, int, int, int],
    *,
    plate: bool = True,
) -> None:
    logo = _trim_logo(Image.open(io.BytesIO(logo_png)).convert("RGBA"))
    left, top, right, bottom = box
    logo.thumbnail((right - left, bottom - top), Image.Resampling.LANCZOS)
    x = left + (right - left - logo.width) // 2
    y = top + (bottom - top - logo.height) // 2
    if plate:
        card = Image.new("RGBA", (right - left, bottom - top), (255, 255, 255, 255))
        base.paste(card, (left, top), card)
    base.paste(logo, (x, y), logo)


def _qr_module_image(payload: str) -> Image.Image:
    """One pixel per module, pure black on white, with the standard quiet zone."""
    code = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=1,
        border=1,
    )
    code.add_data(payload)
    code.make(fit=True)
    return code.make_image(fill_color="#000000", back_color="#ffffff").convert("RGB")


def _fit_qr_image(module: Image.Image, size: int) -> Image.Image:
    """Scale the QR so it fills the square. Nearest-neighbor keeps module edges sharp."""
    side = max(int(size), 1)
    return module.resize((side, side), Image.Resampling.NEAREST)


def _qr_png(payload: str, size: int) -> bytes:
    fitted = _fit_qr_image(_qr_module_image(payload), size)
    buffer = io.BytesIO()
    fitted.save(buffer, format="PNG")
    return buffer.getvalue()


def paste_crisp_qr(base: Image.Image, qr_png: bytes, left: int, top: int, side: int) -> None:
    """Paste a QR into a white square without blurring module edges."""
    module = Image.open(io.BytesIO(qr_png)).convert("RGB")
    plate = Image.new("RGBA", (side, side), (255, 255, 255, 255))
    base.paste(plate, (left, top), plate)
    fitted = _fit_qr_image(module, side)
    base.paste(fitted, (left, top))


def check_in_qr_png(visit, *, size: int = 190) -> bytes:
    """Same check-in payload security already scans from the visit QR."""
    stored = getattr(visit, "visitQRCode", None)
    if isinstance(stored, str) and stored.startswith("data:image"):
        raw = stored.split(",", 1)[1]
        return base64.b64decode(raw)
    visitor = getattr(visit, "visitor", None)
    first = getattr(visitor, "firstName", "") if visitor else ""
    last = getattr(visitor, "lastName", "") if visitor else ""
    code = getattr(visit, "visitCode", None) or getattr(visit, "checkInOtp", None) or ""
    payload = json.dumps(
        {
            "visitId": getattr(visit, "id", None),
            "visitorName": f"{first} {last}".strip(),
            "visitorPhone": getattr(visitor, "phone", None) if visitor else None,
            "purpose": getattr(visit, "purpose", None),
            "staffName": getattr(visit, "staffName", None),
            "visitCode": code,
            "visitorPassId": getattr(visit, "visitorPassId", None),
            "timestamp": now_ist().isoformat(),
        },
        default=str,
    )
    return _qr_png(payload, size)


def hospital_logo_bytes(hospital_chain_id: str | None) -> bytes | None:
    chain_id = (hospital_chain_id or "").strip()
    if not chain_id:
        return None
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        path = HOSPITAL_LOGO_DIR / f"{chain_id}{ext}"
        if path.is_file():
            return path.read_bytes()
    return None


def _department_label(db, visit) -> str:
    name = None
    if getattr(visit, "departmentId", None) and db is not None:
        from app.models import Department

        department = db.get(Department, visit.departmentId)
        if department and department.name:
            name = department.name
    if not name and getattr(visit, "department", None):
        raw = visit.department
        if isinstance(raw, str):
            name = raw.replace("_", " ").title()
    name = name or "—"
    sub_name = None
    if getattr(visit, "subDepartmentId", None) and db is not None:
        from app.models import SubDepartment

        sub = db.get(SubDepartment, visit.subDepartmentId)
        if sub and sub.name:
            sub_name = sub.name
    if sub_name:
        return f"{name} ({sub_name})"
    return name


def _date_and_time(visit) -> tuple[str, str]:
    start = getattr(visit, "appointmentDate", None)
    if not start:
        return "To be decided", "—"
    date_text = start.strftime("%d %b %Y")
    end = getattr(visit, "expectedEndTime", None)
    slot = getattr(visit, "bookedSlot", None)
    if end is None and slot is not None:
        end = getattr(slot, "slotEnd", None)
    start_text = start.strftime("%I:%M %p").lstrip("0")
    if end is not None:
        end_text = end.strftime("%I:%M %p").lstrip("0")
        if end_text != start_text:
            return date_text, f"{start_text} - {end_text}"
    return date_text, start_text


def decode_image_source(raw: str | None) -> bytes | None:
    text = (raw or "").strip()
    if not text:
        return None
    if text.startswith("data:image"):
        try:
            return base64.b64decode(text.split(",", 1)[1])
        except Exception:
            return None
    if text.startswith("http://") or text.startswith("https://"):
        try:
            import httpx

            response = httpx.get(text, timeout=20, follow_redirects=True)
            if response.status_code == 200 and response.content:
                return response.content
        except Exception:
            return None
        return None
    try:
        from app.services.s3_storage_service import S3StorageService

        return S3StorageService().read_bytes(text)
    except Exception:
        return None


def _visitor_photo_bytes(db, visit) -> bytes | None:
    visitor = getattr(visit, "visitor", None)
    photo = decode_image_source(getattr(visitor, "photo", None) if visitor else None)
    if photo or db is None or visitor is None:
        return photo
    account_id = getattr(visitor, "visitorAccountId", None)
    if not account_id:
        return None
    from app.models import VisitorAccount

    account = db.get(VisitorAccount, account_id)
    if account is None:
        return None
    return decode_image_source(getattr(account, "photoStorageKey", None))


def _hospital_name_and_logo(db, visit) -> tuple[str, bytes | None]:
    branch = getattr(visit, "branch", None)
    if branch is None and db is not None and getattr(visit, "branchId", None):
        from app.models import Branch

        branch = db.get(Branch, visit.branchId)
    hospital = "Hospital"
    chain_id = None
    if branch is not None:
        chain = getattr(branch, "hospitalChain", None)
        chain_id = getattr(branch, "hospitalChainId", None)
        if chain is None and db is not None and chain_id:
            from app.models import HospitalChain

            chain = db.get(HospitalChain, chain_id)
        chain_name = getattr(chain, "name", None) if chain is not None else None
        if isinstance(chain_name, str) and chain_name.strip():
            hospital = chain_name.strip()
        else:
            branch_name = getattr(branch, "name", None)
            if isinstance(branch_name, str) and branch_name.strip():
                hospital = branch_name.strip()
    return hospital, hospital_logo_bytes(chain_id if isinstance(chain_id, str) else None)


def assemble_meeting_pass(db, visit) -> MeetingPassContent:
    """Collect the live visit fields drawn on the pass and sent in the template."""
    visitor = getattr(visit, "visitor", None)
    parts = [
        getattr(visitor, "firstName", None) if visitor else None,
        getattr(visitor, "middleName", None) if visitor else None,
        getattr(visitor, "lastName", None) if visitor else None,
    ]
    visitor_name = " ".join(part.strip() for part in parts if isinstance(part, str) and part.strip()) or "Visitor"
    visitor_type = getattr(visit, "visitorType", None)
    company_source = getattr(visit, "companyName", None)
    if not isinstance(company_source, str) or not company_source.strip():
        company_source = getattr(visitor, "company", None) if visitor else None
    staff = getattr(visit, "staff", None)
    doctor_name = doctor_line(
        getattr(staff, "name", None) if staff is not None else getattr(visit, "staffName", None)
    )
    hospital_name, logo_png = _hospital_name_and_logo(db, visit)
    return MeetingPassContent(
        visitor_name=visitor_name,
        role_label=role_label_for(visitor_type if isinstance(visitor_type, str) else None),
        company_name=company_for_pass(
            visitor_type if isinstance(visitor_type, str) else None,
            company_source if isinstance(company_source, str) else None,
        ),
        doctor_name=doctor_name,
        hospital_name=hospital_name,
        department=_department_label(db, visit),
        date_text=_date_and_time(visit)[0],
        time_text=_date_and_time(visit)[1],
        qr_png=check_in_qr_png(visit),
        photo_png=_visitor_photo_bytes(db, visit),
        logo_png=logo_png,
    )


def render_meeting_pass(content: MeetingPassContent) -> bytes:
    """Return a PNG of the blank pass with this visit drawn on it."""
    base = Image.open(BLANK_PASS_PATH).convert("RGBA")
    scale_x = base.width / _BASE_WIDTH
    scale_y = base.height / _BASE_HEIGHT
    if abs(scale_x - 1) > 0.01 or abs(scale_y - 1) > 0.01:
        base = base.resize((_BASE_WIDTH, _BASE_HEIGHT), Image.Resampling.LANCZOS)

    if content.photo_png:
        try:
            _paste_circle(base, content.photo_png, _PHOTO_CENTER, _PHOTO_RADIUS)
        except Exception:
            pass

    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(_IDENTITY_BOX, radius=18, fill=_CARD)

    _fit_text(draw, (268, 196), content.visitor_name, max_width=224, size=18, fill=_NAVY)
    _fit_text(draw, (268, 218), content.role_label, max_width=224, size=13, fill=_BLACK)
    next_y = 234
    if content.company_name:
        _fit_text(draw, (268, next_y), content.company_name, max_width=224, size=12, fill=_BLUE)
        next_y = 250
    _fit_text(draw, (268, next_y), "Professional Meeting", max_width=224, size=13, fill=_BLUE)

    left_x, left_width = _LEFT_VALUE
    right_x, right_width = _RIGHT_VALUE
    _fit_text(draw, (left_x, 396), content.doctor_name, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, 396), content.department, max_width=right_width, size=12, fill=_NAVY)
    _fit_text(draw, (left_x, 482), content.date_text, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, 482), content.time_text, max_width=right_width, size=12, fill=_NAVY)

    card_bottom = _CARD_TOP + _CARD_SIZE
    if content.qr_png:
        try:
            left_edge = 16
            right_edge = _DIVIDER_X - 6
            left = left_edge + (right_edge - left_edge - _CARD_SIZE) // 2
            paste_crisp_qr(base, content.qr_png, left, _CARD_TOP, _CARD_SIZE)
        except Exception:
            pass
    if content.logo_png:
        try:
            _paste_logo(
                base,
                content.logo_png,
                (_DIVIDER_X + 8, _CARD_TOP, 512, card_bottom),
                plate=False,
            )
        except Exception:
            pass

    flat = base.convert("RGB")
    buffer = io.BytesIO()
    flat.save(buffer, format="PNG")
    return buffer.getvalue()



