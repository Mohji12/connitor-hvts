"""One-time ward approval links for attendant visit-pass requests (no login required)."""

from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.attendant.pass_service import AttendantPassService
from app.config import get_doctor_approval_link_url, get_settings, is_test_mode_enabled
from app.models import Branch, User
from app.models.attendant_entities import Admission, Attendant, Patient
from app.schemas.visitor_account import hash_token
from app.services.messaging_service import EmailService
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

TOKEN_TTL_HOURS = 24


class AttendantApprovalLinkService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()
        self.passes = AttendantPassService(db)

    def create_link(self, attendant: Attendant) -> tuple[str, str]:
        """Return (raw_token, full_url). Always issues a fresh token when (re)sending."""
        settings = get_settings()
        now = now_ist()
        token = secrets.token_urlsafe(32)
        attendant.approvalLinkTokenHash = hash_token(token)
        attendant.approvalLinkExpiresAt = now + timedelta(hours=TOKEN_TTL_HOURS)
        attendant.approvalLinkUsedAt = None
        self.db.commit()

        base = get_doctor_approval_link_url(settings)
        url = f"{base}/approve-attendant?token={token}"
        if is_test_mode_enabled(settings):
            logger.info("[HVTS_TEST_MODE] Ward approval link for attendant %s: %s", attendant.id, url)
        return token, url

    def notify_ward_admins(self, attendant: Attendant) -> dict[str, Any]:
        """Create approval link and email all ward admins for the attendant's branch."""
        _, url = self.create_link(attendant)
        recipients = self._ward_recipients(attendant.branchId)
        if not recipients:
            logger.warning(
                "No WARD_ADMIN email found for branch %s — attendant %s pending without email",
                attendant.branchId,
                attendant.id,
            )
            return {"approvalUrl": url, "emailsSent": 0, "recipients": []}

        admission = attendant.admission or self.db.get(Admission, attendant.admissionId)
        patient: Patient | None = None
        if admission:
            patient = admission.patient or self.db.get(Patient, admission.patientId)
        branch = self.db.get(Branch, attendant.branchId)

        patient_name = (
            f"{patient.firstName} {patient.lastName}".strip() if patient else "Patient"
        )
        patient_mrn = patient.mrn if patient else "—"
        sent: list[str] = []
        for ward in recipients:
            try:
                self.email.send_ward_attendant_approval_request_email(
                    ward.email,
                    ward_name=ward.name or "Ward Admin",
                    attendant_name=attendant.name,
                    attendant_phone=attendant.phone,
                    attendant_email=attendant.email,
                    relationship=attendant.relationship or "",
                    patient_name=patient_name,
                    patient_mrn=patient_mrn,
                    ward_name_label=admission.wardName if admission else "",
                    room_number=admission.roomNumber if admission else "",
                    hospital_name=branch.name if branch else "Hospital",
                    approval_url=url,
                )
                sent.append(ward.email)
            except Exception as exc:
                logger.error(
                    "Failed to send ward approval email to %s for attendant %s: %s",
                    ward.email,
                    attendant.id,
                    exc,
                )

        return {"approvalUrl": url, "emailsSent": len(sent), "recipients": sent}

    def get_preview(self, token: str) -> dict[str, Any]:
        attendant = self._get_attendant_for_token(token)
        admission = attendant.admission
        patient = admission.patient if admission else None
        branch = self.db.get(Branch, attendant.branchId)
        return {
            "attendantId": attendant.id,
            "status": attendant.status,
            "attendantName": attendant.name,
            "attendantPhone": attendant.phone,
            "attendantEmail": attendant.email,
            "relationship": attendant.relationship,
            "patientName": (
                f"{patient.firstName} {patient.lastName}".strip() if patient else "Patient"
            ),
            "patientMrn": patient.mrn if patient else None,
            "wardName": admission.wardName if admission else None,
            "roomNumber": admission.roomNumber if admission else None,
            "hospitalName": branch.name if branch else None,
            "canAct": attendant.status == "PENDING",
            "expired": self._is_expired(attendant),
            "used": attendant.approvalLinkUsedAt is not None,
        }

    def approve(self, token: str) -> dict[str, Any]:
        attendant = self._get_attendant_for_token(token, require_pending=True)
        ward_user = self._primary_ward_user(attendant.branchId)
        actor = {
            "id": ward_user.id if ward_user else "approval-link",
            "role": "WARD_ADMIN",
            "branchId": attendant.branchId,
        }
        self.passes.approve_attendant(actor, attendant.id)
        # Reload so status is APPROVED before issuing
        attendant = self.db.get(Attendant, attendant.id)
        assert attendant is not None

        pass_result: dict[str, Any] | None = None
        pass_message = "Attendant approved."
        try:
            pass_result = self.passes.issue_pass(actor, attendant.id, revoke_existing=False)
            pass_message = (
                "Attendant approved and visit pass issued. QR was emailed to the visitor."
                if pass_result.get("emailSent")
                else "Attendant approved and visit pass issued. QR email was skipped."
            )
        except Exception as exc:
            detail = getattr(exc, "detail", None) or str(exc)
            logger.warning(
                "Approved attendant %s but could not auto-issue pass: %s",
                attendant.id,
                detail,
            )
            pass_message = (
                "Attendant approved. Pass was not issued automatically "
                f"({detail}). Issue it from the ward dashboard."
            )

        self._mark_used(attendant)
        return {
            "message": pass_message,
            "attendantId": attendant.id,
            "status": "APPROVED",
            "pass": pass_result,
        }

    def reject(self, token: str, reason: str = "Declined via approval link") -> dict[str, Any]:
        attendant = self._get_attendant_for_token(token, require_pending=True)
        attendant.status = "REJECTED"
        self._mark_used(attendant)
        logger.info("Attendant %s rejected via approval link: %s", attendant.id, reason)
        return {
            "message": "Attendant visit pass request declined.",
            "attendantId": attendant.id,
            "status": "REJECTED",
            "reason": reason,
        }

    def _ward_recipients(self, branch_id: str) -> list[User]:
        wards = (
            self.db.query(User)
            .filter(
                User.role == "WARD_ADMIN",
                User.branchId == branch_id,
                User.isActive.is_(True),
                User.email.isnot(None),
            )
            .all()
        )
        if wards:
            return [u for u in wards if u.email]
        # Fallback: hospital admins for the same branch
        admins = (
            self.db.query(User)
            .filter(
                User.role == "HOSPITAL_ADMIN",
                User.branchId == branch_id,
                User.isActive.is_(True),
                User.email.isnot(None),
            )
            .all()
        )
        return [u for u in admins if u.email]

    def _primary_ward_user(self, branch_id: str) -> User | None:
        recipients = self._ward_recipients(branch_id)
        return recipients[0] if recipients else None

    def _get_attendant_for_token(self, token: str, *, require_pending: bool = False) -> Attendant:
        token_hash = hash_token(token.strip())
        attendant = (
            self.db.query(Attendant)
            .options(
                joinedload(Attendant.admission).joinedload(Admission.patient),
            )
            .filter(Attendant.approvalLinkTokenHash == token_hash)
            .first()
        )
        if not attendant:
            raise HTTPException(status_code=404, detail="Invalid or expired approval link.")
        if attendant.approvalLinkUsedAt:
            raise HTTPException(status_code=410, detail="This approval link has already been used.")
        if self._is_expired(attendant):
            raise HTTPException(status_code=410, detail="This approval link has expired.")
        if require_pending and attendant.status != "PENDING":
            raise HTTPException(
                status_code=409,
                detail=f"This request is already {attendant.status.lower().replace('_', ' ')}.",
            )
        return attendant

    def _is_expired(self, attendant: Attendant) -> bool:
        if not attendant.approvalLinkExpiresAt:
            return True
        return attendant.approvalLinkExpiresAt < now_ist()

    def _mark_used(self, attendant: Attendant) -> None:
        attendant.approvalLinkUsedAt = now_ist()
        attendant.approvalLinkTokenHash = None
        self.db.commit()
