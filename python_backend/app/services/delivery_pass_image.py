"""Compose the driver delivery pass on the glassy Conninter artwork.

Values are drawn inside the printed cards. Long text shrinks, then ellipsizes,
so it stays inside each box.
"""

from __future__ import annotations

import io
import json
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from PIL import Image, ImageDraw

from app.services.meeting_pass_image import (
    _BASE_HEIGHT,
    _BASE_WIDTH,
    _BLUE,
    _NAVY,
    _BLACK,
    _center_text,
    _fit_text,
    _paste_circle,
    _paste_logo,
    _qr_module_image,
    hospital_logo_bytes,
    paste_crisp_qr,
)

BLANK_PASS_PATH = Path(__file__).resolve().parents[1] / "assets" / "delivery_pass_blank.png"

# Coordinates match delivery_pass_blank.png at 525x1024 (flat centred design).
_PHOTO_CENTER = (263, 152)
_PHOTO_RADIUS = 56
# Centred identity lines under the photo ring.
_NAME_Y = 222
_ROLE_Y = 254
_COMPANY_Y = 276
_PASS_Y = 296
# Values sit above the printed underlines inside each box (lines at y=371/426/486).
_LEFT_VALUE = (104, 142)
_RIGHT_VALUE = (344, 142)
_VALUE_ROWS = (350, 405, 465)
# Open white band (~y506-783) above "Valid for today only".
# Big QR centred first; the hospital logo sits below it.
_QR_TOP = 512
_QR_SIZE = 230
_LOGO_BOX = (130, 747, 395, 782)
_SIZE_ABBREV = {
    "SMALL": "S",
    "MEDIUM": "M",
    "LARGE": "L",
    "S": "S",
    "M": "M",
    "L": "L",
}


@dataclass
class DeliveryPassContent:
    driver_name: str
    company_name: str
    deliver_to: str
    po_number: str
    item_text: str
    vehicle_text: str
    date_text: str
    time_text: str
    hospital_name: str
    qr_png: bytes | None = None
    photo_png: bytes | None = None
    logo_png: bytes | None = None


def item_line(delivery, items: list) -> str:
    rows = [row for row in items if getattr(row, "itemName", None)]
    if rows:
        total = sum(int(getattr(row, "quantityOrdered", 0) or 0) for row in rows)
        parts: list[str] = []
        for row in rows:
            qty = int(getattr(row, "quantityOrdered", 0) or 0)
            name = str(row.itemName).strip()
            short = _SIZE_ABBREV.get(name.upper(), name[:1].upper() if name else "")
            if qty and short:
                parts.append(f"{qty}{short}")
        if total and parts:
            return f"{total} Carton ({', '.join(parts)})"
        if total:
            return f"{total} Carton"
    boxes = int(getattr(delivery, "totalBoxes", 0) or 0)
    goods = (getattr(delivery, "goodsType", None) or "Goods").strip() or "Goods"
    if boxes:
        return f"{boxes} {goods}"
    return goods


def vehicle_line(registration: str | None, vehicle_type: str | None) -> str:
    plate = (registration or "").strip()
    kind = (vehicle_type or "").strip()
    if plate and kind:
        return f"{plate}- {kind}"
    return plate or kind or "—"


def _date_and_time(delivery) -> tuple[str, str]:
    start = getattr(delivery, "expectedArrivalTime", None)
    if start is None:
        day = getattr(delivery, "expectedDeliveryDate", None)
        if day is not None and hasattr(day, "strftime"):
            return day.strftime("%d %b %Y"), "—"
        return "To be decided", "—"
    date_text = start.strftime("%d %b %Y")
    start_text = start.strftime("%I:%M %p").lstrip("0")
    end = None
    minutes = getattr(delivery, "unloadMinutes", None)
    if minutes:
        try:
            end = start + timedelta(minutes=float(minutes))
        except (TypeError, ValueError):
            end = None
    if end is None:
        slot = getattr(delivery, "slot", None)
        if slot is not None:
            end = getattr(slot, "slotEnd", None)
    if end is not None and hasattr(end, "strftime"):
        end_text = end.strftime("%I:%M %p").lstrip("0")
        if end_text != start_text:
            return date_text, f"{start_text} – {end_text}"
    return date_text, start_text


def delivery_scan_text(qr_id: str) -> str:
    """Short JSON the gate scanner reads. The signature is the first 16 hex chars of HMAC(qr id)."""
    import hashlib
    import hmac

    from app.config import get_settings

    digest = hmac.new(
        get_settings().jwt_secret.encode(),
        qr_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    return json.dumps(
        {"qrPayload": qr_id, "signature": digest[:16]},
        separators=(",", ":"),
    )


def delivery_qr_png(delivery, *, size: int = 136) -> bytes | None:
    """Module-sized PNG. The pass scales it by whole pixels so the scanner sees solid blocks."""
    del size
    qr = getattr(delivery, "qrCode", None)
    qr_id = getattr(qr, "id", None) if qr is not None else None
    payload = getattr(qr, "qrPayload", None) if qr is not None else None
    signature = getattr(qr, "signature", None) if qr is not None else None
    if qr_id:
        encoded = delivery_scan_text(str(qr_id))
    elif payload and signature:
        encoded = json.dumps({"qrPayload": payload, "signature": signature}, separators=(",", ":"))
    else:
        return None
    buffer = io.BytesIO()
    _qr_module_image(encoded).save(buffer, format="PNG")
    return buffer.getvalue()


def driver_photo_bytes(db, agent) -> bytes | None:
    """Photo the distributor saved for this driver, otherwise a visitor photo with the same phone."""
    from app.services.meeting_pass_image import decode_image_source

    if agent is None:
        return None
    stored = decode_image_source(getattr(agent, "photoStorageKey", None))
    if stored:
        return stored
    if db is None:
        return None
    digits = "".join(ch for ch in str(getattr(agent, "phone", "") or "") if ch.isdigit())
    tail = digits[-10:]
    if len(tail) < 10:
        return None
    from app.models import Visitor
    from app.models.visitor_account_entities import VisitorAccount

    visitor = (
        db.query(Visitor)
        .filter(Visitor.phone.contains(tail), Visitor.photo.isnot(None))
        .first()
    )
    if visitor is not None:
        photo = decode_image_source(visitor.photo)
        if photo:
            return photo
    account = db.query(VisitorAccount).filter(VisitorAccount.phone.contains(tail)).first()
    if account is None:
        return None
    return decode_image_source(getattr(account, "photoStorageKey", None))


def _lookup(db, current, model, ident: str | None):
    if current is not None:
        return current
    if db is None or not ident:
        return None
    return db.get(model, ident)


def assemble_delivery_pass(db, delivery) -> DeliveryPassContent:
    """Collect the live delivery fields drawn on the pass."""
    from app.models import Branch
    from app.models.delivery_entities import DeliveryAgent, DeliveryVehicle, Distributor, InboundDeliveryItem

    agent = _lookup(db, getattr(delivery, "agent", None), DeliveryAgent, getattr(delivery, "agentId", None))
    vehicle = _lookup(
        db, getattr(delivery, "vehicle", None), DeliveryVehicle, getattr(delivery, "vehicleId", None)
    )
    vendor = _lookup(db, getattr(delivery, "vendor", None), Distributor, getattr(delivery, "vendorId", None))
    branch = _lookup(db, getattr(delivery, "branch", None), Branch, getattr(delivery, "branchId", None))

    items = list(getattr(delivery, "items", None) or [])
    if not items and db is not None and getattr(delivery, "id", None):
        items = (
            db.query(InboundDeliveryItem)
            .filter(InboundDeliveryItem.deliveryId == delivery.id)
            .all()
        )

    chain = getattr(branch, "hospitalChain", None) if branch is not None else None
    chain_id = getattr(branch, "hospitalChainId", None) if branch is not None else None
    if chain is None and db is not None and chain_id:
        from app.models import HospitalChain

        chain = db.get(HospitalChain, chain_id)
    hospital = "Hospital"
    chain_name = getattr(chain, "name", None) if chain is not None else None
    if isinstance(chain_name, str) and chain_name.strip():
        hospital = chain_name.strip()
    elif branch is not None and isinstance(getattr(branch, "name", None), str) and branch.name.strip():
        hospital = branch.name.strip()

    deliver_to = "Hospital"
    if branch is not None and isinstance(getattr(branch, "name", None), str) and branch.name.strip():
        deliver_to = branch.name.strip()

    date_text, time_text = _date_and_time(delivery)
    po = (getattr(delivery, "poNumber", None) or "").strip() or "—"
    return DeliveryPassContent(
        driver_name=(getattr(agent, "name", None) or "Driver").strip() or "Driver",
        company_name=(getattr(vendor, "vendorName", None) or "Distributor").strip() or "Distributor",
        deliver_to=deliver_to,
        po_number=po,
        item_text=item_line(delivery, items),
        vehicle_text=vehicle_line(
            getattr(vehicle, "registrationNumber", None) if vehicle is not None else None,
            getattr(vehicle, "vehicleType", None) if vehicle is not None else None,
        ),
        date_text=date_text,
        time_text=time_text,
        hospital_name=hospital,
        qr_png=delivery_qr_png(delivery),
        photo_png=driver_photo_bytes(db, agent),
        logo_png=hospital_logo_bytes(chain_id if isinstance(chain_id, str) else None),
    )


def render_delivery_pass(content: DeliveryPassContent, *, scale: int = 1) -> bytes:
    """Return a PNG of the glassy pass with this delivery drawn inside the boxes.

    scale=2 is the image sent on WhatsApp. The QR is painted again after the
    artwork is enlarged so each module stays a solid square.
    """
    base = Image.open(BLANK_PASS_PATH).convert("RGBA")
    if base.width != _BASE_WIDTH or base.height != _BASE_HEIGHT:
        base = base.resize((_BASE_WIDTH, _BASE_HEIGHT), Image.Resampling.LANCZOS)

    if content.photo_png:
        try:
            _paste_circle(base, content.photo_png, _PHOTO_CENTER, _PHOTO_RADIUS)
        except Exception:
            pass

    draw = ImageDraw.Draw(base)

    _center_text(draw, _NAME_Y, content.driver_name, size=26, fill=_NAVY)
    _center_text(draw, _ROLE_Y, "Delivery Partner", size=16, fill=_NAVY)
    _center_text(draw, _COMPANY_Y, content.company_name, size=13, fill=_BLACK, bold=False)
    _center_text(draw, _PASS_Y, "Delivery Pass", size=13, fill=_BLUE, bold=False)

    left_x, left_width = _LEFT_VALUE
    right_x, right_width = _RIGHT_VALUE
    row_partner, row_item, row_date = _VALUE_ROWS
    _fit_text(draw, (left_x, row_partner), content.driver_name, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, row_partner), content.po_number, max_width=right_width, size=12, fill=_NAVY)
    _fit_text(draw, (left_x, row_item), content.item_text, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, row_item), content.vehicle_text, max_width=right_width, size=12, fill=_NAVY)
    _fit_text(draw, (left_x, row_date), content.date_text, max_width=left_width, size=12, fill=_NAVY)
    _fit_text(draw, (right_x, row_date), content.time_text, max_width=right_width, size=12, fill=_NAVY)

    if content.logo_png or content.qr_png:
        try:
            if content.qr_png:
                qr_left = (_BASE_WIDTH - _QR_SIZE) // 2
                paste_crisp_qr(base, content.qr_png, qr_left, _QR_TOP, _QR_SIZE)
            if content.logo_png:
                _paste_logo(base, content.logo_png, _LOGO_BOX, plate=True, pad=2)
        except Exception:
            pass
    elif content.hospital_name:
        _center_text(draw, _LOGO_BOX[1] + 6, content.hospital_name, size=13, fill=_NAVY)

    output_scale = scale if scale > 1 else 1
    if output_scale > 1:
        base = base.resize(
            (base.width * output_scale, base.height * output_scale),
            Image.Resampling.LANCZOS,
        )
        # Re-paint QR + logo after enlarge so modules stay sharp and stay aligned.
        if content.logo_png or content.qr_png:
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
                        pad=2 * output_scale,
                    )
            except Exception:
                pass

    flat = base.convert("RGB")
    buffer = io.BytesIO()
    flat.save(buffer, format="PNG")
    return buffer.getvalue()
