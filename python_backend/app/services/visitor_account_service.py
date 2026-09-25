"""Visitor pre-registration account lifecycle."""

from __future__ import annotations

import logging
import random
from datetime import timedelta
from typing import Any

import bcrypt
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings, is_test_mode_enabled
from app.models import VisitorAccount, VisitorAccountAuth, VisitorAccountAuditLog, VisitorAccountDocument
from app.models.enums import ProfileStatus, VisitorAuthProvider, VisitorDocumentType
from app.models.visitor_account_entities import EmailVerificationToken
from app.schemas.visitor_account import (
    CreateVisitorAccountBody,
    GovernmentIdBody,
    SetPasswordBody,
    UpdateProfessionalBody,
    UpdateProfileBody,
    hash_token,
)
from app.services.messaging_service import EmailService, SmsService
from app.services.s3_storage_service import S3StorageService
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

PRIVACY_VERSION = "2026-06-01"


class VisitorAccountService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.s3 = S3StorageService()
        self.sms = SmsService()
        self.email = EmailService()

    def _audit(self, account_id: str, action: str, *, actor_type: str = "SYSTEM", actor_id: str | None = None) -> None:
        self.db.add(
            VisitorAccountAuditLog(
                visitorAccountId=account_id,
                action=action,
                actorType=actor_type,
                actorId=actor_id,
            )
        )

    def _get_account(self, account_id: str) -> VisitorAccount:
        account = self.db.get(VisitorAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Visitor account not found")
        return account

    def _get_activation_blockers(self, account: VisitorAccount) -> list[str]:
        """Account activates once email is verified (other profile steps can continue later)."""
        blockers: list[str] = []
        if not account.emailVerified:
            blockers.append("Email must be verified")
        return blockers

    def _activate_on_email_verified(self, account: VisitorAccount) -> dict[str, Any]:
        """Mark account active as soon as email is verified."""
        account.emailVerified = True
        activated = account.profileStatus != ProfileStatus.ACTIVE.value
        if activated:
            account.profileStatus = ProfileStatus.ACTIVE.value
            self._audit(account.id, "ACCOUNT_ACTIVATED")
        return {
            "accountId": account.id,
            "profileStatus": account.profileStatus,
            "emailVerified": True,
            "activated": True,
            "message": "Account activated" if activated else "Account already active",
        }

    def _activate_if_ready(self, account_id: str) -> dict[str, Any] | None:
        account = self._get_account(account_id)
        if account.profileStatus == ProfileStatus.ACTIVE.value:
            return {
                "accountId": account.id,
                "profileStatus": account.profileStatus,
                "activated": True,
                "message": "Account already active",
            }
        if self._get_activation_blockers(account):
            return None

        account.profileStatus = ProfileStatus.ACTIVE.value
        self._audit(account_id, "ACCOUNT_ACTIVATED")
        self.db.commit()
        return {
            "accountId": account.id,
            "profileStatus": account.profileStatus,
            "activated": True,
            "message": "Account activated",
        }

    def _resume_incomplete_account(
        self, account: VisitorAccount, data: CreateVisitorAccountBody
    ) -> dict[str, Any]:
        account.firstName = data.firstName.strip()
        account.lastName = data.lastName.strip()
        account.phone = data.phone
        account.email = str(data.email).lower()
        account.emailType = data.emailType.value
        self._audit(account.id, "REGISTRATION_RESUMED")
        self.db.commit()
        self.db.refresh(account)
        return {
            "accountId": account.id,
            "profileStatus": account.profileStatus,
            "resumed": True,
        }

    def create_draft(self, data: CreateVisitorAccountBody) -> dict[str, Any]:
        email = str(data.email).lower()
        existing_phone = self.db.query(VisitorAccount).filter(VisitorAccount.phone == data.phone).first()
        existing_email = self.db.query(VisitorAccount).filter(VisitorAccount.email == email).first()

        if existing_phone and existing_email and existing_phone.id != existing_email.id:
            raise HTTPException(
                status_code=409,
                detail="Phone and email are registered to different accounts",
            )

        existing = existing_phone or existing_email
        if existing:
            if existing.profileStatus in (ProfileStatus.ACTIVE.value, ProfileStatus.SUSPENDED.value):
                if existing.profileStatus == ProfileStatus.SUSPENDED.value:
                    raise HTTPException(status_code=409, detail="Account suspended. Contact support.")
                raise HTTPException(
                    status_code=409,
                    detail="Account already registered. Please log in.",
                )
            return self._resume_incomplete_account(existing, data)

        account = VisitorAccount(
            firstName=data.firstName.strip(),
            lastName=data.lastName.strip(),
            phone=data.phone,
            email=str(data.email).lower(),
            emailType=data.emailType.value,
            profileStatus=ProfileStatus.DRAFT.value,
        )
        self.db.add(account)
        self.db.flush()
        self._audit(account.id, "ACCOUNT_CREATED")
        self.db.commit()
        self.db.refresh(account)
        return {"accountId": account.id, "profileStatus": account.profileStatus}

    def update_professional(self, account_id: str, data: UpdateProfessionalBody) -> dict[str, Any]:
        account = self._get_account(account_id)
        account.companyName = data.companyName.strip()
        account.jobTitle = data.jobTitle.strip()
        account.linkedinUrl = data.linkedinUrl.strip() if data.linkedinUrl else None
        if account.profileStatus == ProfileStatus.DRAFT.value:
            account.profileStatus = ProfileStatus.PENDING_VERIFICATION.value
        self._audit(account_id, "PROFESSIONAL_UPDATED")
        self.db.commit()
        return {"accountId": account.id, "profileStatus": account.profileStatus}

    def set_password(self, account_id: str, data: SetPasswordBody) -> dict[str, str]:
        if not data.acceptTerms:
            raise HTTPException(status_code=400, detail="You must accept the terms and privacy policy")
        account = self._get_account(account_id)
        password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
        auth = (
            self.db.query(VisitorAccountAuth)
            .filter(
                VisitorAccountAuth.visitorAccountId == account_id,
                VisitorAccountAuth.provider == VisitorAuthProvider.PASSWORD.value,
            )
            .first()
        )
        if auth:
            auth.passwordHash = password_hash
        else:
            self.db.add(
                VisitorAccountAuth(
                    visitorAccountId=account_id,
                    provider=VisitorAuthProvider.PASSWORD.value,
                    passwordHash=password_hash,
                )
            )
        account.termsAcceptedAt = now_ist()
        account.privacyPolicyVersion = data.privacyPolicyVersion
        if account.profileStatus == ProfileStatus.DRAFT.value:
            account.profileStatus = ProfileStatus.PENDING_VERIFICATION.value
        self._audit(account_id, "PASSWORD_SET")
        self.db.commit()
        return {"message": "Password saved"}

    async def upload_live_photo(self, account_id: str, file: UploadFile) -> dict[str, str]:
        account = self._get_account(account_id)
        key = await self.s3.upload_from_upload_file(account_id, "live-photo", file)
        account.photoStorageKey = key
        self.db.add(
            VisitorAccountDocument(
                visitorAccountId=account_id,
                docType=VisitorDocumentType.LIVE_PHOTO.value,
                storageKey=key,
                mimeType=file.content_type or "image/jpeg",
            )
        )
        self._audit(account_id, "LIVE_PHOTO_UPLOADED")
        self.db.commit()
        return {"photoStorageKey": key, "message": "Live photo saved"}

    async def upload_government_id(
        self, account_id: str, file: UploadFile, meta: GovernmentIdBody
    ) -> dict[str, str]:
        account = self._get_account(account_id)
        govt_type = meta.govtIdType.value
        if meta.govtIdType.value == "OTHER" and meta.govtIdTypeOther:
            govt_type = meta.govtIdTypeOther.strip()[:100]
        suffix = f"-{govt_type.lower().replace(' ', '_')}"
        key = await self.s3.upload_from_upload_file(account_id, "govt-id", file, suffix=suffix)
        self.db.add(
            VisitorAccountDocument(
                visitorAccountId=account_id,
                docType=VisitorDocumentType.GOVT_ID.value,
                govtIdType=govt_type,
                storageKey=key,
                mimeType=file.content_type or "image/jpeg",
            )
        )
        self._audit(account_id, "GOVT_ID_UPLOADED")
        self.db.commit()
        return {"storageKey": key, "govtIdType": govt_type, "message": "Government ID saved"}

    def send_phone_otp(self, account_id: str) -> dict[str, Any]:
        account = self._get_account(account_id)
        settings = get_settings()
        now = now_ist()
        if (
            account.phoneVerificationAttempts >= 3
            and account.phoneVerificationExpiry
            and account.phoneVerificationExpiry > now
        ):
            raise HTTPException(status_code=400, detail="OTP_LOCKED")

        otp = f"{random.randint(100000, 999999)}"
        if is_test_mode_enabled(settings):
            otp = settings.e2e_fixed_otp if len(settings.e2e_fixed_otp) == 6 else "123456"

        account.phoneVerificationOtpHash = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = now + timedelta(minutes=5)
        account.phoneVerificationAttempts = 0
        self.db.commit()

        if not is_test_mode_enabled(settings):
            try:
                self.sms.send_message(
                    account.phone,
                    f"Connitor: Your verification code is {otp}. Valid for 5 minutes.",
                )
            except Exception as exc:
                logger.error("SMS OTP failed: %s", exc)
                raise HTTPException(status_code=503, detail="Failed to send SMS OTP") from exc

        result: dict[str, Any] = {"message": "OTP sent to your mobile"}
        if is_test_mode_enabled(settings):
            result["testOtp"] = otp
        return result

    def verify_phone_otp(self, account_id: str, otp: str) -> dict[str, str]:
        account = self._get_account(account_id)
        now = now_ist()
        if not account.phoneVerificationOtpHash or not account.phoneVerificationExpiry:
            raise HTTPException(status_code=400, detail="OTP_NOT_SENT")
        if account.phoneVerificationExpiry < now:
            raise HTTPException(status_code=400, detail="OTP_EXPIRED")
        if account.phoneVerificationAttempts >= 3:
            raise HTTPException(status_code=400, detail="OTP_LOCKED")

        if not bcrypt.checkpw(otp.encode(), account.phoneVerificationOtpHash.encode()):
            account.phoneVerificationAttempts += 1
            self.db.commit()
            raise HTTPException(status_code=400, detail="INVALID_OTP")

        account.phoneVerified = True
        account.phoneVerificationOtpHash = None
        account.phoneVerificationExpiry = None
        account.phoneVerificationAttempts = 0
        self._audit(account_id, "PHONE_VERIFIED")
        self.db.commit()

        result: dict[str, Any] = {"message": "Phone verified", "phoneVerified": True}
        activation = self._activate_if_ready(account_id)
        if activation:
            result.update(activation)
        return result

    def send_email_verification(self, account_id: str) -> dict[str, Any]:
        account = self._get_account(account_id)
        settings = get_settings()
        now = now_ist()
        if (
            account.emailVerificationAttempts >= 3
            and account.emailVerificationExpiry
            and account.emailVerificationExpiry > now
        ):
            raise HTTPException(status_code=400, detail="OTP_LOCKED")

        otp = f"{random.randint(100000, 999999)}"
        if is_test_mode_enabled(settings):
            otp = settings.e2e_fixed_otp if len(settings.e2e_fixed_otp) == 6 else "123456"

        account.emailVerificationOtpHash = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
        account.emailVerificationExpiry = now + timedelta(minutes=10)
        account.emailVerificationAttempts = 0
        self.db.commit()

        try:
            self.email.send_registration_otp(account.email, otp)
        except Exception as exc:
            logger.error("Email verification OTP failed: %s", exc)
            if not is_test_mode_enabled(settings):
                raise HTTPException(status_code=503, detail="Failed to send verification email") from exc

        result: dict[str, Any] = {"message": "Verification code sent to your email"}
        if is_test_mode_enabled(settings):
            result["testEmailOtp"] = otp
        return result

    def verify_email_otp(self, account_id: str, otp: str) -> dict[str, Any]:
        account = self._get_account(account_id)
        now = now_ist()
        if not account.emailVerificationOtpHash or not account.emailVerificationExpiry:
            raise HTTPException(status_code=400, detail="OTP_NOT_SENT")
        if account.emailVerificationExpiry < now:
            raise HTTPException(status_code=400, detail="OTP_EXPIRED")
        if account.emailVerificationAttempts >= 3:
            raise HTTPException(status_code=400, detail="OTP_LOCKED")

        if not bcrypt.checkpw(otp.encode(), account.emailVerificationOtpHash.encode()):
            account.emailVerificationAttempts += 1
            self.db.commit()
            raise HTTPException(status_code=400, detail="INVALID_OTP")

        account.emailVerificationOtpHash = None
        account.emailVerificationExpiry = None
        account.emailVerificationAttempts = 0
        self._audit(account_id, "EMAIL_VERIFIED")
        result = self._activate_on_email_verified(account)
        self.db.commit()
        result["message"] = "Email verified"
        return result

    def verify_email_token(self, token: str) -> dict[str, str]:
        token_hash = hash_token(token)
        row = (
            self.db.query(EmailVerificationToken)
            .filter(EmailVerificationToken.tokenHash == token_hash)
            .first()
        )
        if not row or row.usedAt:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")
        if row.expiresAt < now_ist():
            raise HTTPException(status_code=400, detail="Verification link expired")

        account = self._get_account(row.visitorAccountId)
        row.usedAt = now_ist()
        self._audit(account.id, "EMAIL_VERIFIED")
        result = self._activate_on_email_verified(account)
        self.db.commit()
        return result

    def activate(self, account_id: str) -> dict[str, Any]:
        account = self._get_account(account_id)
        blockers = self._get_activation_blockers(account)
        if blockers:
            raise HTTPException(status_code=400, detail=blockers[0])

        activated = self._activate_if_ready(account_id)
        if activated:
            return activated
        raise HTTPException(status_code=400, detail="Account could not be activated")

    def get_preview(self, account_id: str) -> dict[str, Any]:
        account = self._get_account(account_id)
        photo_url = None
        if account.photoStorageKey:
            photo_url = self.s3.get_presigned_url(account.photoStorageKey, ttl_seconds=900)
        return {
            "accountId": account.id,
            "firstName": account.firstName,
            "lastName": account.lastName,
            "fullName": f"{account.firstName} {account.lastName}".strip(),
            "phone": account.phone,
            "email": account.email,
            "emailType": account.emailType,
            "companyName": account.companyName,
            "jobTitle": account.jobTitle,
            "headline": (
                f"{account.jobTitle} at {account.companyName}"
                if account.jobTitle and account.companyName
                else None
            ),
            "linkedinUrl": account.linkedinUrl,
            "photoUrl": photo_url,
            "profileStatus": account.profileStatus,
            "emailVerified": account.emailVerified,
            "phoneVerified": account.phoneVerified,
        }

    def get_profile_for_account(self, account_id: str, *, include_govt_id: bool = False) -> dict[str, Any]:
        preview = self.get_preview(account_id)
        if include_govt_id:
            doc = (
                self.db.query(VisitorAccountDocument)
                .filter(
                    VisitorAccountDocument.visitorAccountId == account_id,
                    VisitorAccountDocument.docType == VisitorDocumentType.GOVT_ID.value,
                )
                .order_by(VisitorAccountDocument.capturedAt.desc())
                .first()
            )
            if doc:
                preview["govtIdType"] = doc.govtIdType
                preview["govtIdUrl"] = self.s3.get_presigned_url(doc.storageKey, ttl_seconds=900)
        return preview

    def update_profile(self, account_id: str, data: UpdateProfileBody) -> dict[str, Any]:
        account = self._get_account(account_id)
        if data.companyName is not None:
            account.companyName = data.companyName.strip()
        if data.jobTitle is not None:
            account.jobTitle = data.jobTitle.strip()
        if data.linkedinUrl is not None:
            account.linkedinUrl = data.linkedinUrl.strip() or None
        self._audit(account_id, "PROFILE_UPDATED", actor_type="VISITOR", actor_id=account_id)
        self.db.commit()
        return self.get_preview(account_id)
