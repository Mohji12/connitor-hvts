import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.guest_booking_service import GuestBookingService
from app.services.visitor_wallet_service import VisitorWalletService


def _visitor(**overrides) -> SimpleNamespace:
    base = dict(
        id="v1",
        phone="9000000001",
        branchId="b1",
        photo=None,
        governmentIdDocument=None,
        phoneVerificationAttempts=0,
        phoneVerificationExpiry=None,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _service(visitor: SimpleNamespace) -> GuestBookingService:
    db = MagicMock()
    db.get.side_effect = lambda model, key: visitor if key == visitor.id else SimpleNamespace(id=key)
    db.query.return_value.filter.return_value.first.return_value = visitor
    return GuestBookingService(db)


def _upload(name: str, content_type: str) -> SimpleNamespace:
    return SimpleNamespace(filename=name, content_type=content_type, size=1024)


def _token_for(service: GuestBookingService, visitor: SimpleNamespace) -> dict:
    return service.decode_token(service._issue_token(visitor))


def test_send_code_uses_whatsapp_template() -> None:
    visitor = _visitor()
    service = _service(visitor)
    with patch("app.services.guest_booking_service.is_test_mode_enabled", return_value=False), patch(
        "app.services.guest_booking_service.SmsService"
    ) as sms:
        result = service.send_code("+91 90000 00001", "b1")
    sms.return_value.send_profile_phone_otp.assert_called_once()
    assert sms.return_value.send_profile_phone_otp.call_args.args[0] == "9000000001"
    assert visitor.phoneVerificationOtp
    assert "WhatsApp" in result["message"]


def test_verify_code_returns_guest_token_bound_to_visitor() -> None:
    visitor = _visitor()
    service = _service(visitor)
    with patch("app.services.guest_booking_service.PhoneVerificationService") as pvs:
        pvs.return_value.verify_otp.return_value = {"visitorId": "v1"}
        result = service.verify_code("9000000001", "b1", "123456")
    claims = service.decode_token(result["guestToken"])
    assert claims["sub"] == "v1"
    assert claims["phone"] == "9000000001"
    assert result["hasPhoto"] is False


def test_wrong_code_gets_a_readable_message() -> None:
    service = _service(_visitor())
    with patch("app.services.guest_booking_service.PhoneVerificationService") as pvs:
        pvs.return_value.verify_otp.side_effect = HTTPException(status_code=400, detail="INVALID_OTP")
        with pytest.raises(HTTPException) as ctx:
            service.verify_code("9000000001", "b1", "000000")
    assert ctx.value.detail == "Incorrect code."


def test_account_token_is_not_a_guest_token() -> None:
    service = _service(_visitor())
    with pytest.raises(HTTPException) as ctx:
        service.decode_token(None)
    assert ctx.value.status_code == 401


def test_documents_require_photo_and_id_then_store_both() -> None:
    visitor = _visitor()
    service = _service(visitor)
    claims = _token_for(service, visitor)

    with pytest.raises(HTTPException) as ctx:
        asyncio.run(service.save_documents(claims, _upload("me.jpg", "image/jpeg"), None))
    assert ctx.value.detail == "Government ID is required."

    with patch("app.services.guest_booking_service.GcpStorageService") as storage:
        storage.return_value.upload_visitor_document = AsyncMock(side_effect=lambda f, vid, kind: f"url/{kind}")
        asyncio.run(
            service.save_documents(
                claims, _upload("me.jpg", "image/jpeg"), _upload("id.pdf", "application/pdf")
            )
        )
    assert visitor.photo == "url/photo"
    assert visitor.governmentIdDocument == "url/government-id"


def test_documents_reject_pdf_as_photo() -> None:
    visitor = _visitor()
    service = _service(visitor)
    with pytest.raises(HTTPException) as ctx:
        asyncio.run(
            service.save_documents(
                _token_for(service, visitor), _upload("me.pdf", "application/pdf"), _upload("id.jpg", "image/jpeg")
            )
        )
    assert "photo" in ctx.value.detail.lower()


def test_prepare_booking_requires_online_payment_and_documents() -> None:
    visitor = _visitor()
    service = _service(visitor)
    claims = _token_for(service, visitor)

    with pytest.raises(HTTPException, match="Pay online"):
        service.prepare_booking(claims, {"branchId": "b1", "paymentMethod": "WALLET"})
    with pytest.raises(HTTPException, match="photo and government ID"):
        service.prepare_booking(claims, {"branchId": "b1", "paymentMethod": "RAZORPAY"})

    visitor.photo = "p"
    visitor.governmentIdDocument = "g"
    with pytest.raises(HTTPException, match="different hospital"):
        service.prepare_booking(claims, {"branchId": "other", "paymentMethod": "RAZORPAY"})

    payload = service.prepare_booking(
        claims, {"branchId": "b1", "paymentMethod": "RAZORPAY", "phone": "1111111111"}
    )
    assert payload["phone"] == "9000000001"


def test_guest_online_payment_is_accepted_without_account() -> None:
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    wallet = VisitorWalletService(db)
    visit = SimpleNamespace(id="visit-1")
    with patch.object(VisitorWalletService, "visit_fee", return_value=200), patch(
        "app.services.visitor_wallet_service.RazorpayService"
    ) as razorpay:
        wallet.apply_booking_payment(
            account_id="",
            visit=visit,
            payment_method="RAZORPAY",
            razorpay_order_id="o",
            razorpay_payment_id="p",
            razorpay_signature="s",
        )
    razorpay.return_value.verify_checkout.assert_called_once_with("o", "p", "s")
    assert visit.paymentStatus == "CAPTURED"

    with pytest.raises(HTTPException) as ctx:
        wallet.apply_booking_payment(account_id="", visit=visit, payment_method="WALLET")
    assert ctx.value.status_code == 401
