import base64
import io
import json
import random
from datetime import datetime, timedelta
from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist

import qrcode
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import DoctorAvailabilitySlot, Visit
from app.models.enums import AppointmentMode, VisitStatus
from app.services.notifications_service import NotificationsService
from app.services.livekit_service import LiveKitService
from app.utils.serializers import model_to_dict

CUSTOM_SLOT_MINUTES = 30


class StaffService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notifications = NotificationsService(db)

    def _release_slot_for_visit(self, visit_id: str) -> None:
        slot = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(DoctorAvailabilitySlot.visitId == visit_id)
            .first()
        )
        if slot:
            slot.isBooked = False
            slot.visitId = None

    def _materialize_slot_on_approve(self, visit: Visit) -> None:
        """Ensure a DoctorAvailabilitySlot exists and is linked when doctor approves.

        Open visit-slot requests (date only, midnight marker) do not create a clock slot —
        the doctor only confirms they will arrange a visit.
        """
        if not visit.appointmentDate or not visit.staffId:
            return
        purpose = (visit.purpose or "").upper()
        is_open_request = purpose.startswith("[CUSTOM SLOT]") and visit.appointmentDate.hour == 0 and visit.appointmentDate.minute == 0
        if is_open_request:
            return

        existing = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(DoctorAvailabilitySlot.visitId == visit.id)
            .first()
        )
        if existing:
            return

        appt = visit.appointmentDate.replace(second=0, microsecond=0)
        slot = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(
                DoctorAvailabilitySlot.doctorId == visit.staffId,
                DoctorAvailabilitySlot.slotStart == appt,
            )
            .first()
        )
        if slot:
            if slot.isBooked and slot.visitId and slot.visitId != visit.id:
                raise HTTPException(
                    status_code=409,
                    detail="That time was booked by another visit. Ask the visitor to pick a new time.",
                )
            slot.isBooked = True
            slot.visitId = visit.id
            return

        self.db.add(
            DoctorAvailabilitySlot(
                doctorId=visit.staffId,
                slotStart=appt,
                slotEnd=appt + timedelta(minutes=CUSTOM_SLOT_MINUTES),
                isBooked=True,
                visitId=visit.id,
            )
        )

    def get_pending_visits(self, staff_id: str) -> list[dict]:
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor))
            .filter(Visit.staffId == staff_id, Visit.status == VisitStatus.REQUEST_SENT.value)
            .order_by(Visit.createdAt.asc())
            .all()
        )
        return [self._visit_with_visitor(v) for v in visits]

    def get_visitor_history(self, staff_id: str) -> list[dict]:
        statuses = [
            VisitStatus.APPROVED.value,
            VisitStatus.REJECTED.value,
            VisitStatus.CHECKED_IN.value,
            VisitStatus.CHECKED_OUT.value,
        ]
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor))
            .filter(Visit.staffId == staff_id, Visit.status.in_(statuses))
            .order_by(Visit.createdAt.desc())
            .all()
        )
        return [self._visit_with_visitor(v) for v in visits]

    def _visit_with_visitor(self, visit: Visit) -> dict:
        data = model_to_dict(visit)
        if visit.visitor:
            data["visitor"] = {
                "firstName": visit.visitor.firstName,
                "lastName": visit.visitor.lastName,
                "phone": visit.visitor.phone,
            }
        return data

    def _generate_qr_base64(self, visit: Visit, visit_code: str) -> str:
        payload = {
            "visitId": visit.id,
            "visitorName": f"{visit.visitor.firstName} {visit.visitor.lastName}",
            "visitorPhone": visit.visitor.phone,
            "purpose": visit.purpose,
            "staffName": visit.staffName,
            "visitCode": visit_code,
            "visitorPassId": visit.visitorPassId,
            "timestamp": now_ist().isoformat(),
        }
        img = qrcode.make(json.dumps(payload))
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

    def approve_visit(self, visit_id: str, staff_id: str, doctor_feedback: str | None = None) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit request not found.")
        if visit.staffId != staff_id:
            raise HTTPException(status_code=403, detail="You are not authorized to approve this visit.")
        if visit.status != VisitStatus.REQUEST_SENT.value:
            raise HTTPException(status_code=409, detail=f"This visit is already in '{visit.status}' status.")

        is_online = visit.appointmentMode == AppointmentMode.ONLINE.value
        issued_pass = None
        if not is_online:
            from app.services.visitor_pass_service import VisitorPassService

            issued_pass = VisitorPassService(self.db).allocate_for_visit(
                visit, assigned_by_id=staff_id
            )
            self.db.flush()
            if not visit.visitorPassId:
                raise HTTPException(
                    status_code=500,
                    detail="Could not assign a visitor pass ID for this in-person visit.",
                )

        default_feedback = (
            "Your online appointment has been approved. Use the video consultation link in your email to join at the scheduled time."
            if is_online
            else "Your appointment has been approved. Please arrive on time with a valid photo ID."
        )
        visit.status = VisitStatus.APPROVED.value
        visit.doctorFeedback = (
            doctor_feedback.strip()
            if doctor_feedback and doctor_feedback.strip()
            else default_feedback
        )
        visit.doctorFeedbackAt = now_ist()
        pamphlet: str | None = None

        self._materialize_slot_on_approve(visit)

        if is_online:
            if not visit.appointmentDate:
                raise HTTPException(status_code=400, detail="Online appointment requires a scheduled date and time.")
            LiveKitService(self.db).assign_meeting(visit)
            visit.visitCode = None
            visit.visitQRCode = None
            visit.checkInOtp = None
            visit.isCodeUsed = False
            visit.checkInOtpExpiry = None
        else:
            visit_code = f"{random.randint(100000, 999999)}"
            pamphlet = self._generate_qr_base64(visit, visit_code)
            visit.visitCode = visit_code
            visit.visitQRCode = pamphlet
            visit.checkInOtp = visit_code
            visit.isCodeUsed = True
            visit.checkInOtpExpiry = now_ist() + timedelta(hours=8)

        self.db.commit()
        self.db.refresh(visit)

        if visit.staff and visit.visitor:
            self.notifications.notify_admins_on_doctor_approval(visit, visit.staff, visit.visitor)
            if is_online:
                self.notifications.notify_doctor_online_approval(visit, visit.staff, visit.visitor)
                self.notifications.notify_visitor_online_approval(visit, visit.visitor, visit.staff)
            else:
                self.notifications.notify_staff_on_approval(visit, visit.staff, visit.visitor)
                self.notifications.notify_visitor_approval(visit, visit.visitor, visit.staff)

        result: dict = {
            "message": "Visitor request approved successfully.",
            "visit": model_to_dict(visit),
            "visitorPassId": visit.visitorPassId,
        }
        if pamphlet:
            result["pamphletImage"] = pamphlet
        return result

    def reject_visit(self, visit_id: str, staff_id: str, rejection_reason: str) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit request not found.")
        if visit.staffId != staff_id:
            raise HTTPException(status_code=403, detail="You are not authorized to reject this visit.")
        if visit.checkInTime is not None or visit.status in (
            VisitStatus.CHECKED_IN.value,
            VisitStatus.CHECKED_OUT.value,
        ):
            raise HTTPException(
                status_code=409,
                detail="This visit cannot be rejected after check-in.",
            )
        if visit.status not in (VisitStatus.REQUEST_SENT.value, VisitStatus.APPROVED.value):
            raise HTTPException(
                status_code=409,
                detail=f"This visit is already in '{visit.status}' status and cannot be rejected.",
            )
        visit.status = VisitStatus.REJECTED.value
        visit.rejectionReason = rejection_reason
        visit.doctorFeedback = rejection_reason
        visit.doctorFeedbackAt = now_ist()
        self._release_slot_for_visit(visit.id)
        from app.services.visitor_pass_service import VisitorPassService

        VisitorPassService(self.db).recycle_for_visit(visit)
        self.db.commit()
        self.db.refresh(visit)
        if visit.staff and visit.visitor:
            self.notifications.notify_visitor_rejection(
                visit, visit.visitor, visit.staff, rejection_reason
            )
        return {"message": "Visitor request rejected successfully.", "visit": model_to_dict(visit)}
