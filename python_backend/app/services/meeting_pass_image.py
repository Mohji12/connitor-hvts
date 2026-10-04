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
_PHOTO_CENTER = (119, 209)
_PHOTO_RADIUS = 68
_IDENTITY_BOX = (246, 158, 518, 330)
_NAVY = (11, 31, 75)
_BLACK = (20, 24, 32)
_BLUE = (0, 102, 204)
_PAGE = (248, 248, 248)

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
    while size > 11:
        if draw.textlength(cleaned, font=font) <= max_width:
            break
        size -= 1
        font = _load_font(size, bold=bold)
    draw.text(origin, cleaned, font=font, fill=fill)


def _paste_circle(base: Image.Image, photo_png: bytes, center: tuple[int, int], radius: int) -> None:
    photo = Image.open(io.BytesIO(photo_png)).convert("RGBA")
    diameter = radius * 2
    photo = ImageOps.fit(photo, (diameter, diameter), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    photo.putalpha(mask)
    base.paste(photo, (center[0] - radius, center[1] - radius), photo)


def _paste_logo(base: Image.Image, logo_png: bytes, box: tuple[int, int, int, int]) -> None:
    logo = Image.open(io.BytesIO(logo_png)).convert("RGBA")
    left, top, right, bottom = box
    max_w = right - left
    max_h = bottom - top
    logo.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    x = left + (max_w - logo.width) // 2
    y = top + (max_h - logo.height) // 2
    base.paste(logo, (x, y), logo)


def _qr_png(payload: str, size: int) -> bytes:
    image = qrcode.make(payload)
    fitted = image.get_image().convert("RGB")
    fitted = fitted.resize((size, size), Image.Resampling.NEAREST)
    buffer = io.BytesIO()
    fitted.save(buffer, format="PNG")
    return buffer.getvalue()


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
            return date_text, f"{start_text} – {end_text}"
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
    draw.rectangle(_IDENTITY_BOX, fill=_PAGE)

    _fit_text(draw, (252, 168), content.visitor_name, max_width=250, size=26, fill=_NAVY)
    _fit_text(draw, (252, 202), content.role_label, max_width=250, size=16, fill=_BLACK)
    next_y = 228
    if content.company_name:
        _fit_text(draw, (252, next_y), content.company_name, max_width=250, size=16, fill=_BLUE)
        next_y = 254
    _fit_text(draw, (252, next_y), "Professional Meeting", max_width=250, size=16, fill=_BLUE)

    _fit_text(draw, (46, 392), content.doctor_name, max_width=210, size=15, fill=_NAVY)
    _fit_text(draw, (277, 392), content.department, max_width=220, size=15, fill=_NAVY)
    _fit_text(draw, (46, 468), content.date_text, max_width=210, size=15, fill=_NAVY)
    _fit_text(draw, (277, 468), content.time_text, max_width=220, size=15, fill=_NAVY)

    if content.qr_png:
        try:
            qr = Image.open(io.BytesIO(content.qr_png)).convert("RGBA")
            qr = qr.resize((190, 190), Image.Resampling.NEAREST)
            base.paste(qr, (28, 530), qr if qr.mode == "RGBA" else None)
        except Exception:
            pass

    if content.logo_png:
        try:
            _paste_logo(base, content.logo_png, (270, 555, 500, 720))
        except Exception:
            pass

    flat = base.convert("RGB")
    buffer = io.BytesIO()
    flat.save(buffer, format="PNG")
    return buffer.getvalue()
