"""Render aligned passes and optionally WhatsApp a sample to a phone."""

from __future__ import annotations

import argparse
import io
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PIL import Image  # noqa: E402

from app.constants.ovum_entities import OVUM_CHAIN_ID  # noqa: E402
from app.services.attendant_pass_image import AttendantPassContent, render_attendant_pass  # noqa: E402
from app.services.delivery_pass_image import DeliveryPassContent, render_delivery_pass  # noqa: E402
from app.services.meeting_pass_image import (  # noqa: E402
    MeetingPassContent,
    _qr_png,
    hospital_logo_bytes,
    render_meeting_pass,
)


def _plates_aligned(png: bytes, qr_top: int, qr_side: int) -> bool:
    """True when the centered QR plate sits above the centered logo plate."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    mid = im.width // 2

    def is_white(x: int, y: int) -> bool:
        r, g, b = im.getpixel((x, y))
        return r > 240 and g > 240 and b > 240

    qr_ok = is_white(mid, qr_top + 2) and is_white(mid, qr_top + qr_side - 3)
    logo_ok = is_white(mid, 760) and is_white(mid, 782)
    return qr_ok and logo_ok


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone", default="", help="WhatsApp number for sample meeting pass")
    parser.add_argument("--out", default=str(ROOT.parent / "frontend" / "var"))
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    logo = hospital_logo_bytes(OVUM_CHAIN_ID)
    qr = _qr_png('{"visitId":"sample","visitCode":"123456"}', 128)

    meeting = render_meeting_pass(
        MeetingPassContent(
            visitor_name="Sample Visitor",
            role_label="General",
            company_name=None,
            doctor_name="Dr. Sample",
            hospital_name="Ovum",
            department="OBG",
            date_text="08 Oct 2026",
            time_text="10:00 AM - 10:10 AM",
            visit_code="5678",
            qr_png=qr,
            logo_png=logo,
        )
    )
    delivery = render_delivery_pass(
        DeliveryPassContent(
            driver_name="Sample Driver",
            company_name="Sun Pharma",
            deliver_to="Kalyan Nagar",
            po_number="PID12345",
            item_text="Small x1",
            vehicle_text="Bike KA01",
            date_text="08 Oct 2026",
            time_text="10:00 AM",
            hospital_name="Ovum",
            qr_png=qr,
            logo_png=logo,
        ),
        scale=2,
    )
    attendant = render_attendant_pass(
        AttendantPassContent(
            attendant_name="Sample Attendant",
            attendant_phone="8625877312",
            pass_number="AP-SAMPLE",
            issued_on="08 Oct 2026",
            patient_name="Sample Patient",
            patient_id="P-100",
            relationship="Spouse",
            validity="Today",
            hospital_name="Ovum",
            ward_name="Ward A",
            qr_png=qr,
            logo_png=logo,
        )
    )

    (out_dir / "sample-meeting-pass.png").write_bytes(meeting)
    (out_dir / "sample-delivery-pass.png").write_bytes(delivery)
    (out_dir / "sample-attendant-pass.png").write_bytes(attendant)

    # Meeting pass: QR centred in the band, hospital logo centred below it.
    ok = _plates_aligned(meeting, 452, 300)
    print(f"meeting_plates_aligned={ok}")
    print(f"wrote {out_dir / 'sample-meeting-pass.png'}")
    print(f"wrote {out_dir / 'sample-delivery-pass.png'}")
    print(f"wrote {out_dir / 'sample-attendant-pass.png'}")

    phone = "".join(ch for ch in (args.phone or "") if ch.isdigit())
    if not phone:
        return 0

    from app.services.messaging_service import WhatsAppService
    from app.services.s3_storage_service import S3StorageService

    sample_id = f"sample-align-{uuid.uuid4().hex[:8]}"
    image_url = S3StorageService().publish_gate_pass_png(sample_id, meeting)
    if not image_url:
        print("ERROR: could not publish pass image URL")
        return 1
    print(f"image_url={image_url}")
    sent = WhatsAppService().send_meeting_pass(
        phone,
        visitor_name="Sample Visitor",
        doctor_name="Dr. Sample",
        hospital_name="Ovum Woman & Child Speciality Hospital",
        department="OBG",
        requested_date="08 Oct 2026",
        requested_time="10:00 AM - 10:10 AM",
        purpose="Alignment sample",
        items_carrying="—",
        image_url=image_url,
    )
    print(f"whatsapp_sent={sent} phone={phone}")
    return 0 if sent else 2


if __name__ == "__main__":
    raise SystemExit(main())
