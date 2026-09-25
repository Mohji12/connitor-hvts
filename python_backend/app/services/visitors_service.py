import re
from datetime import datetime, timedelta
from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist
from types import SimpleNamespace
from typing import Any

from fastapi import HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.models import Branch, User, Visit, Visitor
from app.models.enums import AppointmentMode, Role, VisitCategory, VisitStatus
from app.services.gcp_storage_service import GcpStorageService
from app.services.notifications_service import NotificationsService
from app.services.sales_meeting_dispatch import dispatch_sales_meeting_confirm_email
from app.services.sales_meeting_service import SalesMeetingService, apply_visitor_kind
from app.utils.serializers import model_to_dict

IMAGE_TYPES = re.compile(r"image/(jpeg|jpg|png|gif|webp)", re.I)
DOC_TYPES = re.compile(r"image/(jpeg|jpg|png|gif|webp)|application/pdf", re.I)


class VisitorsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.gcp = GcpStorageService()
        self.notifications = NotificationsService(db)

    def _queue_sales_meeting_confirm(self, visit: Visit, background_tasks: Any = None) -> None:
        token = SalesMeetingService(self.db).prepare_confirmation_after_check_in(visit)
        if not token:
            return
        if background_tasks is not None:
            background_tasks.add_task(dispatch_sales_meeting_confirm_email, visit.id, token)
            return
        import threading

        threading.Thread(
            target=dispatch_sales_meeting_confirm_email,
            args=(visit.id, token),
            daemon=True,
        ).start()

    def _validate_file(self, file: UploadFile, pattern: re.Pattern, field: str) -> None:
        if not file.content_type or not pattern.search(file.content_type):
            raise HTTPException(status_code=400, detail=f"Invalid file type for {field}")

    async def _upload_files(self, visitor_id: str, files: dict[str, UploadFile | None]) -> dict[str, str | None]:
        urls: dict[str, str | None] = {"photo": None, "governmentIdDocument": None, "officeIdDocument": None}
        mapping = {
            "photo": ("photo", IMAGE_TYPES),
            "governmentIdDocument": ("government-id", DOC_TYPES),
            "officeIdDocument": ("office-id", DOC_TYPES),
        }
        for key, (doc_type, pattern) in mapping.items():
            file = files.get(key)
            if file and file.filename:
                self._validate_file(file, pattern, key)
                urls[key] = await self.gcp.upload_visitor_document(file, visitor_id, doc_type)
        return urls

    def get_branch_info(self, branch_id: str) -> dict:
        branch = self.db.get(Branch, branch_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        staff = (
            self.db.query(User)
            .filter(User.branchId == branch_id, User.role == Role.STAFF.value, User.isActive == True)  # noqa: E712
            .order_by(User.name)
            .all()
        )
        return {
            "id": branch.id,
            "name": branch.name,
            "users": [
                {"id": s.id, "name": s.name, "email": s.email, "phone": s.phone, "department": s.department}
                for s in staff
            ],
        }

    def find_visitor_by_phone_and_branch(self, phone: str, branch_id: str) -> Visitor | None:
        return self.db.query(Visitor).filter(Visitor.phone == phone, Visitor.branchId == branch_id).first()

    def is_profile_complete_for_meeting(self, visitor: Visitor) -> bool:
        return bool(visitor.email and visitor.company and visitor.designation)

    async def public_register_visitor(self, branch_id: str, data: dict, files: dict[str, UploadFile | None]) -> dict:
        if not self.db.get(Branch, branch_id):
            raise HTTPException(status_code=404, detail="Branch not found")
        phone = data["phone"]
        if self.find_visitor_by_phone_and_branch(phone, branch_id):
            raise HTTPException(status_code=409, detail="A visitor with this phone number is already registered at this branch.")
        visitor = Visitor(**{k: v for k, v in data.items() if k != "phone"}, phone=phone, branchId=branch_id, photo="pending")
        self.db.add(visitor)
        self.db.commit()
        self.db.refresh(visitor)
        urls = await self._upload_files(visitor.id, files)
        for key, value in urls.items():
            if value:
                setattr(visitor, key, value)
        self.db.commit()
        return {"message": "Visitor registered successfully.", "visitor": model_to_dict(visitor)}

    async def register_visitor(self, data: dict, user: dict, files: dict[str, UploadFile | None]) -> dict:
        if user["role"] not in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            raise HTTPException(status_code=403, detail="Access denied")
        branch_id = data["branchId"]
        if branch_id != user.get("branchId"):
            raise HTTPException(status_code=400, detail="Invalid branch ID")
        return await self.public_register_visitor(branch_id, data, files)

    def _resolve_staff(self, branch_id: str, person_to_meet: str | None, staff_name: str | None, staff_phone: str | None):
        if person_to_meet == "other" and (not staff_name or not staff_phone):
            raise HTTPException(status_code=400, detail='When selecting "Other", both staff name and phone number are required.')
        if not person_to_meet and (not staff_name or not staff_phone):
            raise HTTPException(
                status_code=400,
                detail="You must provide either a staff member ID or select Other with staff name and phone.",
            )
        staff = None
        staff_id = None
        if person_to_meet and person_to_meet != "other":
            staff = (
                self.db.query(User)
                .filter(User.id == person_to_meet, User.branchId == branch_id, User.isActive == True)  # noqa: E712
                .first()
            )
            if not staff:
                raise HTTPException(status_code=404, detail="The selected staff member was not found at this branch.")
            staff_id = staff.id
        return staff, staff_id

    def public_create_visit_request(self, branch_id: str, data: dict) -> dict:
        if not self.db.get(Branch, branch_id):
            raise HTTPException(status_code=404, detail="Branch not found")
        visitor = self.find_visitor_by_phone_and_branch(data["phone"], branch_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found. Please register first.")
        staff, staff_id = self._resolve_staff(
            branch_id, data.get("personToMeet"), data.get("staffName"), data.get("staffPhone")
        )
        visit = Visit(
            purpose=data.get("purpose"),
            department=data.get("department"),
            status=VisitStatus.REQUEST_SENT.value,
            visitorId=visitor.id,
            branchId=branch_id,
            staffId=staff_id,
            staffName=data.get("staffName") or (staff.name if staff else None),
            staffPhone=data.get("staffPhone") or (staff.phone if staff else None),
            visitingCardPhoto=data.get("visitingCardPhoto"),
        )
        apply_visitor_kind(visit, data)
        self.db.add(visit)
        self.db.commit()
        self.db.refresh(visit)
        if staff:
            self.notifications.notify_staff_on_visit_request(visit, staff, visitor)
        notify_staff = staff or SimpleNamespace(name=data.get("staffName") or "Unknown Staff")
        self.notifications.notify_security_on_new_visit_request(visit, notify_staff, visitor)  # type: ignore[arg-type]
        return {"message": "Visit request created successfully. Pending staff approval.", "visitId": visit.id}

    def create_visit_request(self, data: dict, user: dict) -> dict:
        data = {**data, "branchId": user.get("branchId")}
        return self.public_create_visit_request(user.get("branchId") or "", data)

    def verify_code(self, visit_code: str, user: dict, background_tasks: Any = None) -> dict:
        if user["role"] not in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            raise HTTPException(status_code=403, detail="Access denied")
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.staff), joinedload(Visit.visitor), joinedload(Visit.bookedSlot))
            .filter(
                (Visit.visitCode == visit_code) | (Visit.visitQRCode == visit_code),
                Visit.branchId == user.get("branchId"),
                Visit.status == VisitStatus.APPROVED.value,
            )
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Invalid or expired visit code.")
        if not visit.isCodeUsed:
            raise HTTPException(status_code=400, detail="Visit code has already been used or is not valid for check-in.")
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        clock = VisitSlotExtensionService(self.db)
        clock.assert_ready_for_check_in(visit)
        visit.status = VisitStatus.CHECKED_IN.value
        visit.checkInTime = now_ist()
        visit.checkedInById = user["id"]
        visit.checkedInLocation = user.get("location")
        visit.isCodeUsed = False
        clock.start_clock(visit)
        self.db.commit()
        if visit.staff and visit.visitor:
            self.notifications.notify_staff_on_check_in(visit, visit.staff, visit.visitor)
        self._queue_sales_meeting_confirm(visit, background_tasks)
        return {"message": "Visitor checked in successfully.", "visit": model_to_dict(visit)}

    def check_in_visitor(self, visit_id: str, user: dict, background_tasks: Any = None) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff), joinedload(Visit.bookedSlot))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="VISIT_NOT_FOUND")
        if visit.branchId != user.get("branchId"):
            raise HTTPException(status_code=403, detail="FORBIDDEN_BRANCH")
        if visit.appointmentMode == AppointmentMode.ONLINE.value:
            raise HTTPException(
                status_code=400,
                detail="This is an online appointment. Physical check-in is not required.",
            )
        if visit.status != VisitStatus.APPROVED.value:
            if visit.status == VisitStatus.CHECKED_IN.value:
                raise HTTPException(status_code=400, detail="ALREADY_CHECKED_IN")
            raise HTTPException(status_code=400, detail="VISIT_NOT_APPROVED")
        if (
            visit.appointmentDate
            and not visit.idProofVerified
            and visit.visitSubType != "URGENT_PASSCODE"
        ):
            raise HTTPException(status_code=400, detail="ID_PROOF_NOT_VERIFIED")
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        clock = VisitSlotExtensionService(self.db)
        clock.assert_ready_for_check_in(visit)
        visit.status = VisitStatus.CHECKED_IN.value
        visit.checkInTime = now_ist()
        visit.checkedInById = user["id"]
        visit.checkedInLocation = user.get("location")
        visit.isCodeUsed = False
        clock.start_clock(visit)
        self.db.commit()
        if visit.staff and visit.visitor:
            if visit.appointmentDate:
                self.notifications.notify_doctor_patient_arrived(visit, visit.staff, visit.visitor)
                self.notifications.notify_admins_on_check_in(visit, visit.visitor, visit.staff)
                self.notifications.notify_visitor_checked_in(visit, visit.visitor, visit.staff)
            else:
                self.notifications.notify_staff_on_check_in(visit, visit.staff, visit.visitor)
                self.notifications.notify_visitor_checked_in(visit, visit.visitor, visit.staff)
        self._queue_sales_meeting_confirm(visit, background_tasks)
        return {
            "success": True,
            "message": "Visitor checked in successfully.",
            "visitId": visit.id,
            "checkInTime": visit.checkInTime,
            "visitor": {"id": visit.visitor.id, "firstName": visit.visitor.firstName, "lastName": visit.visitor.lastName},
            "visitorPassId": visit.visitorPassId,
            "expectedEndTime": visit.expectedEndTime.isoformat() if visit.expectedEndTime else None,
            "allottedMinutes": visit.allottedMinutes,
        }

    def checkout(self, visit_id: str, user: dict) -> dict:
        if user["role"] not in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            raise HTTPException(status_code=403, detail="Access denied")
        visit = (
            self.db.query(Visit)
            .filter(Visit.id == visit_id, Visit.branchId == user.get("branchId"), Visit.status == VisitStatus.CHECKED_IN.value)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Active visit not found")
        check_out = now_ist()
        duration = None
        if visit.checkInTime:
            duration = int((check_out - visit.checkInTime).total_seconds() / 60)
        visit.status = VisitStatus.CHECKED_OUT.value
        visit.checkOutTime = check_out
        visit.visitCode = None
        visit.checkedOutById = user["id"]
        visit.durationMinutes = duration
        visit.totalDurationMinutes = duration
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        VisitSlotExtensionService(self.db).cancel_tokens(visit)
        self.db.commit()
        visit_loaded = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if visit_loaded and visit_loaded.visitor:
            self.notifications.notify_admins_on_check_out(
                visit_loaded, visit_loaded.visitor, visit_loaded.staff, duration
            )
            self.notifications.notify_visitor_checked_out(
                visit_loaded, visit_loaded.visitor, visit_loaded.staff, duration
            )
        return {"success": True, "durationMinutes": duration, "totalDurationMinutes": duration}

    def list_active(self, user: dict) -> list[dict]:
        if user["role"] not in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            raise HTTPException(status_code=403, detail="Access denied")
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor))
            .filter(Visit.branchId == user.get("branchId"), Visit.status == VisitStatus.CHECKED_IN.value)
            .all()
        )
        return [model_to_dict(v) for v in visits]

    def _summary_row(self, visit: Visit) -> dict:
        visitor = visit.visitor
        middle = f" {visitor.middleName}" if visitor and visitor.middleName else ""
        visitor_name = (
            f"{visitor.firstName}{middle} {visitor.lastName}".strip() if visitor else "Unknown Visitor"
        )
        person = (visit.staff.name if visit.staff else visit.staffName) or "N/A"
        purpose = visit.purpose or visit.deliveryPlatform or "Visit"
        return {
            "id": visit.id,
            "visitorName": visitor_name,
            "visitorPhone": visitor.phone if visitor else "",
            "personToMeet": person,
            "purpose": purpose,
            "visitorPhoto": visitor.photo if visitor else None,
            "status": visit.status,
            "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
            "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
            "createdAt": visit.createdAt.isoformat() if visit.createdAt else now_ist().isoformat(),
            "checkedInBy": visit.checkedInById,
            "checkedInLocation": visit.checkedInLocation,
            "checkedOutLocation": visit.checkedOutLocation,
            "checkedOutBy": visit.checkedOutById,
            "visitorEmail": visitor.email if visitor else None,
            "visitorAddress": visitor.address if visitor else None,
            "rejectionReason": visit.rejectionReason,
            "visitCode": visit.visitCode,
            "visitQRCode": visit.visitQRCode,
        }

    def summary(self, query: dict, user: dict) -> dict:
        if user["role"] not in (
            Role.SECURITY_SUPERVISOR.value,
            Role.BRANCH_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
            Role.SECURITY.value,
        ):
            raise HTTPException(status_code=403, detail="Access denied")
        q = self.db.query(Visit).options(joinedload(Visit.visitor), joinedload(Visit.staff))
        if user["role"] != Role.SUPER_ADMIN.value:
            q = q.filter(Visit.branchId == user.get("branchId"))
        if query.get("status"):
            q = q.filter(Visit.status == query["status"])
        date_value = query.get("date")
        if isinstance(date_value, str) and date_value.strip():
            day = datetime.strptime(date_value.strip()[:10], "%Y-%m-%d")
            start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            q = q.filter(
                or_(
                    (Visit.appointmentDate >= start) & (Visit.appointmentDate < end),
                    (Visit.appointmentDate.is_(None))
                    & (Visit.createdAt >= start)
                    & (Visit.createdAt < end),
                )
            )
        search = (query.get("search") or "").strip()
        if search:
            like = f"%{search}%"
            q = q.join(Visit.visitor).outerjoin(User, Visit.staffId == User.id).filter(
                or_(
                    Visitor.firstName.ilike(like),
                    Visitor.lastName.ilike(like),
                    Visitor.phone.like(like),
                    User.name.ilike(like),
                )
            )
        person_to_meet = query.get("personToMeet")
        if person_to_meet not in (None, "", 0):
            q = q.filter(Visit.staffId == str(person_to_meet))
        limit = int(query.get("limit") or query.get("take") or 500)
        if limit < 1:
            limit = 500
        page = int(query.get("page") or 1)
        if page < 1:
            page = 1
        skip = int(query.get("skip") if query.get("skip") is not None else (page - 1) * limit)
        if query.get("skip") is not None and query.get("page") is None:
            page = skip // limit + 1 if limit else 1
        total = q.count()
        visits = q.order_by(Visit.createdAt.desc()).offset(skip).limit(limit).all()
        return {
            "data": [self._summary_row(v) for v in visits],
            "total": total,
            "page": page,
            "limit": limit,
        }

    async def update_visitor(self, visitor_id: str, data: dict, user: dict, files: dict[str, UploadFile | None]) -> dict:
        if user["role"] not in (Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            raise HTTPException(status_code=403, detail="Access denied")
        visitor = self.db.get(Visitor, visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        urls = await self._upload_files(visitor_id, files)
        for key, value in data.items():
            if value is not None and key != "phone":
                setattr(visitor, key, value)
        for key, value in urls.items():
            if value:
                setattr(visitor, key, value)
        self.db.commit()
        return {"message": "Visitor updated successfully.", "visitor": model_to_dict(visitor)}

    async def public_update_visitor(
        self, visitor_id: str, branch_id: str, data: dict, files: dict[str, UploadFile | None]
    ) -> dict:
        visitor = self.db.get(Visitor, visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        if visitor.branchId != branch_id:
            raise HTTPException(status_code=403, detail="Visitor does not belong to this branch")
        return await self.update_visitor(visitor_id, data, {"role": Role.SECURITY.value, "branchId": branch_id}, files)

    def quick_register_visitor(self, branch_id: str, data: dict) -> dict:
        if self.find_visitor_by_phone_and_branch(data["phone"], branch_id):
            raise HTTPException(status_code=409, detail="Visitor with this phone number already exists in this branch.")
        visitor = Visitor(
            phone=data["phone"],
            firstName=data["firstName"],
            lastName=data["lastName"],
            branchId=branch_id,
        )
        self.db.add(visitor)
        self.db.commit()
        return {
            "message": "Visitor registered successfully.",
            "visitor": model_to_dict(visitor),
            "isProfileCompleteForMeeting": False,
        }

    async def complete_profile(
        self, visitor_id: str, branch_id: str, data: dict, files: dict[str, UploadFile | None]
    ) -> dict:
        visitor = self.db.get(Visitor, visitor_id)
        if not visitor or visitor.branchId != branch_id:
            raise HTTPException(status_code=404, detail="Visitor not found")
        urls = await self._upload_files(visitor_id, files)
        for field in (
            "email",
            "company",
            "designation",
            "middleName",
            "alternatePhone",
            "alternateEmail",
            "companyWebsite",
            "address",
            "reportingManagerName",
            "reportingManagerPhone",
        ):
            if data.get(field) is not None:
                setattr(visitor, field, data[field])
        for key, value in urls.items():
            if value:
                setattr(visitor, key, value)
        self.db.commit()
        return {
            "message": "Profile completed successfully.",
            "visitor": model_to_dict(visitor),
            "isProfileCompleteForMeeting": True,
        }

    def create_delivery_visit(self, branch_id: str, data: dict) -> dict:
        visitor = self.find_visitor_by_phone_and_branch(data["phone"], branch_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found. Please register first.")
        visit = Visit(
            visitCategory=VisitCategory.DELIVERY.value,
            visitSubType=data.get("visitSubType"),
            deliveryPlatform=data.get("deliveryPlatform"),
            deliveryRecipient=data.get("deliveryRecipient"),
            orderReference=data.get("orderReference"),
            status=VisitStatus.REQUEST_SENT.value,
            visitorId=visitor.id,
            branchId=branch_id,
        )
        self.db.add(visit)
        self.db.commit()
        self.db.refresh(visit)
        self.notifications.notify_security_on_delivery_visit(visit, visitor)
        return {"message": "Delivery visit created. Pending security review.", "visit": model_to_dict(visit)}

    def create_meeting_visit_request(self, branch_id: str, data: dict) -> dict:
        visitor = self.find_visitor_by_phone_and_branch(data["phone"], branch_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found.")
        if not self.is_profile_complete_for_meeting(visitor):
            raise HTTPException(status_code=400, detail="Visitor profile is incomplete for meeting visits.")
        staff, staff_id = self._resolve_staff(
            branch_id, data.get("personToMeet"), data.get("staffName"), data.get("staffPhone")
        )
        visit = Visit(
            visitCategory=VisitCategory.MEETING.value,
            visitSubType=data.get("visitSubType"),
            purpose=data.get("purpose"),
            department=data.get("department"),
            status=VisitStatus.REQUEST_SENT.value,
            visitorId=visitor.id,
            branchId=branch_id,
            staffId=staff_id,
            staffName=data.get("staffName") or (staff.name if staff else None),
            staffPhone=data.get("staffPhone") or (staff.phone if staff else None),
            visitingCardPhoto=data.get("visitingCardPhoto"),
        )
        apply_visitor_kind(visit, data)
        self.db.add(visit)
        self.db.commit()
        if staff:
            self.notifications.notify_staff_on_visit_request(visit, staff, visitor)
        return {"message": "Visit request created successfully. Pending staff approval.", "visitId": visit.id}

    async def register_public_visitor(self, data: dict, files: dict[str, UploadFile | None]) -> dict:
        """Simplified post-verification registration flow."""
        branch_id = data["branchId"]
        visitor = self.find_visitor_by_phone_and_branch(data["phone"], branch_id)
        if not visitor or not visitor.phoneVerified:
            raise HTTPException(status_code=404, detail="VISITOR_NOT_FOUND. Please complete phone verification first.")
        for field in ("firstName", "lastName", "email", "company", "designation", "purpose"):
            if data.get(field):
                setattr(visitor, field, data[field])

        photo_file = files.get("photo")
        if photo_file and photo_file.filename:
            self._validate_file(photo_file, IMAGE_TYPES, "photo")
            visitor.photo = await self.gcp.upload_visitor_document(photo_file, visitor.id, "photo")

        self.db.commit()
        visit = Visit(
            visitCategory=data.get("visitCategory", VisitCategory.MEETING.value),
            visitSubType=data.get("visitSubType"),
            purpose=data.get("purpose"),
            department=data.get("department"),
            deliveryPlatform=data.get("deliveryPlatform"),
            deliveryRecipient=data.get("deliveryRecipient"),
            orderReference=data.get("orderReference"),
            status=VisitStatus.REQUEST_SENT.value,
            visitorId=visitor.id,
            branchId=branch_id,
            staffId=data.get("staffId"),
            staffName=data.get("staffName"),
            staffPhone=data.get("staffPhone"),
        )
        if data.get("visitCategory", VisitCategory.MEETING.value) != VisitCategory.DELIVERY.value:
            apply_visitor_kind(visit, data)
        self.db.add(visit)
        self.db.commit()
        self.db.refresh(visit)

        if visit.visitCategory == VisitCategory.DELIVERY.value:
            self.notifications.notify_security_on_delivery_visit(visit, visitor)
            try:
                from app.config import get_settings
                from app.models.delivery_entities import VisitDeliveryLink

                if get_settings().delivery_module_enabled:
                    self.db.add(VisitDeliveryLink(visitId=visit.id))
                    self.db.commit()
            except Exception:
                pass
        elif visit.staffId:
            staff = self.db.get(User, visit.staffId)
            if staff:
                self.notifications.notify_staff_on_visit_request(visit, staff, visitor)

        return {
            "success": True,
            "message": "Visit request submitted successfully. Please wait for approval.",
            "visitId": visit.id,
            "visitStatus": visit.status,
            "visitorId": visitor.id,
            "visitorName": f"{visitor.firstName} {visitor.lastName}",
        }

    def _mask_phone(self, phone: str) -> str:
        if len(phone) == 10:
            return phone[:3] + "***" + phone[6:]
        return phone[:2] + "***" + phone[-2:]

    def get_visit_status_public(self, visit_id: str) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.branch), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="VISIT_NOT_FOUND")
        settings = get_settings()
        photo = visit.visitor.photo
        if photo and not photo.startswith("http") and settings.gcp_public_url:
            photo = f"{settings.gcp_public_url}/photos/{photo}"
        base: dict[str, Any] = {
            "visitId": visit.id,
            "status": visit.status,
            "visitor": {
                "id": visit.visitor.id,
                "firstName": visit.visitor.firstName,
                "lastName": visit.visitor.lastName,
                "fullName": f"{visit.visitor.firstName} {visit.visitor.lastName}",
                "phone": self._mask_phone(visit.visitor.phone),
                "photoUrl": photo,
            },
            "visitCategory": visit.visitCategory,
            "submittedAt": visit.createdAt.isoformat(),
            "branch": {
                "id": visit.branch.id,
                "name": visit.branch.name,
                "address": ", ".join(
                    p
                    for p in [visit.branch.street, visit.branch.city, visit.branch.state, visit.branch.pinCode]
                    if p
                ),
            },
            "gatePass": None,
        }
        if visit.visitCategory == "MEETING":
            base["meetingDetails"] = {
                "purpose": visit.purpose,
                "department": visit.department,
                "staffName": visit.staffName,
                "staffPhone": self._mask_phone(visit.staffPhone) if visit.staffPhone else None,
            }
        elif visit.visitCategory == "DELIVERY":
            base["deliveryDetails"] = {
                "platform": visit.deliveryPlatform,
                "recipient": visit.deliveryRecipient,
                "orderReference": visit.orderReference,
            }
        if visit.status == VisitStatus.APPROVED.value:
            base["approvedAt"] = visit.updatedAt.isoformat()
            base["gatePass"] = {
                "checkInOtp": visit.checkInOtp,
                "validUntil": visit.checkInOtpExpiry.isoformat() if visit.checkInOtpExpiry else None,
                "gatePassUrl": visit.visitQRCode,
                "checkInQrCode": visit.visitQRCode,
                "generatedAt": visit.gatePassGeneratedAt.isoformat() if visit.gatePassGeneratedAt else None,
                "sentViaWhatsApp": visit.gatePassSentViaWhatsApp,
            }
        elif visit.status == VisitStatus.REJECTED.value:
            base["rejectedAt"] = visit.updatedAt.isoformat()
            base["rejectionReason"] = visit.rejectionReason
        return {"success": True, "data": base}

    def get_visitor_for_phone_verification(self, visitor_id: str) -> dict | None:
        visitor = self.db.get(Visitor, visitor_id)
        if not visitor:
            return None
        return {
            "id": visitor.id,
            "firstName": visitor.firstName,
            "middleName": visitor.middleName,
            "lastName": visitor.lastName,
            "phone": visitor.phone,
            "email": visitor.email,
            "company": visitor.company,
            "designation": visitor.designation,
            "phoneVerified": visitor.phoneVerified,
        }

    def get_gate_pass_public(self, visit_id: str) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.branch))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="GATE_PASS_NOT_FOUND")
        if visit.status not in (VisitStatus.APPROVED.value, VisitStatus.CHECKED_IN.value):
            raise HTTPException(status_code=404, detail="Gate pass not available for this visit status")
        return {
            "success": True,
            "data": {
                "visitId": visit.id,
                "gatePassUrl": visit.visitQRCode,
                "checkInOtp": visit.checkInOtp,
                "validUntil": visit.checkInOtpExpiry.isoformat() if visit.checkInOtpExpiry else None,
                "visitorName": f"{visit.visitor.firstName} {visit.visitor.lastName}",
                "branchName": visit.branch.name if visit.branch else None,
            },
        }

    def download_visitor_document(self, visitor_id: str, document_type: str, user: dict) -> dict:
        visitor = self.db.get(Visitor, visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        field_map = {
            "photo": visitor.photo,
            "government-id": visitor.governmentIdDocument,
            "office-id": visitor.officeIdDocument,
        }
        url = field_map.get(document_type)
        if not url:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"url": url}
