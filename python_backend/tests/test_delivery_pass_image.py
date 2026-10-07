import io
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from PIL import Image

from app.services.delivery_pass_image import (
    DeliveryPassContent,
    assemble_delivery_pass,
    driver_photo_bytes,
    item_line,
    render_delivery_pass,
)
from app.services.meeting_pass_image import _qr_png


def test_driver_photo_uses_saved_image() -> None:
    import base64

    raw = base64.b64encode(b"driver-photo").decode()
    agent = SimpleNamespace(photoStorageKey=f"data:image/jpeg;base64,{raw}", phone="8625877312")
    photo = driver_photo_bytes(None, agent)
    assert photo == b"driver-photo"


def _delivery() -> SimpleNamespace:
    return SimpleNamespace(
        id="del-1",
        poNumber="123456",
        goodsType="Carton",
        totalBoxes=12,
        expectedArrivalTime=datetime(2026, 10, 3, 10, 30),
        expectedDeliveryDate=None,
        unloadMinutes=15,
        slot=None,
        items=[
            SimpleNamespace(itemName="SMALL", quantityOrdered=4),
            SimpleNamespace(itemName="MEDIUM", quantityOrdered=4),
            SimpleNamespace(itemName="LARGE", quantityOrdered=4),
        ],
        agent=SimpleNamespace(name="Sushobhit"),
        vendor=SimpleNamespace(vendorName="Sunrise Pharma"),
        vehicle=SimpleNamespace(registrationNumber="KA 01 AB 1234", vehicleType="Bike"),
        branch=SimpleNamespace(
            name="Central Store",
            hospitalChainId="chain-1",
            hospitalChain=SimpleNamespace(name="Kauvery"),
        ),
        qrCode=SimpleNamespace(qrPayload="payload-1", signature="sig-1"),
    )


def test_assemble_maps_driver_delivery_fields() -> None:
    content = assemble_delivery_pass(None, _delivery())

    assert content.driver_name == "Sushobhit"
    assert content.company_name == "Sunrise Pharma"
    assert content.deliver_to == "Central Store"
    assert content.po_number == "123456"
    assert content.item_text == "12 Carton (4S, 4M, 4L)"
    assert content.vehicle_text == "KA 01 AB 1234- Bike"
    assert content.date_text == "03 Oct 2026"
    assert content.time_text == "10:30 AM – 10:45 AM"
    assert content.hospital_name == "Kauvery"
    assert content.qr_png


def test_item_line_falls_back_to_box_count() -> None:
    delivery = SimpleNamespace(totalBoxes=3, goodsType="Medicines")
    assert item_line(delivery, []) == "3 Medicines"


def test_long_values_stay_inside_the_printed_boxes() -> None:
    blank = Image.open(
        Path(__file__).resolve().parents[1] / "app" / "assets" / "delivery_pass_blank.png"
    ).convert("RGB")
    png = render_delivery_pass(
        DeliveryPassContent(
            driver_name="Sushobhit " * 8,
            company_name="Sunrise Pharma International Distributors",
            deliver_to="Central Store and Pharmacy Receiving Bay",
            po_number="PO-1234567890-EXTRA",
            item_text="12 Carton (4S, 4M, 4L, 2XL, 2Custom) plus cold chain",
            vehicle_text="KA 01 AB 1234- Heavy Commercial Vehicle",
            date_text="03 Oct 2026",
            time_text="10:30 AM – 10:45 AM",
            hospital_name="Kauvery",
            qr_png=_qr_png('{"qrPayload":"abc","signature":"def"}', 160),
        )
    )
    rendered = Image.open(io.BytesIO(png)).convert("RGB")
    assert rendered.size == blank.size

    allowed = [
        (260, 268, 508, 352),
        (88, 362, 250, 420),
        (340, 362, 508, 420),
        (94, 474, 250, 500),
        (346, 474, 508, 500),
        (94, 554, 250, 582),
        (346, 554, 508, 582),
        (46, 572, 182, 708),
        (274, 572, 506, 708),
    ]
    blank_px = blank.load()
    rendered_px = rendered.load()
    outside = None
    for y in range(blank.height):
        for x in range(blank.width):
            if blank_px[x, y] == rendered_px[x, y]:
                continue
            if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in allowed):
                continue
            outside = (x, y)
            break
        if outside:
            break
    assert outside is None, outside


def test_pass_qr_stays_readable_after_jpeg_compression() -> None:
    import cv2
    import numpy as np

    from app.services.delivery_pass_image import delivery_scan_text

    qr_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01"
    text = delivery_scan_text(qr_id)
    png = render_delivery_pass(
        DeliveryPassContent(
            driver_name="Test Driver",
            company_name="Sunrise Pharma",
            deliver_to="Central Store",
            po_number="PO-1",
            item_text="1 Carton",
            vehicle_text="KA86TS7312- Bike",
            date_text="07 Oct 2026",
            time_text="10:00 AM – 10:10 AM",
            hospital_name="Connitor",
            qr_png=_qr_png(text, 45),
        ),
        scale=2,
    )
    image = Image.open(io.BytesIO(png)).convert("RGB")
    long_side = 1600
    ratio = long_side / max(image.size)
    compressed = image.resize(
        (int(image.width * ratio), int(image.height * ratio)),
        Image.Resampling.BILINEAR,
    )
    jpeg = io.BytesIO()
    compressed.save(jpeg, format="JPEG", quality=55)
    decoded = cv2.QRCodeDetector().detectAndDecode(np.array(Image.open(jpeg).convert("RGB")))[0]
    assert decoded == text
