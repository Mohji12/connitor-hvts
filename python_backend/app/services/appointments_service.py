from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings, is_demo_mode_enabled, is_meta_whatsapp_configured, is_test_mode_enabled
from app.models import Branch, Department, DoctorAvailabilitySlot, SubDepartment, User, Visit, Visitor
from app.models.enums import AppointmentMode, Role, VisitCategory, VisitStatus
from app.services.livekit_service import meeting_join_url
from app.services.notifications_service import NotificationsService
from app.services.sales_meeting_service import apply_visitor_kind
from app.services.visitor_account_link_service import VisitorAccountLinkService
from app.utils.serializers import model_to_dict
from app.utils.timezone import now_ist, parse_to_ist_naive

# Legacy Visit.department MySQL ENUM values (dept.code e.g. CARDIO is not valid)
DEPARTMENT_CODE_TO_LEGACY: dict[str, str] = {
    "CARDIO": "CARDIOLOGY",
    "ICU-CARD": "INTENSIVE_CARE_UNIT",
}


class AppointmentsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notifications = NotificationsService(db)

    def _validate_booking_chain(
        self, branch_id: str, department_id: str, sub_department_id: str, doctor_id: str
    ) -> tuple[Branch, Department, SubDepartment, User]:
        branch = self.db.get(Branch, branch_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Hospital location not found.")
        dept = self.db.get(Department, department_id)
        if not dept or not dept.isActive or dept.branchId != branch_id:
            raise HTTPException(status_code=404, detail="Department not found at this location.")
        sub = self.db.get(SubDepartment, sub_department_id)
        if not sub or not sub.isActive or sub.departmentId != department_id:
            raise HTTPException(status_code=404, detail="Sub-department not found.")
        doctor = self.db.get(User, doctor_id)
        if (
            not doctor
            or not doctor.isActive
            or doctor.role != Role.STAFF.value
            or doctor.subDepartmentId != sub_department_id
        ):
            raise HTTPException(status_code=404, detail="Staff not found in this sub-department.")
        return branch, dept, sub, doctor

    def _legacy_visit_department(self, dept: Department, doctor: User) -> str | None:
        """Map hierarchy department to legacy Visit.department ENUM value."""
        if doctor.department:
            return doctor.department
        return DEPARTMENT_CODE_TO_LEGACY.get(dept.code, "GENERAL_MEDICINE")

    def _branch_has_booking_catalog(self, branch_id: str) -> bool:
        """True when branch has at least one active dept → sub-dept → doctor chain."""
        departments = (
            self.db.query(Department.id)
            .filter(Department.branchId == branch_id, Department.isActive == True)  # noqa: E712
            .all()
        )
        if not departments:
            return False

        dept_ids = [row[0] for row in departments]
        subs = (
            self.db.query(SubDepartment.id)
            .filter(
                SubDepartment.departmentId.in_(dept_ids),
                SubDepartment.branchId == branch_id,
                SubDepartment.isActive == True,  # noqa: E712
            )
            .all()
        )
        if not subs:
            return False

        sub_ids = [row[0] for row in subs]
        doctor = (
            self.db.query(User.id)
            .filter(
                User.subDepartmentId.in_(sub_ids),
                User.branchId == branch_id,
                User.role == Role.STAFF.value,
                User.isActive == True,  # noqa: E712
            )
            .first()
        )
        return doctor is not None

    def list_public_hospitals(self) -> list[dict]:
        branches = self.db.query(Branch).all()
        return [
            {
                "id": b.id,
                "name": b.name,
                "city": b.city,
                "state": b.state,
                "hospitalChainId": b.hospitalChainId,
            }
            for b in branches
            if self._branch_has_booking_catalog(b.id)
        ]

    def list_public_departments(self, branch_id: str) -> list[dict]:
        depts = (
            self.db.query(Department)
            .filter(Department.branchId == branch_id, Department.isActive == True)  # noqa: E712
            .order_by(Department.name)
            .all()
        )
        return [model_to_dict(d) for d in depts]

    def list_public_sub_departments(self, department_id: str) -> list[dict]:
        subs = (
            self.db.query(SubDepartment)
            .filter(SubDepartment.departmentId == department_id, SubDepartment.isActive == True)  # noqa: E712
            .order_by(SubDepartment.name)
            .all()
        )
        return [model_to_dict(s) for s in subs]

    def _doctor_public_payload(self, doctor: User) -> dict:
        sub = self.db.get(SubDepartment, doctor.subDepartmentId) if doctor.subDepartmentId else None
        dept = self.db.get(Department, doctor.departmentId) if doctor.departmentId else None
        branch = self.db.get(Branch, doctor.branchId) if doctor.branchId else None
        specialty = doctor.department or (dept.name if dept else None)
        return {
            "id": doctor.id,
            "name": doctor.name,
            "userType": doctor.userType,
            "department": specialty,
            "location": doctor.location,
            "departmentName": dept.name if dept else None,
            "subDepartmentName": sub.name if sub else None,
            "branchName": branch.name if branch else None,
            "branchCity": branch.city if branch else None,
            "qualification": "MD, DM (Cardiology)" if specialty and "CARDIO" in specialty.upper() else None,
            "experienceYears": 12,
            "languages": ["English", "Hindi", "Kannada"],
            "consultationModes": ["IN_PERSON", "ONLINE"],
        }

    def list_public_doctors(self, sub_department_id: str) -> list[dict]:
        doctors = (
            self.db.query(User)
            .filter(
                User.subDepartmentId == sub_department_id,
                User.role == Role.STAFF.value,
                User.isActive == True,  # noqa: E712
            )
            .order_by(User.name)
            .all()
        )
        return [self._doctor_public_payload(d) for d in doctors]

    def get_public_doctor(self, doctor_id: str) -> dict:
        doctor = self.db.get(User, doctor_id)
        if not doctor or not doctor.isActive or doctor.role != Role.STAFF.value:
            raise HTTPException(status_code=404, detail="Staff not found.")
        return self._doctor_public_payload(doctor)

    def _earliest_bookable_start(self, doctor_id: str, now: datetime | None = None) -> datetime:
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        now = now or now_ist()
        live_end = VisitSlotExtensionService(self.db).live_end_for_doctor(doctor_id)
        if live_end and live_end > now:
            return live_end
        return now

    def _assert_not_during_live_visit(self, doctor_id: str, start: datetime) -> None:
        earliest = self._earliest_bookable_start(doctor_id)
        if start < earliest:
            when = earliest.strftime("%I:%M %p").lstrip("0")
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Doctor has an ongoing visit until {when}. "
                    "Please choose a later time."
                ),
            )

    def list_doctor_slots(self, doctor_id: str, date_str: str) -> list[dict]:
        doctor = self.db.get(User, doctor_id)
        if not doctor or not doctor.isActive or doctor.role != Role.STAFF.value:
            raise HTTPException(status_code=404, detail="Staff not found.")
        try:
            day = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.") from exc

        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        now = now_ist()

        slots = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(
                DoctorAvailabilitySlot.doctorId == doctor_id,
                DoctorAvailabilitySlot.slotStart >= day_start,
                DoctorAvailabilitySlot.slotStart < day_end,
                DoctorAvailabilitySlot.isBooked == False,  # noqa: E712
                DoctorAvailabilitySlot.slotStart > now,
            )
            .order_by(DoctorAvailabilitySlot.slotStart)
            .all()
        )
        earliest = self._earliest_bookable_start(doctor_id, now)
        if earliest > now:
            slots = [s for s in slots if s.slotStart >= earliest]
        return [
            {
                "id": s.id,
                "slotStart": s.slotStart.isoformat(),
                "slotEnd": s.slotEnd.isoformat(),
                "label": s.slotStart.strftime("%I:%M %p").lstrip("0"),
            }
            for s in slots
        ]

    def _reserve_slot(self, doctor_id: str, slot_id: str | None, appt_date: datetime | None) -> tuple[datetime, DoctorAvailabilitySlot | None]:
        if slot_id:
            q = self.db.query(DoctorAvailabilitySlot).filter(DoctorAvailabilitySlot.id == slot_id)
            try:
                q = q.with_for_update()
            except Exception:
                pass
            slot = q.first()
            if not slot or slot.doctorId != doctor_id:
                raise HTTPException(status_code=404, detail="Selected time slot not found.")
            if slot.isBooked:
                raise HTTPException(status_code=409, detail="This time slot is no longer available.")
            if slot.slotStart <= now_ist():
                raise HTTPException(status_code=400, detail="Cannot book a past time slot.")
            self._assert_not_during_live_visit(doctor_id, slot.slotStart)
            return slot.slotStart, slot
        if not appt_date:
            raise HTTPException(status_code=400, detail="appointmentDate or slotId is required.")
        if appt_date <= now_ist():
            raise HTTPException(status_code=400, detail="Appointment must be in the future.")
        self._assert_not_during_live_visit(doctor_id, appt_date)
        return appt_date, None

    def _assert_custom_time_available(self, doctor_id: str, appt_date: datetime) -> None:
        """Reject custom requests that collide with an already-booked slot or pending visit."""
        self._assert_not_during_live_visit(doctor_id, appt_date)
        existing_slot = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(
                DoctorAvailabilitySlot.doctorId == doctor_id,
                DoctorAvailabilitySlot.slotStart == appt_date,
                DoctorAvailabilitySlot.isBooked == True,  # noqa: E712
            )
            .first()
        )
        if existing_slot:
            raise HTTPException(
                status_code=409,
                detail="That time is already booked. Please choose another time.",
            )
        pending = (
            self.db.query(Visit)
            .filter(
                Visit.staffId == doctor_id,
                Visit.appointmentDate == appt_date,
                Visit.status == VisitStatus.REQUEST_SENT.value,
            )
            .first()
        )
        if pending:
            raise HTTPException(
                status_code=409,
                detail="Another request is already pending for that time. Please choose another time.",
            )

    def book_appointment(self, data: dict, *, defer_notifications: bool = False) -> dict:
        branch, dept, sub, doctor = self._validate_booking_chain(
            data["branchId"],
            data["departmentId"],
            data["subDepartmentId"],
            data["doctorId"],
        )

        request_custom = bool(data.get("requestCustomSlot"))
        slot_id = None if request_custom else data.get("slotId")

        try:
            appt_date = parse_to_ist_naive(data["appointmentDate"]) if data.get("appointmentDate") else None
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid appointmentDate format.") from exc

        if request_custom:
            if not appt_date:
                raise HTTPException(
                    status_code=400,
                    detail="appointmentDate is required when requesting a visit slot.",
                )
            if appt_date <= now_ist():
                raise HTTPException(status_code=400, detail="Requested date and time must be in the future.")
            self._assert_custom_time_available(data["doctorId"], appt_date)
            slot = None
        else:
            appt_date, slot = self._reserve_slot(data["doctorId"], slot_id, appt_date)

        visitor_account_id = data.get("visitorAccountId")
        if visitor_account_id:
            visitor = VisitorAccountLinkService(self.db).ensure_branch_visitor(
                visitor_account_id, data["branchId"]
            )
        else:
            visitor = (
                self.db.query(Visitor)
                .filter(Visitor.phone == data["phone"], Visitor.branchId == data["branchId"])
                .first()
            )
            if visitor:
                visitor.firstName = data["firstName"]
                visitor.lastName = data["lastName"]
                if data.get("email"):
                    visitor.email = data["email"]
            else:
                visitor = Visitor(
                    firstName=data["firstName"],
                    lastName=data["lastName"],
                    phone=data["phone"],
                    email=data.get("email"),
                    branchId=data["branchId"],
                )
                self.db.add(visitor)
                self.db.flush()

        mode = data.get("appointmentMode") or AppointmentMode.IN_PERSON.value
        if mode not in (AppointmentMode.IN_PERSON.value, AppointmentMode.ONLINE.value):
            raise HTTPException(status_code=400, detail="Invalid appointmentMode.")

        purpose = data["purpose"]
        if request_custom and not purpose.upper().startswith("[CUSTOM SLOT]"):
            purpose = f"[CUSTOM SLOT] {purpose}"

        visit = Visit(
            visitorId=visitor.id,
            staffId=doctor.id,
            staffName=doctor.name,
            staffPhone=doctor.phone,
            branchId=branch.id,
            departmentId=dept.id,
            subDepartmentId=sub.id,
            department=self._legacy_visit_department(dept, doctor),
            purpose=purpose,
            appointmentDate=appt_date,
            appointmentMode=mode,
            visitCategory=VisitCategory.MEETING.value,
            status=VisitStatus.REQUEST_SENT.value,
        )
        apply_visitor_kind(visit, data)
        if visit.companyName and not visitor.company:
            visitor.company = visit.companyName
        self.db.add(visit)
        self.db.flush()

        if slot:
            self.db.refresh(slot)
            if slot.isBooked:
                self.db.rollback()
                raise HTTPException(status_code=409, detail="This time slot is no longer available.")
            slot.isBooked = True
            slot.visitId = visit.id

        self.db.commit()
        self.db.refresh(visit)

        if not defer_notifications:
            self.notifications.notify_staff_on_visit_request(visit, doctor, visitor)
            self.notifications.notify_security_on_new_visit_request(visit, doctor, visitor)
            self.notifications.notify_visitor_booking_received(
                visit, doctor, visitor, branch=branch, department=dept, sub_department=sub
            )

        message = (
            "Visit slot requested for the selected date and time. The doctor will approve or decline."
            if request_custom
            else "Appointment booked successfully. Awaiting doctor approval."
        )
        return {
            "bookingId": visit.id,
            "status": visit.status,
            "message": message,
            "isCustomSlotRequest": request_custom,
            "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
            "doctorName": doctor.name,
            "departmentName": dept.name,
            "subDepartmentName": sub.name,
            "appointmentMode": visit.appointmentMode,
            "visitorType": visit.visitorType,
            "meetingStatus": visit.meetingStatus,
            "companyName": visit.companyName,
        }

    def get_booking_status(self, booking_id: str, phone: str) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == booking_id)
            .first()
        )
        if not visit or visit.visitor.phone != phone:
            raise HTTPException(status_code=404, detail="Booking not found.")
        return {
            "bookingId": visit.id,
            "status": visit.status,
            "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
            "doctorName": visit.staffName,
            "purpose": visit.purpose,
            "appointmentMode": visit.appointmentMode or AppointmentMode.IN_PERSON.value,
            "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
            "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
            "totalDurationMinutes": visit.totalDurationMinutes,
            "doctorFeedback": visit.doctorFeedback,
            "doctorFeedbackAt": visit.doctorFeedbackAt.isoformat() if visit.doctorFeedbackAt else None,
            "rejectionReason": visit.rejectionReason,
            "meetingJoinUrl": (
                meeting_join_url(visit)
                if visit.appointmentMode == AppointmentMode.ONLINE.value
                and visit.status in (VisitStatus.APPROVED.value, VisitStatus.CHECKED_IN.value)
                else None
            ),
            "visitorType": visit.visitorType,
            "meetingStatus": visit.meetingStatus,
            "companyName": visit.companyName,
        }

    def _whatsapp_simulation_allowed(self) -> bool:
        settings = get_settings()
        if settings.node_env != "production":
            return True
        return is_demo_mode_enabled(settings) or is_test_mode_enabled(settings)

    def get_whatsapp_simulation(self, booking_id: str, phone: str) -> dict:
        if not self._whatsapp_simulation_allowed():
            raise HTTPException(status_code=404, detail="Not available")

        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == booking_id)
            .first()
        )
        if not visit or not visit.visitor or visit.visitor.phone != phone:
            raise HTTPException(status_code=404, detail="Booking not found.")

        settings = get_settings()
        visitor_name = self.notifications._visitor_name(visit.visitor)
        appt = self.notifications._format_appt(visit)
        approval_code = visit.smsApprovalCode or ""
        doctor_phone = visit.staffPhone or (visit.staff.phone if visit.staff else "") or ""
        supports_buttons = is_meta_whatsapp_configured(settings)

        if supports_buttons:
            outbound_message = (
                f"New appointment request from {visitor_name} on {appt}. "
                "Tap Yes to approve or No to reject."
            )
        else:
            outbound_message = (
                f"Connitor: New request from {visitor_name} on {appt}. "
                f"Reply YES {approval_code} to approve or NO {approval_code} to reject on WhatsApp. "
                "Or review in My Visitors."
            )

        return {
            "bookingId": visit.id,
            "status": visit.status,
            "visitorName": visitor_name,
            "doctorName": visit.staffName or "Doctor",
            "doctorPhone": doctor_phone,
            "appointmentLabel": appt,
            "approvalCode": approval_code,
            "centralWhatsAppNumber": settings.pywhatkit_central_phone.strip(),
            "supportsInteractiveButtons": supports_buttons,
            "outboundMessage": outbound_message,
        }

    def list_appointments(self, filters: dict, req_user: dict) -> list[dict]:
        q = self.db.query(Visit).options(joinedload(Visit.visitor), joinedload(Visit.staff))
        q = q.filter(Visit.appointmentDate.isnot(None))
        role = req_user["role"]
        if role == Role.HOSPITAL_ADMIN.value:
            q = q.filter(Visit.branchId == req_user.get("branchId"))
        elif role == Role.DEPARTMENT_ADMIN.value:
            q = q.filter(Visit.departmentId == req_user.get("departmentId"))
        elif role == Role.SUB_DEPARTMENT_ADMIN.value:
            q = q.filter(Visit.subDepartmentId == req_user.get("subDepartmentId"))
        elif role == Role.STAFF.value:
            q = q.filter(Visit.staffId == req_user.get("id"))
        elif role in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            q = q.filter(Visit.branchId == req_user.get("branchId"))
        if filters.get("status"):
            q = q.filter(Visit.status == filters["status"])
        if filters.get("branchId"):
            q = q.filter(Visit.branchId == filters["branchId"])
        visits = q.order_by(Visit.appointmentDate.desc()).limit(100).all()
        result = []
        for v in visits:
            row = model_to_dict(v)
            if v.visitor:
                row["visitor"] = {
                    "firstName": v.visitor.firstName,
                    "lastName": v.visitor.lastName,
                    "phone": v.visitor.phone,
                }
            result.append(row)
        return result
