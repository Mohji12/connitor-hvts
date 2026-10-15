"""Visitor slot requests: doctor confirms on WhatsApp, which creates a slot only that visitor can book."""

from __future__ import annotations

import logging
import re
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings, is_wapblaster_configured
from app.models import Branch, Department, DoctorAvailabilitySlot, HospitalChain, User, VisitorAccount
from app.models.slot_request_entities import (
    SLOT_REQUEST_APPROVED,
    SLOT_REQUEST_PENDING,
    SLOT_REQUEST_REJECTED,
    SlotRequest,
)
from app.services.messaging_service import SmsService
from app.services.wapblaster_client import (
    send_wapblaster_visit_slot_approved,
    send_wapblaster_visit_slot_rejected,
    send_wapblaster_visit_slot_request,
)
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

REQUESTED_SLOT_MINUTES = 30
_DOCTOR_PREFIX = re.compile(r"^\s*dr\.?\s+", re.IGNORECASE)


def _without_dr_prefix(name: str) -> str:
    """The templates already say "Dr. {{n}}"."""
    return _DOCTOR_PREFIX.sub("", name or "").strip() or name


def reserved_slot_ids_for_others(db: Session, doctor_id: str, viewer_account_id: str | None) -> set[str]:
    """Slots created from a confirmed request belong to that visitor; hide them from everyone else."""
    query = db.query(SlotRequest.slotId).filter(
        SlotRequest.doctorId == doctor_id,
        SlotRequest.status == SLOT_REQUEST_APPROVED,
        SlotRequest.slotId.isnot(None),
    )
    if viewer_account_id:
        query = query.filter(SlotRequest.visitorAccountId != viewer_account_id)
    return {row[0] for row in query.all()}


def _uses_wapblaster() -> bool:
    settings = get_settings()
    return is_wapblaster_configured(settings) and settings.whatsapp_provider == "wapblaster"


def dispatch_slot_request_to_doctor(request_id: str) -> None:
    """Background task: WhatsApp the doctor about a new slot request."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        request = db.get(SlotRequest, request_id)
        if request:
            SlotRequestService(db).notify_doctor(request)
    except Exception:
        logger.warning("Slot request %s: doctor notice failed", request_id, exc_info=True)
    finally:
        db.close()


class SlotRequestService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- visitor side -------------------------------------------------

    def create(
        self,
        account: VisitorAccount,
        *,
        branch_id: str,
        department_id: str,
        sub_department_id: str,
        doctor_id: str,
        date_str: str,
        time_str: str,
        purpose: str,
    ) -> SlotRequest:
        from app.services.appointments_service import AppointmentsService

        appointments = AppointmentsService(self.db)
        appointments._validate_booking_chain(branch_id, department_id, sub_department_id, doctor_id)
        try:
            start = datetime.strptime(f"{date_str.strip()[:10]} {time_str.strip()[:5]}", "%Y-%m-%d %H:%M")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Choose a valid date and time.") from exc
        if start <= now_ist():
            raise HTTPException(status_code=400, detail="Choose a time in the future.")
        appointments._assert_not_during_live_visit(doctor_id, start)

        duplicate = (
            self.db.query(SlotRequest)
            .filter(
                SlotRequest.visitorAccountId == account.id,
                SlotRequest.doctorId == doctor_id,
                SlotRequest.requestedStart == start,
                SlotRequest.status == SLOT_REQUEST_PENDING,
            )
            .first()
        )
        if duplicate:
            return duplicate

        request = SlotRequest(
            visitorAccountId=account.id,
            doctorId=doctor_id,
            branchId=branch_id,
            departmentId=department_id,
            subDepartmentId=sub_department_id,
            requestedStart=start,
            purpose=purpose.strip()[:191],
            status=SLOT_REQUEST_PENDING,
            approvalCode=f"{secrets.randbelow(1_000_000):06d}",
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def get_for_account(self, request_id: str, account_id: str) -> SlotRequest:
        request = self.db.get(SlotRequest, request_id)
        if not request or request.visitorAccountId != account_id:
            raise HTTPException(status_code=404, detail="Slot request not found.")
        return request

    def list_for_account(self, account_id: str) -> list[dict]:
        rows = (
            self.db.query(SlotRequest)
            .filter(SlotRequest.visitorAccountId == account_id)
            .order_by(SlotRequest.createdAt.desc())
            .limit(50)
            .all()
        )
        return [self.serialize(row) for row in rows]

    def serialize(self, request: SlotRequest) -> dict:
        details = self._details(request)
        slot = self.db.get(DoctorAvailabilitySlot, request.slotId) if request.slotId else None
        return {
            "id": request.id,
            "status": request.status,
            "doctorId": request.doctorId,
            "doctorName": details["doctor_name"],
            "branchId": request.branchId,
            "branchName": details["branch_name"],
            "hospitalName": details["hospital_name"],
            "departmentId": request.departmentId,
            "departmentName": details["department_name"],
            "subDepartmentId": request.subDepartmentId,
            "requestedStart": request.requestedStart.isoformat(),
            "date": request.requestedStart.strftime("%Y-%m-%d"),
            "time": request.requestedStart.strftime("%H:%M"),
            "purpose": request.purpose,
            "slotId": request.slotId,
            "slotBooked": bool(slot and slot.isBooked),
            "createdAt": request.createdAt.isoformat() if request.createdAt else None,
            "decidedAt": request.decidedAt.isoformat() if request.decidedAt else None,
        }

    # ---- notifications ------------------------------------------------

    def _details(self, request: SlotRequest) -> dict[str, str]:
        doctor = self.db.get(User, request.doctorId)
        branch = self.db.get(Branch, request.branchId)
        chain = self.db.get(HospitalChain, branch.hospitalChainId) if branch else None
        department = self.db.get(Department, request.departmentId)
        account = self.db.get(VisitorAccount, request.visitorAccountId)
        branch_name = branch.name if branch else ""
        if "—" in branch_name:
            branch_name = branch_name.split("—")[-1].strip()
        return {
            "doctor_name": (doctor.name if doctor else "") or "Doctor",
            "doctor_phone": (doctor.phone if doctor else "") or "",
            "visitor_name": f"{account.firstName} {account.lastName}".strip() if account else "Visitor",
            "visitor_phone": (account.phone if account else "") or "",
            "hospital_name": (chain.name if chain else "") or (branch.name if branch else ""),
            "branch_name": branch_name,
            "department_name": department.name if department else "",
        }

    @staticmethod
    def _date_label(start: datetime) -> str:
        return start.strftime("%d %b %Y")

    @staticmethod
    def _time_label(start: datetime) -> str:
        return start.strftime("%I:%M %p").lstrip("0")

    def notify_doctor(self, request: SlotRequest) -> None:
        details = self._details(request)
        if not details["doctor_phone"]:
            logger.warning("Slot request %s: doctor has no phone", request.id)
            return
        settings = get_settings()
        date_label = self._date_label(request.requestedStart)
        time_label = self._time_label(request.requestedStart)
        if _uses_wapblaster():
            send_wapblaster_visit_slot_request(
                details["doctor_phone"],
                template_name=settings.whatsapp_template_visit_slot_request,
                template_language=settings.whatsapp_template_visit_slot_request_language,
                doctor_name=_without_dr_prefix(details["doctor_name"]),
                visitor_name=details["visitor_name"],
                hospital_name=details["hospital_name"],
                branch_name=details["branch_name"],
                department=details["department_name"],
                requested_date=date_label,
                requested_time=time_label,
                purpose=request.purpose,
                approval_code=request.approvalCode,
            )
            return
        SmsService().send_message(
            details["doctor_phone"],
            (
                f"Conninter: {details['visitor_name']} requests a visit slot on {date_label} at "
                f"{time_label}. Purpose: {request.purpose}. "
                f"Reply CONFIRM {request.approvalCode} or REJECT {request.approvalCode}."
            ),
        )

    def notify_visitor_approved(self, request: SlotRequest) -> None:
        details = self._details(request)
        if not details["visitor_phone"]:
            return
        settings = get_settings()
        book_path = f"book-appointment/?slotRequest={request.id}"
        date_label = self._date_label(request.requestedStart)
        time_label = self._time_label(request.requestedStart)
        if _uses_wapblaster():
            send_wapblaster_visit_slot_approved(
                details["visitor_phone"],
                template_name=settings.whatsapp_template_visit_slot_approved,
                template_language=settings.whatsapp_template_visit_slot_approved_language,
                visitor_name=details["visitor_name"],
                doctor_name=_without_dr_prefix(details["doctor_name"]),
                hospital_name=details["hospital_name"],
                branch_name=details["branch_name"],
                department=details["department_name"],
                approved_date=date_label,
                approved_time=time_label,
                purpose=request.purpose,
                book_path=book_path,
            )
            return
        SmsService().send_message(
            details["visitor_phone"],
            (
                f"Conninter: {details['doctor_name']} approved your visit slot on {date_label} at "
                f"{time_label}. Book it here: {settings.frontend_url.rstrip('/')}/{book_path}"
            ),
        )

    def notify_visitor_rejected(self, request: SlotRequest) -> None:
        details = self._details(request)
        if not details["visitor_phone"]:
            return
        settings = get_settings()
        date_label = self._date_label(request.requestedStart)
        time_label = self._time_label(request.requestedStart)
        if _uses_wapblaster():
            send_wapblaster_visit_slot_rejected(
                details["visitor_phone"],
                template_name=settings.whatsapp_template_visit_slot_rejected,
                template_language=settings.whatsapp_template_visit_slot_rejected_language,
                visitor_name=details["visitor_name"],
                doctor_name=_without_dr_prefix(details["doctor_name"]),
                hospital_name=details["hospital_name"],
                branch_name=details["branch_name"],
                department=details["department_name"],
                requested_date=date_label,
                requested_time=time_label,
                purpose=request.purpose,
            )
            return
        SmsService().send_message(
            details["visitor_phone"],
            (
                f"Conninter: {details['doctor_name']} could not approve your visit slot on "
                f"{date_label} at {time_label}. Please request another time."
            ),
        )

    # ---- doctor side --------------------------------------------------

    def find_pending(self, doctor_id: str, code: str | None) -> SlotRequest | None:
        query = self.db.query(SlotRequest).filter(
            SlotRequest.doctorId == doctor_id,
            SlotRequest.status == SLOT_REQUEST_PENDING,
        )
        if code:
            query = query.filter(SlotRequest.approvalCode == code)
        return query.order_by(SlotRequest.createdAt.desc()).first()

    def approve(self, request: SlotRequest) -> str:
        """Create (or claim) the slot for the requester and tell them they can book it."""
        if request.status != SLOT_REQUEST_PENDING:
            return "This slot request was already processed."
        start = request.requestedStart
        if start <= now_ist():
            request.status = SLOT_REQUEST_REJECTED
            request.decidedAt = now_ist()
            self.db.commit()
            return "This requested time has already passed, so it can't be confirmed."

        slot = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(
                DoctorAvailabilitySlot.doctorId == request.doctorId,
                DoctorAvailabilitySlot.slotStart == start,
            )
            .first()
        )
        if slot and (slot.isBooked or slot.id in reserved_slot_ids_for_others(self.db, request.doctorId, request.visitorAccountId)):
            return "That time is already booked. Ask the visitor to request another time."
        if not slot:
            slot = DoctorAvailabilitySlot(
                doctorId=request.doctorId,
                slotStart=start,
                slotEnd=start + timedelta(minutes=REQUESTED_SLOT_MINUTES),
                isBooked=False,
            )
            self.db.add(slot)
            self.db.flush()

        request.slotId = slot.id
        request.status = SLOT_REQUEST_APPROVED
        request.decidedAt = now_ist()
        self.db.commit()

        try:
            self.notify_visitor_approved(request)
        except Exception:
            logger.warning("Slot request %s: visitor approval notice failed", request.id, exc_info=True)
        details = self._details(request)
        return (
            f"Confirmed. {details['visitor_name']} can now book "
            f"{self._date_label(start)} at {self._time_label(start)}."
        )

    def reject(self, request: SlotRequest) -> str:
        if request.status != SLOT_REQUEST_PENDING:
            return "This slot request was already processed."
        request.status = SLOT_REQUEST_REJECTED
        request.decidedAt = now_ist()
        self.db.commit()
        try:
            self.notify_visitor_rejected(request)
        except Exception:
            logger.warning("Slot request %s: visitor rejection notice failed", request.id, exc_info=True)
        return "Rejected. The visitor has been notified."
