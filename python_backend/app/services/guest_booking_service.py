"""Doctor-visit booking without a visitor account: WhatsApp code, photo + government ID, online payment."""

import re
import uuid
from datetime import timedelta

from fastapi import HTTPException, UploadFile
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings, is_test_mode_enabled
from app.models import Branch, Visitor
from app.services.gcp_storage_service import GcpStorageService
from app.services.messaging_service import SmsService
from app.services.phone_verification_service import PhoneVerificationService
from app.services.razorpay_service import RazorpayService
from app.services.visitor_wallet_service import VisitorWalletService
from app.utils.test_mode import generate_otp
from app.utils.timezone import now_ist

GUEST_TOKEN_ROLE = "GUEST_BOOKING"
GUEST_TOKEN_TTL_MINUTES = 30
CODE_TTL_MINUTES = 5
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_IMAGE_TYPES = re.compile(r"^image/(jpeg|jpg|png|webp)$", re.I)
_DOCUMENT_TYPES = re.compile(r"^(image/(jpeg|jpg|png|webp)|application/pdf)$", re.I)


def _digits(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")[-10:]


class GuestBookingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _visitor(self, phone: str, branch_id: str) -> Visitor | None:
        return self.db.query(Visitor).filter(Visitor.phone == phone, Visitor.branchId == branch_id).first()

    def send_code(self, phone: str, branch_id: str) -> dict:
        phone = _digits(phone)
        if len(phone) != 10:
            raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number.")
        if not self.db.get(Branch, branch_id):
            raise HTTPException(status_code=404, detail="Hospital not found.")

        visitor = self._visitor(phone, branch_id)
        if not visitor:
            visitor = Visitor(phone=phone, branchId=branch_id, firstName="Guest", lastName="Visitor")
            self.db.add(visitor)
            self.db.flush()

        now = now_ist()
        if (
            visitor.phoneVerificationAttempts >= 3
            and visitor.phoneVerificationExpiry
            and visitor.phoneVerificationExpiry > now
        ):
            raise HTTPException(status_code=429, detail="Too many wrong codes. Try again in a few minutes.")

        otp = generate_otp(6)
        visitor.phoneVerificationOtp = otp
        visitor.phoneVerificationExpiry = now + timedelta(minutes=CODE_TTL_MINUTES)
        visitor.phoneVerificationAttempts = 0
        self.db.commit()

        settings = get_settings()
        response: dict = {"message": "A 6-digit code has been sent to your WhatsApp."}
        if is_test_mode_enabled(settings):
            response["testOtp"] = otp
            return response
        try:
            SmsService().send_profile_phone_otp(phone, otp, valid_minutes=CODE_TTL_MINUTES)
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Could not send the code. Please try again.") from exc
        return response

    def verify_code(self, phone: str, branch_id: str, otp: str) -> dict:
        phone = _digits(phone)
        messages = {
            "OTP_LOCKED": (429, "Too many wrong codes. Try again in a few minutes."),
            "OTP_EXPIRED": (400, "The code has expired. Request a new one."),
            "INVALID_OTP": (400, "Incorrect code."),
            "VISITOR_NOT_FOUND": (400, "Request a code first."),
        }
        try:
            result = PhoneVerificationService(self.db).verify_otp(phone, branch_id, otp)
        except HTTPException as exc:
            status, message = messages.get(str(exc.detail), (exc.status_code, str(exc.detail)))
            raise HTTPException(status_code=status, detail=message) from exc

        visitor = self.db.get(Visitor, result["visitorId"])
        return {
            "guestToken": self._issue_token(visitor),
            "expiresInMinutes": GUEST_TOKEN_TTL_MINUTES,
            "hasPhoto": bool(visitor.photo),
            "hasGovernmentId": bool(visitor.governmentIdDocument),
        }

    def _issue_token(self, visitor: Visitor) -> str:
        expires = now_ist() + timedelta(minutes=GUEST_TOKEN_TTL_MINUTES)
        claims = {
            "sub": visitor.id,
            "role": GUEST_TOKEN_ROLE,
            "phone": visitor.phone,
            "branchId": visitor.branchId,
            "exp": int(expires.timestamp()),
        }
        return jwt.encode(claims, get_settings().jwt_secret, algorithm="HS256")

    @staticmethod
    def decode_token(token: str | None) -> dict:
        if not token:
            raise HTTPException(status_code=401, detail="Verify your mobile number to book without a profile.")
        try:
            claims = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        except JWTError as exc:
            raise HTTPException(
                status_code=401, detail="Your mobile verification has expired. Verify your number again."
            ) from exc
        if claims.get("role") != GUEST_TOKEN_ROLE or not claims.get("sub"):
            raise HTTPException(status_code=401, detail="Verify your mobile number to book without a profile.")
        return claims

    def visitor_for_token(self, claims: dict) -> Visitor:
        visitor = self.db.get(Visitor, claims["sub"])
        if not visitor or visitor.phone != claims.get("phone") or visitor.branchId != claims.get("branchId"):
            raise HTTPException(status_code=401, detail="Verify your mobile number again.")
        return visitor

    @staticmethod
    def _check_upload(file: UploadFile | None, pattern: re.Pattern, label: str) -> UploadFile:
        if file is None or not file.filename:
            raise HTTPException(status_code=400, detail=f"{label} is required.")
        if not file.content_type or not pattern.match(file.content_type):
            raise HTTPException(status_code=400, detail=f"{label} must be a JPG, PNG or WebP image" + (
                " or a PDF." if pattern is _DOCUMENT_TYPES else "."
            ))
        size = getattr(file, "size", None)
        if size is not None and size > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"{label} must be 5 MB or smaller.")
        return file

    async def save_documents(self, claims: dict, photo: UploadFile | None, government_id: UploadFile | None) -> dict:
        """Store the guest's photo and ID; a file already on record may be omitted."""
        visitor = self.visitor_for_token(claims)
        has_photo = bool(photo and photo.filename)
        has_id = bool(government_id and government_id.filename)
        if not has_photo and not visitor.photo:
            self._check_upload(photo, _IMAGE_TYPES, "Your photo")
        if not has_id and not visitor.governmentIdDocument:
            self._check_upload(government_id, _DOCUMENT_TYPES, "Government ID")

        storage = GcpStorageService()
        if has_photo:
            self._check_upload(photo, _IMAGE_TYPES, "Your photo")
            visitor.photo = await storage.upload_visitor_document(photo, visitor.id, "photo")
        if has_id:
            self._check_upload(government_id, _DOCUMENT_TYPES, "Government ID")
            visitor.governmentIdDocument = await storage.upload_visitor_document(
                government_id, visitor.id, "government-id"
            )
        self.db.commit()
        return {"message": "Photo and ID saved."}

    def create_payment_order(self, claims: dict) -> dict:
        visitor = self.visitor_for_token(claims)
        fee = VisitorWalletService(self.db).visit_fee()
        return RazorpayService().create_order(
            fee,
            receipt=f"gvf-{uuid.uuid4().hex[:12]}",
            notes={"purpose": "visit", "guestVisitorId": visitor.id},
        )

    def prepare_booking(self, claims: dict, payload: dict) -> dict:
        """Bind a booking payload to the verified guest; online payment and documents are mandatory."""
        visitor = self.visitor_for_token(claims)
        if payload.get("branchId") != visitor.branchId:
            raise HTTPException(status_code=400, detail="Your mobile number was verified for a different hospital.")
        if payload.get("paymentMethod") != "RAZORPAY":
            raise HTTPException(status_code=400, detail="Pay online to book without a profile.")
        if not visitor.photo or not visitor.governmentIdDocument:
            raise HTTPException(status_code=400, detail="Add your photo and government ID before booking.")
        payload["phone"] = visitor.phone
        return payload
