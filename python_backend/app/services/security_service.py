from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.models import User, Visit
from app.models.enums import AppointmentMode, Role, VisitStatus
from app.services.gate_pass_service import GatePassService
from app.services.livekit_service import meeting_join_url
from app.services.notifications_service import NotificationsService
from app.services.visitor_account_service import VisitorAccountService
from app.utils.serializers import model_to_dict
from app.utils.timezone import now_ist, today_end_ist, today_start_ist


class SecurityService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notifications = NotificationsService(db)
        self.gate_pass = GatePassService(db)

    @staticmethod
    def _resolve_document_url(stored: str | None) -> str | None:
        if not stored:
            return None
        if stored.startswith(("http://", "https://", "data:")):
            return stored
        settings = get_settings()
        if settings.gcp_public_url:
            return f"{settings.gcp_public_url.rstrip('/')}/government-id/{stored}"
        return stored

    def _assert_access(self, user: dict, branch_id: str | None = None) -> None:
        if user["role"] not in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            raise HTTPException(status_code=403, detail="You are not authorized to perform this action.")
        if branch_id and user.get("branchId") != branch_id:
            raise HTTPException(status_code=403, detail="You can only access visitor data for your assigned branch.")

    def approve_visit(self, visit_id: str, user: dict) -> dict:
        self._assert_access(user)
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.staff), joinedload(Visit.visitor))
            .filter(Visit.id == visit_id, Visit.branchId == user.get("branchId"))
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit request not found at this branch.")
        if visit.status != VisitStatus.REQUEST_SENT.value:
            raise HTTPException(status_code=409, detail=f"This visit is already in '{visit.status}' status.")

        if visit.appointmentMode != AppointmentMode.ONLINE.value:
            from app.services.visitor_pass_service import VisitorPassService

            VisitorPassService(self.db).allocate_for_visit(visit, assigned_by_id=user.get("id"))
            self.db.flush()

        self.gate_pass.generate_check_in_otp(visit_id)
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.staff), joinedload(Visit.visitor))
            .filter(Visit.id == visit_id)
            .first()
        )
        if visit and visit.visitor and visit.staff and visit.checkInOtp:
            self.notifications.notify_visitor_approval(visit, visit.visitor, visit.staff)
        image = self.gate_pass.generate_gate_pass_image(visit_id)
        gcp = self.gate_pass.upload_gate_pass_to_gcp(visit_id, image["imageUrl"])
        whatsapp = self.gate_pass.send_gate_pass_via_whatsapp(visit_id, image["imageUrl"])

        visit.status = VisitStatus.APPROVED.value
        self.db.commit()
        self.db.refresh(visit)

        if visit.staff:
            self.notifications.notify_staff_on_security_approval(visit, visit.staff, visit.visitor)

        return {
            "message": "Visitor request approved successfully by Security.",
            "visit": model_to_dict(visit),
            "gatePassUrl": gcp["publicUrl"],
            "gatePassUrlExpiry": gcp["urlExpiry"].isoformat(),
            "whatsappSent": whatsapp["sent"],
        }

    def reject_visit(self, visit_id: str, user: dict, rejection_reason: str) -> dict:
        self._assert_access(user)
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.staff), joinedload(Visit.visitor))
            .filter(Visit.id == visit_id, Visit.branchId == user.get("branchId"))
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit request not found at this branch.")
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
        from app.services.visitor_pass_service import VisitorPassService

        VisitorPassService(self.db).recycle_for_visit(visit)
        self.db.commit()
        if visit.staff:
            self.notifications.notify_staff_on_security_rejection(
                visit, visit.staff, visit.visitor, rejection_reason
            )
        return {"message": "Visitor request rejected successfully by Security.", "visit": model_to_dict(visit)}

    def get_visitor_counts(self, branch_id: str, user: dict) -> dict:
        self._assert_access(user, branch_id)
        result = {"pending": 0, "approved": 0, "checkedIn": 0, "checkedOut": 0, "rejected": 0}
        rows = (
            self.db.query(Visit.status)
            .filter(
                Visit.branchId == branch_id,
                Visit.status.in_(
                    [
                        VisitStatus.PENDING.value,
                        VisitStatus.REQUEST_SENT.value,
                        VisitStatus.APPROVED.value,
                        VisitStatus.CHECKED_IN.value,
                        VisitStatus.CHECKED_OUT.value,
                        VisitStatus.REJECTED.value,
                    ]
                ),
            )
            .all()
        )
        for (status,) in rows:
            if status in (VisitStatus.PENDING.value, VisitStatus.REQUEST_SENT.value):
                result["pending"] += 1
            elif status == VisitStatus.APPROVED.value:
                result["approved"] += 1
            elif status == VisitStatus.CHECKED_IN.value:
                result["checkedIn"] += 1
            elif status == VisitStatus.CHECKED_OUT.value:
                result["checkedOut"] += 1
            elif status == VisitStatus.REJECTED.value:
                result["rejected"] += 1
        return {"success": True, "data": result}

    def get_visitors_by_status(self, branch_id: str, statuses: list[str], user: dict) -> dict:
        self._assert_access(user, branch_id)
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.branchId == branch_id, Visit.status.in_(statuses))
            .order_by(Visit.createdAt.desc())
            .all()
        )
        visitors = []
        for visit in visits:
            middle = f" {visit.visitor.middleName}" if visit.visitor.middleName else ""
            visitors.append(
                {
                    "id": visit.id,
                    "visitorName": f"{visit.visitor.firstName}{middle} {visit.visitor.lastName}".strip(),
                    "visitorPhone": visit.visitor.phone,
                    "visitorEmail": visit.visitor.email,
                    "visitorPhoto": visit.visitor.photo,
                    "visitType": visit.visitCategory,
                    "status": visit.status,
                    "personToMeet": visit.staff.name if visit.staff else visit.staffName,
                    "purpose": visit.purpose,
                    "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
                    "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
                }
            )
        return {"success": True, "data": {"visitors": visitors, "totalCount": len(visitors)}}

    def verify_id_proof(self, visit_id: str, user: dict, id_proof_type: str, id_proof_number: str) -> dict:
        self._assert_access(user)
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id, Visit.branchId == user.get("branchId"))
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found at this branch.")
        if visit.status != VisitStatus.APPROVED.value:
            raise HTTPException(status_code=400, detail="Visit must be approved before ID verification.")
        visit.idProofVerified = True
        visit.idProofType = id_proof_type
        visit.idProofNumber = id_proof_number
        visit.verifiedBySecurityId = user["id"]
        self.db.commit()
        self.db.refresh(visit)
        if visit.visitor:
            self.notifications.notify_visitor_id_verified(visit, visit.visitor, visit.staff)
        return {"message": "ID proof verified successfully.", "visit": model_to_dict(visit)}

    def get_today_appointments(self, user: dict) -> dict:
        self._assert_access(user)
        today_start = today_start_ist()
        today_end = today_end_ist()
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(
                Visit.branchId == user.get("branchId"),
                Visit.appointmentDate.isnot(None),
                Visit.appointmentDate >= today_start,
                Visit.appointmentDate <= today_end,
                Visit.status.in_(
                    [
                        VisitStatus.APPROVED.value,
                        VisitStatus.CHECKED_IN.value,
                        VisitStatus.CHECKED_OUT.value,
                    ]
                ),
            )
            .order_by(Visit.appointmentDate.asc())
            .all()
        )
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        live_ends = VisitSlotExtensionService(self.db).live_end_by_staff(user.get("branchId") or "")
        appointments = [self._serialize_appointment(v, live_ends=live_ends) for v in visits]
        return {"appointments": appointments, "total": len(appointments)}

    def get_pending_appointments(self, user: dict) -> dict:
        """Visitor bookings awaiting doctor approval — visible to security for awareness."""
        self._assert_access(user)
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(
                Visit.branchId == user.get("branchId"),
                Visit.appointmentDate.isnot(None),
                Visit.status == VisitStatus.REQUEST_SENT.value,
            )
            .order_by(Visit.appointmentDate.asc())
            .all()
        )
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        live_ends = VisitSlotExtensionService(self.db).live_end_by_staff(user.get("branchId") or "")
        appointments = [self._serialize_appointment(v, live_ends=live_ends) for v in visits]
        return {"appointments": appointments, "total": len(appointments)}

    def get_upcoming_confirmed_appointments(self, user: dict) -> dict:
        """Doctor-approved appointments scheduled after today — security can prepare in advance."""
        self._assert_access(user)
        today_end = today_end_ist()
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(
                Visit.branchId == user.get("branchId"),
                Visit.appointmentDate.isnot(None),
                Visit.appointmentDate > today_end,
                Visit.status == VisitStatus.APPROVED.value,
            )
            .order_by(Visit.appointmentDate.asc())
            .all()
        )
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        live_ends = VisitSlotExtensionService(self.db).live_end_by_staff(user.get("branchId") or "")
        appointments = [self._serialize_appointment(v, live_ends=live_ends) for v in visits]
        return {"appointments": appointments, "total": len(appointments)}

    def _serialize_appointment(self, visit: Visit, live_ends: dict | None = None) -> dict:
        middle = f" {visit.visitor.middleName}" if visit.visitor.middleName else ""
        from datetime import datetime

        now = now_ist()
        expected = visit.expectedEndTime
        is_live = (
            visit.status == VisitStatus.CHECKED_IN.value
            and visit.checkOutTime is None
            and isinstance(expected, datetime)
            and expected > now
        )
        other_end = (live_ends or {}).get(visit.staffId) if visit.staffId else None
        hold_next = is_live or (
            visit.status in (VisitStatus.APPROVED.value, VisitStatus.REQUEST_SENT.value) and other_end is not None
        )
        return {
            "visitId": visit.id,
            "visitorName": f"{visit.visitor.firstName}{middle} {visit.visitor.lastName}".strip(),
            "visitorPhone": visit.visitor.phone,
            "doctorName": visit.staff.name if visit.staff else visit.staffName,
            "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
            "status": visit.status,
            "idProofVerified": visit.idProofVerified,
            "purpose": visit.purpose,
            "doctorConfirmed": visit.status == VisitStatus.APPROVED.value,
            "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
            "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
            "appointmentMode": visit.appointmentMode or "IN_PERSON",
            "isOnline": visit.appointmentMode == AppointmentMode.ONLINE.value,
            "meetingJoinUrl": meeting_join_url(visit) if visit.appointmentMode == AppointmentMode.ONLINE.value else None,
            "visitorPassId": visit.visitorPassId,
            "visitorType": visit.visitorType,
            "meetingStatus": visit.meetingStatus if visit.visitorType == "SALES_REPRESENTATIVE" else None,
            "companyName": visit.companyName if visit.visitorType == "SALES_REPRESENTATIVE" else None,
            "expectedEndTime": expected.isoformat() if expected else None,
            "allottedMinutes": visit.allottedMinutes,
            "holdNextVisitor": hold_next,
        }

    def get_visitor_details(self, visit_id: str, user: dict) -> dict:
        if user["role"] not in (
            Role.SECURITY.value,
            Role.SECURITY_SUPERVISOR.value,
            Role.SUPER_ADMIN.value,
        ):
            raise HTTPException(status_code=403, detail="You are not authorized to perform this action.")
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.branch), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
        if user["role"] != Role.SUPER_ADMIN.value and user.get("branchId") != visit.branchId:
            raise HTTPException(status_code=403, detail="You do not have access to this branch")

        settings = get_settings()
        photo_url = visit.visitor.photo
        govt_id_type = None
        govt_id_url = None
        if visit.visitor.visitorAccountId:
            account_profile = VisitorAccountService(self.db).get_profile_for_account(
                visit.visitor.visitorAccountId, include_govt_id=True
            )
            if account_profile.get("photoUrl"):
                photo_url = account_profile["photoUrl"]
            govt_id_type = account_profile.get("govtIdType")
            govt_id_url = account_profile.get("govtIdUrl")
        if not govt_id_url and visit.visitor.governmentIdDocument:
            govt_id_url = self._resolve_document_url(visit.visitor.governmentIdDocument)
        if photo_url and not photo_url.startswith("http") and settings.gcp_public_url:
            photo_url = f"{settings.gcp_public_url.rstrip('/')}/photos/{photo_url}"

        approved_at = None
        if visit.status in (
            VisitStatus.APPROVED.value,
            VisitStatus.CHECKED_IN.value,
            VisitStatus.CHECKED_OUT.value,
        ):
            approved_at = visit.updatedAt.isoformat()

        return {
            "success": True,
            "data": {
                "id": visit.visitor.id,
                "visitId": visit.id,
                "firstName": visit.visitor.firstName,
                "lastName": visit.visitor.lastName,
                "fullName": f"{visit.visitor.firstName} {visit.visitor.lastName}",
                "phone": visit.visitor.phone,
                "email": visit.visitor.email,
                "company": visit.visitor.company,
                "designation": visit.visitor.designation,
                "photoUrl": photo_url,
                "govtIdType": govt_id_type,
                "govtIdUrl": govt_id_url,
                "hasGovernmentId": bool(govt_id_url),
                "idProofVerified": visit.idProofVerified,
                "idProofType": visit.idProofType,
                "idProofNumber": visit.idProofNumber,
                "visitType": visit.visitCategory,
                "status": visit.status,
                "purpose": visit.purpose,
                "hostName": visit.staffName,
                "department": visit.department,
                "staffPhone": visit.staffPhone,
                "createdAt": visit.createdAt.isoformat(),
                "approvedAt": approved_at,
                "checkedInAt": visit.checkInTime.isoformat() if visit.checkInTime else None,
                "checkedOutAt": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
                "checkInOtp": visit.checkInOtp,
                "visitorPassId": visit.visitorPassId,
                "checkInOtpExpiry": visit.checkInOtpExpiry.isoformat() if visit.checkInOtpExpiry else None,
                "gatePassGeneratedAt": visit.gatePassGeneratedAt.isoformat()
                if visit.gatePassGeneratedAt
                else None,
            },
        }
