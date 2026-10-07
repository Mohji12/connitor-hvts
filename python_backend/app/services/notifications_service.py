from app.utils.timezone import format_ist_datetime, now_ist

import logging
import random

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Branch,
    Department,
    Notification,
    SubDepartment,
    User,
    Visit,
    Visitor,
    VisitorAccount,
)
from app.models.enums import AppointmentMode, Role
from app.services.calendar_service import AppointmentCalendarDetails, CalendarService
from app.services.livekit_service import meeting_host_url, meeting_join_url
from app.services.messaging_service import EmailService, SmsService, WhatsAppService

logger = logging.getLogger(__name__)


class NotificationsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()
        self.sms = SmsService()
        self.whatsapp = WhatsAppService()
        self.calendar = CalendarService()

    def _branch_address(self, branch: Branch) -> str:
        return ", ".join(
            part
            for part in (
                branch.street,
                branch.city,
                branch.state,
                branch.pinCode,
                branch.country,
            )
            if part
        )

    def _calendar_details(
        self,
        visit: Visit,
        doctor: User,
        visitor: Visitor,
        *,
        branch: Branch | None = None,
        department: Department | None = None,
        sub_department: SubDepartment | None = None,
        status: str,
        sequence: int = 0,
    ) -> AppointmentCalendarDetails | None:
        if not visitor.email or not visit.appointmentDate:
            return None

        if branch is None:
            branch = self.db.get(Branch, visit.branchId)
        if department is None and visit.departmentId:
            department = self.db.get(Department, visit.departmentId)
        if sub_department is None and visit.subDepartmentId:
            sub_department = self.db.get(SubDepartment, visit.subDepartmentId)

        if not branch:
            return None

        return AppointmentCalendarDetails(
            visit_id=visit.id,
            visitor_email=visitor.email,
            visitor_name=self._visitor_name(visitor),
            doctor_name=doctor.name,
            hospital_name=branch.name,
            hospital_address=self._branch_address(branch),
            department_name=department.name if department else None,
            sub_department_name=sub_department.name if sub_department else None,
            appointment_date=visit.appointmentDate,
            purpose=visit.purpose,
            status=status,  # type: ignore[arg-type]
            sequence=sequence,
            appointment_mode=visit.appointmentMode or AppointmentMode.IN_PERSON.value,
            meeting_join_url=meeting_join_url(visit) if self._is_online(visit) else None,
        )

    def _send_calendar_invite(
        self,
        visit: Visit,
        doctor: User,
        visitor: Visitor,
        *,
        branch: Branch | None = None,
        department: Department | None = None,
        sub_department: SubDepartment | None = None,
        status: str,
        sequence: int = 0,
    ) -> None:
        details = self._calendar_details(
            visit,
            doctor,
            visitor,
            branch=branch,
            department=department,
            sub_department=sub_department,
            status=status,
            sequence=sequence,
        )
        if not details:
            return
        try:
            self.calendar.send_appointment_calendar_invite(details, email_service=self.email)
        except Exception as exc:
            logger.error("Calendar invite failed for visit %s: %s", visit.id, exc)

    def _visitor_name(self, visitor: Visitor) -> str:
        middle = f" {visitor.middleName}" if visitor.middleName else ""
        return f"{visitor.firstName}{middle} {visitor.lastName}".strip()

    def _visitor_phone(self, visitor: Visitor) -> str:
        """Visitor mobile, falling back to the signed-in account number."""
        phone = (visitor.phone or "").strip()
        if phone:
            return phone
        account_id = getattr(visitor, "visitorAccountId", None)
        if not account_id:
            return ""
        account = self.db.get(VisitorAccount, account_id)
        if account is None:
            return ""
        return (account.phone or "").strip()

    def _add_notification(self, recipient_id: str, visit_id: str, message: str) -> None:
        self.db.add(Notification(recipientId=recipient_id, visitId=visit_id, message=message))

    def _email_user(self, user: User, subject: str, message: str) -> None:
        """Prefer WhatsApp/SMS; email only when EMAIL_NOTIFICATIONS_ENABLED=true."""
        body = f"{subject}\n\n{message}"
        if user.phone:
            try:
                self.sms.send_message(user.phone, body)
            except Exception as exc:
                logger.error("Failed to WhatsApp/SMS user %s: %s", user.phone, exc)
        if get_settings().email_notifications_enabled and user.email:
            try:
                self.email.send_notification(user.email, subject, message)
            except Exception as exc:
                logger.error("Failed to email user %s: %s", user.email, exc)

    def _email_users(self, users: list[User], subject: str, message: str) -> None:
        seen_phones: set[str] = set()
        seen_emails: set[str] = set()
        for user in users:
            if user.phone and user.phone not in seen_phones:
                seen_phones.add(user.phone)
                try:
                    self.sms.send_message(user.phone, f"{subject}\n\n{message}")
                except Exception as exc:
                    logger.error("Failed to WhatsApp/SMS user %s: %s", user.phone, exc)
            if (
                get_settings().email_notifications_enabled
                and user.email
                and user.email not in seen_emails
            ):
                seen_emails.add(user.email)
                self._email_user_email_only(user, subject, message)

    def _email_user_email_only(self, user: User, subject: str, message: str) -> None:
        if user.email:
            try:
                self.email.send_notification(user.email, subject, message)
            except Exception as exc:
                logger.error("Failed to email user %s: %s", user.email, exc)

    def _doctor_display_name(self, staff: User) -> str:
        name = (staff.name or "Doctor").strip()
        lowered = name.lower()
        if lowered.startswith("dr."):
            name = name[3:].strip()
        elif lowered.startswith("dr "):
            name = name[3:].strip()
        return name or "Doctor"

    def _visitor_type_label(self, visit: Visit) -> str:
        kind = (visit.visitorType or "GENERAL").upper()
        labels = {
            "GENERAL": "General",
            "SALES_REPRESENTATIVE": "Sales Representative",
            "VENDOR": "Vendor",
        }
        return labels.get(kind, "General")

    def _organization_for_doctor_template(self, visit: Visit) -> str:
        """Sales representatives include the company. Other visit types leave it blank."""
        if (visit.visitorType or "").upper() != "SALES_REPRESENTATIVE":
            return "—"
        return (visit.companyName or "").strip() or "—"

    def _department_name(self, visit: Visit) -> str:
        if visit.departmentId:
            department = self.db.get(Department, visit.departmentId)
            if department and department.name:
                return department.name
        if visit.department:
            return str(visit.department).replace("_", " ").title()
        return "—"

    def _appointment_date_and_time(self, visit: Visit) -> tuple[str, str]:
        if not visit.appointmentDate or self._is_open_slot_request(visit):
            return "To be decided", "—"
        return visit.appointmentDate.strftime("%d %b %Y"), visit.appointmentDate.strftime("%I:%M %p")

    def _format_appt(self, visit: Visit) -> str:
        if not visit.appointmentDate:
            return "scheduled time"
        purpose = (visit.purpose or "").upper()
        is_open = purpose.startswith("[CUSTOM SLOT]") and (
            visit.appointmentDate.hour == 0 and visit.appointmentDate.minute == 0
        )
        if is_open:
            return "to be decided by the doctor"
        return format_ist_datetime(visit.appointmentDate)

    def _is_open_slot_request(self, visit: Visit) -> bool:
        purpose = (visit.purpose or "").upper()
        return purpose.startswith("[CUSTOM SLOT]") and bool(
            visit.appointmentDate
            and visit.appointmentDate.hour == 0
            and visit.appointmentDate.minute == 0
        )

    def _meeting_mode_label(self, visit: Visit) -> str:
        return "Online" if self._is_online(visit) else "Offline"

    def _sms_user(self, user: User, message: str) -> None:
        if user.phone:
            try:
                self.sms.send_message(user.phone, message)
            except Exception as exc:
                logger.error("Failed to SMS user %s: %s", user.phone, exc)

    def _sms_users(self, users: list[User], message: str) -> None:
        seen: set[str] = set()
        for user in users:
            if user.phone and user.phone not in seen:
                seen.add(user.phone)
                self._sms_user(user, message)

    def _email_visitor(self, visitor: Visitor, subject: str, message: str) -> None:
        body = f"{subject}\n\n{message}"
        if visitor.phone:
            try:
                self.sms.send_message(visitor.phone, body)
            except Exception as exc:
                logger.error("Failed to WhatsApp/SMS visitor %s: %s", visitor.phone, exc)
        if get_settings().email_notifications_enabled and visitor.email:
            try:
                self.email.send_notification(visitor.email, subject, message)
            except Exception as exc:
                logger.error("Failed to email visitor %s: %s", visitor.email, exc)

    def _is_online(self, visit: Visit) -> bool:
        return visit.appointmentMode == AppointmentMode.ONLINE.value

    def notify_visitor_booking_received(
        self,
        visit: Visit,
        doctor: User,
        visitor: Visitor,
        *,
        branch: Branch | None = None,
        department: Department | None = None,
        sub_department: SubDepartment | None = None,
    ) -> None:
        appt = self._format_appt(visit)
        name = self._visitor_name(visitor)
        is_open = self._is_open_slot_request(visit)
        if branch is None:
            branch = self.db.get(Branch, visit.branchId)
        hospital_name = branch.name if branch else "the hospital"
        dept_name = department.name if department else None
        if not dept_name and visit.departmentId:
            dept = self.db.get(Department, visit.departmentId)
            dept_name = dept.name if dept else None

        if not is_open:
            self._send_calendar_invite(
                visit,
                doctor,
                visitor,
                branch=branch,
                department=department,
                sub_department=sub_department,
                status="tentative",
                sequence=0,
            )

        visitor_purpose = visit.purpose or ""
        if visitor_purpose.upper().startswith("[CUSTOM SLOT]"):
            visitor_purpose = visitor_purpose[len("[CUSTOM SLOT]") :].strip()

        if visitor.email:
            try:
                self.email.send_booking_confirmation_email(
                    visitor.email,
                    visitor_name=name,
                    doctor_name=doctor.name,
                    appointment_date=appt,
                    hospital_name=hospital_name,
                    booking_id=visit.id,
                    department_name=dept_name,
                    purpose=visitor_purpose or None,
                    appointment_mode=visit.appointmentMode or AppointmentMode.IN_PERSON.value,
                )
            except Exception as exc:
                logger.error("Failed to send booking confirmation email to %s: %s", visitor.email, exc)

        if is_open:
            if visitor.phone:
                try:
                    self.sms.send_message(
                        visitor.phone,
                        (
                            f"Conninter: Visit slot request received at {hospital_name} with "
                            f"Dr. {doctor.name}. Doctor will decide the time. Booking ID: {visit.id}"
                        ),
                    )
                except Exception as exc:
                    logger.error("Failed to WhatsApp open-slot booking to %s: %s", visitor.phone, exc)
            return

        if self._is_online(visit):
            sms_text = (
                f"Conninter: Online appointment request at {hospital_name} with Dr. {doctor.name} "
                f"for {appt}. Awaiting approval. Booking ID: {visit.id}. "
                "Your video link will be sent once approved."
            )
        else:
            sms_text = (
                f"Conninter: Appointment request at {hospital_name} with Dr. {doctor.name} "
                f"for {appt}. Awaiting approval. Booking ID: {visit.id}. "
                "You will receive check-in details on WhatsApp once approved."
            )
        if visitor.phone:
            self.sms.send_message(visitor.phone, sms_text)

    def _ensure_sms_approval_code(self, visit: Visit) -> str:
        if visit.smsApprovalCode:
            return visit.smsApprovalCode
        code = f"{random.randint(100000, 999999)}"
        visit.smsApprovalCode = code
        return code

    def notify_staff_on_visit_request(self, visit: Visit, staff: User, visitor: Visitor) -> None:
        from app.services.visit_approval_link_service import VisitApprovalLinkService

        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        purpose = (visit.purpose or "").strip() or "Not specified"
        is_custom = purpose.upper().startswith("[CUSTOM SLOT]")
        is_open = self._is_open_slot_request(visit)
        if is_custom:
            purpose = purpose[len("[CUSTOM SLOT]") :].strip() or "Visit requested"
        carrying = getattr(visit, "itemsCarrying", None)
        carrying_text = carrying.strip() if isinstance(carrying, str) and carrying.strip() else ""
        purpose_note = f"{purpose}. Carrying: {carrying_text}" if carrying_text else purpose
        self._ensure_sms_approval_code(visit)
        _token, approval_url, reschedule_url = VisitApprovalLinkService(self.db).create_link(visit)
        if is_open:
            dashboard_message = (
                f"Visit slot request from {name}. Date and time to be decided by the doctor. "
                f"Purpose: {purpose_note}. Approval link sent by WhatsApp/SMS."
            )
        else:
            dashboard_message = (
                f"{'Custom slot request' if is_custom else 'New appointment'} from {name} on {appt} "
                f"({self._meeting_mode_label(visit)}). "
                f"Purpose: {purpose_note}. "
                "Approval link sent to doctor via WhatsApp/SMS."
            )
        self._add_notification(staff.id, visit.id, dashboard_message)

        if get_settings().email_notifications_enabled and staff.email:
            try:
                self.email.send_doctor_approval_request_email(
                    staff.email,
                    doctor_name=staff.name or "Doctor",
                    visitor_name=name,
                    appointment_date=appt,
                    purpose=purpose_note,
                    approval_url=approval_url,
                    open_slot_request=is_open,
                    meeting_mode=self._meeting_mode_label(visit),
                )
            except Exception as exc:
                logger.error(
                    "Failed to email doctor approval link to %s: %s", staff.email, exc
                )
        elif not staff.phone:
            logger.warning(
                "Doctor %s has no phone — cannot send approval link by WhatsApp (visit %s)",
                staff.id,
                visit.id,
            )

        from app.config import is_wapblaster_configured

        settings = get_settings()
        # WhatsApp is primary for doctor approval when email is off, or when WA is explicitly enabled.
        send_doctor_whatsapp = bool(staff.phone) and (
            settings.doctor_approval_whatsapp_enabled
            or not settings.email_notifications_enabled
        )
        if send_doctor_whatsapp and staff.phone:
            mode_label = self._meeting_mode_label(visit)
            if is_open:
                sms_message = (
                    f"Conninter: {name} wants a visiting slot. Purpose: {purpose_note}. "
                    f"Approve or decline: {approval_url}"
                )
            else:
                sms_message = (
                    f"Conninter: {'Visit slot request' if is_custom else 'New appointment'} from {name} "
                    f"on {appt} ({mode_label}). Purpose: {purpose_note}. Approve or decline: {approval_url}"
                )
            try:
                if is_wapblaster_configured(settings) and settings.whatsapp_provider == "wapblaster":
                    requested_date, requested_time = self._appointment_date_and_time(visit)
                    self.whatsapp.send_appointment_approval_buttons(
                        staff.phone,
                        visitor_name=name,
                        appointment_label=appt if not is_open else "Open slot (doctor to schedule)",
                        approval_code=visit.smsApprovalCode or "",
                        purpose=purpose,
                        items_carrying=carrying_text,
                        approval_url=approval_url,
                        reschedule_url=reschedule_url,
                        doctor_name=self._doctor_display_name(staff),
                        organization=self._organization_for_doctor_template(visit),
                        visitor_type=self._visitor_type_label(visit),
                        department=self._department_name(visit),
                        requested_date=requested_date,
                        requested_time=requested_time,
                        visit_id=visit.smsApprovalCode or visit.id,
                    )
                else:
                    self.sms.send_message(staff.phone, sms_message)
            except Exception as exc:
                logger.error("Failed to notify doctor %s by WhatsApp/SMS: %s", staff.phone, exc)
        self.db.commit()

    def notify_security_on_delivery_visit(self, visit: Visit, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        platform = visit.deliveryPlatform or "Delivery"
        recipient = visit.deliveryRecipient or "staff"
        message = (
            f"New delivery visit from {name} ({platform}) for {recipient}. "
            "Pending security approval."
        )
        security_users = self._security_users(visit.branchId)
        for security in security_users:
            self._add_notification(security.id, visit.id, message)
        self._email_users(security_users, "New Delivery Visit — Pending Approval", message)
        self._sms_users(
            security_users,
            f"Connitor: Delivery from {name} ({platform}). Pending security approval.",
        )
        self.db.commit()

    def notify_security_on_new_visit_request(self, visit: Visit, staff: User, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        mode_hint = " (online — no physical check-in)" if self._is_online(visit) else ""
        message = (
            f"New appointment from {name} with Dr. {staff.name} on {appt}{mode_hint}. "
            "Pending doctor approval."
        )
        security_users = self._security_users(visit.branchId)
        for security in security_users:
            self._add_notification(security.id, visit.id, message)
        self._email_users(security_users, "New Appointment — Pending Approval", message)
        self._sms_users(
            security_users,
            f"Connitor: New visitor {name} with Dr. {staff.name} on {appt}. Pending doctor approval.",
        )
        self.db.commit()

    def notify_admins_on_doctor_approval(self, visit: Visit, doctor: User, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        online_hint = " Online appointment — no physical check-in required." if self._is_online(visit) else ""
        msg = f"Appointment approved: {name} with Dr. {doctor.name} on {self._format_appt(visit)}.{online_hint}"
        email_subject = "Appointment Approved by Doctor"
        recipients: list[User] = []

        super_admins = (
            self.db.query(User)
            .filter(User.role == Role.SUPER_ADMIN.value, User.isActive == True)  # noqa: E712
            .all()
        )
        for admin in super_admins:
            self._add_notification(admin.id, visit.id, msg)
            recipients.append(admin)

        for admin in self._hospital_admins_for_branch(visit.branchId):
            self._add_notification(admin.id, visit.id, msg)
            recipients.append(admin)

        if visit.departmentId:
            dept_admins = (
                self.db.query(User)
                .filter(
                    User.role == Role.DEPARTMENT_ADMIN.value,
                    User.departmentId == visit.departmentId,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            )
            for admin in dept_admins:
                self._add_notification(admin.id, visit.id, msg)
                recipients.append(admin)

        if visit.subDepartmentId:
            sub_admins = (
                self.db.query(User)
                .filter(
                    User.role == Role.SUB_DEPARTMENT_ADMIN.value,
                    User.subDepartmentId == visit.subDepartmentId,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            )
            for admin in sub_admins:
                self._add_notification(admin.id, visit.id, msg)
                recipients.append(admin)

        security_users = self._security_users(visit.branchId)
        security_msg = (
            f"Approved appointment: {name} with Dr. {doctor.name}. "
            + ("Online visit — monitor only, no check-in." if self._is_online(visit) else "Prepare for check-in.")
        )
        for security in security_users:
            self._add_notification(security.id, visit.id, security_msg)
            recipients.append(security)

        self._email_users(recipients, email_subject, security_msg)
        admin_users = [u for u in recipients if u not in security_users]
        self._sms_users(
            admin_users,
            f"Connitor: Appointment approved: {name} with Dr. {doctor.name}."
            + (
                " Online visit — no physical check-in required."
                if self._is_online(visit)
                else ""
            ),
        )
        self._sms_users(
            security_users,
            f"Connitor: Approved visitor {name} with Dr. {doctor.name}. "
            + (
                "Online visit today — no physical check-in."
                if self._is_online(visit)
                else "Prepare for check-in today."
            ),
        )
        self.db.commit()

    def notify_staff_on_approval(self, visit: Visit, doctor: User, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        message = f"You approved the appointment for {name} on {appt}. The visitor has been notified."
        self._add_notification(doctor.id, visit.id, message)
        self._email_user(doctor, "Appointment Approved", message)
        self._sms_user(
            doctor,
            f"Connitor: You approved {name}'s appointment on {appt}. Visitor notified with check-in QR.",
        )
        self.db.commit()

    def notify_visitor_approval(self, visit: Visit, visitor: Visitor, doctor: User) -> None:
        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        check_in_otp = visit.checkInOtp or visit.visitCode
        feedback = (visit.doctorFeedback or "").strip()

        self._send_calendar_invite(
            visit,
            doctor,
            visitor,
            status="confirmed",
            sequence=1,
        )

        if visitor.email and check_in_otp:
            try:
                self.email.send_gate_pass_email(
                    visitor.email,
                    visitor_name=name,
                    doctor_name=doctor.name,
                    appointment_date=appt,
                    check_in_otp=check_in_otp,
                    qr_image_base64=visit.visitQRCode,
                    doctor_feedback=feedback or None,
                    visitor_pass_id=visit.visitorPassId,
                )
            except Exception as exc:
                logger.error("Failed to send gate pass email to %s: %s", visitor.email, exc)
        elif visitor.email:
            msg = f"Your appointment with Dr. {doctor.name} on {appt} has been approved."
            if feedback:
                msg += f"\n\nMessage from your doctor:\n{feedback}"
            self.email.send_notification(visitor.email, "Appointment Approved", msg)

        if visitor.phone:
            try:
                if check_in_otp:
                    sms_text = f"Connitor: Appointment approved with Dr. {doctor.name}. "
                    if visit.visitorPassId:
                        sms_text += f"Pass ID: {visit.visitorPassId}. "
                    sms_text += f"Check-in OTP: {check_in_otp}. Show this OTP/QR at security."
                    self.sms.send_message(visitor.phone, sms_text)
                else:
                    self.sms.send_message(
                        visitor.phone,
                        f"Your appointment with Dr. {doctor.name} on {appt} has been approved.",
                    )
            except Exception as exc:
                logger.error("Failed to WhatsApp approval text to %s: %s", visitor.phone, exc)
        self._send_approval_qr_whatsapp(visit, visitor, name)

    def _public_gate_pass_image_url(self, visit_id: str) -> str | None:
        """HTTPS image WhatsApp can download. S3 is preferred when it is configured."""
        from app.config import get_public_api_base_url, get_settings

        settings = get_settings()
        base = (settings.whatsapp_media_base_url or get_public_api_base_url(settings) or "").rstrip("/")
        if not base:
            return None
        return f"{base}/api/public/visits/{visit_id}/gate-pass.png"

    def _send_approval_qr_whatsapp(self, visit: Visit, visitor: Visitor, visitor_name: str) -> None:
        """Send conninter_meeting_pass with the composed check-in image."""
        if not visitor.phone:
            return
        try:
            from app.services.meeting_pass_image import assemble_meeting_pass, render_meeting_pass
            from app.services.s3_storage_service import S3StorageService

            content = assemble_meeting_pass(self.db, visit)
            image_bytes = render_meeting_pass(content)
            image_url = S3StorageService().publish_gate_pass_png(visit.id, image_bytes)
            if not image_url:
                logger.warning("No public meeting-pass URL for visit %s; WhatsApp skipped", visit.id)
                return
            purpose = (visit.purpose or "").strip()
            if purpose.upper().startswith("[CUSTOM SLOT]"):
                purpose = purpose[len("[CUSTOM SLOT]") :].strip()
            carrying = getattr(visit, "itemsCarrying", None)
            carrying_text = carrying.strip() if isinstance(carrying, str) else ""
            sent = self.whatsapp.send_meeting_pass(
                visitor.phone,
                visitor_name=content.visitor_name or visitor_name,
                doctor_name=content.doctor_name,
                hospital_name=content.hospital_name,
                department=content.department,
                requested_date=content.date_text,
                requested_time=content.time_text,
                purpose=purpose or "Visit",
                items_carrying=carrying_text or "—",
                image_url=image_url,
            )
            if not sent:
                logger.warning("Meeting pass template was not sent for visit %s", visit.id)
        except Exception as exc:
            logger.error("Failed to WhatsApp meeting pass to %s: %s", visitor.phone, exc)

    def notify_visitor_online_approval(self, visit: Visit, visitor: Visitor, doctor: User) -> None:
        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        feedback = (visit.doctorFeedback or "").strip()
        join_url = meeting_join_url(visit) or ""

        self._send_calendar_invite(visit, doctor, visitor, status="confirmed", sequence=1)

        if visitor.email and join_url:
            try:
                self.email.send_online_appointment_email(
                    visitor.email,
                    recipient_name=name,
                    doctor_name=doctor.name,
                    appointment_date=appt,
                    meeting_url=join_url,
                    doctor_feedback=feedback or None,
                    is_host=False,
                )
            except Exception as exc:
                logger.error("Failed to send online appointment email to %s: %s", visitor.email, exc)

        phone = self._visitor_phone(visitor)
        if join_url and phone:
            branch = self.db.get(Branch, visit.branchId)
            hospital_name = "Hospital"
            if branch is not None:
                chain = getattr(branch, "hospitalChain", None)
                chain_name = getattr(chain, "name", None) if chain is not None else None
                if isinstance(chain_name, str) and chain_name.strip():
                    hospital_name = chain_name.strip()
                elif branch.name:
                    hospital_name = branch.name
            requested_date, requested_time = self._appointment_date_and_time(visit)
            meeting_id = (visit.meetingRoomName or visit.smsApprovalCode or visit.id or "—").strip()
            doctor_label = self._doctor_display_name(doctor)
            sent = False
            try:
                sent = self.whatsapp.send_online_meeting_visitor(
                    phone,
                    visitor_name=name,
                    doctor_name=f"Dr. {doctor_label}",
                    hospital_name=hospital_name,
                    department=self._department_name(visit),
                    requested_date=requested_date,
                    requested_time=requested_time,
                    meeting_id=meeting_id,
                    meeting_url=join_url,
                )
            except Exception as exc:
                logger.error(
                    "Failed to WhatsApp online meeting template to visitor %s: %s",
                    phone,
                    exc,
                )
            if not sent:
                self.sms.send_message(
                    phone,
                    f"Connitor: Online appointment approved with Dr. {doctor.name}. "
                    f"Join video consultation: {join_url}",
                )

    def notify_doctor_online_approval(self, visit: Visit, doctor: User, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        start_url = meeting_host_url(visit) or ""
        message = (
            f"You approved the online appointment for {name} on {appt}. "
            "A video consultation room was created and the link sent to the visitor."
        )
        self._add_notification(doctor.id, visit.id, message)
        if doctor.email and start_url:
            try:
                self.email.send_online_appointment_email(
                    doctor.email,
                    recipient_name=doctor.name or "Doctor",
                    doctor_name=doctor.name,
                    appointment_date=appt,
                    meeting_url=start_url,
                    doctor_feedback=None,
                    is_host=True,
                )
            except Exception as exc:
                logger.error("Failed to send online host email to %s: %s", doctor.email, exc)
        else:
            self._email_user(doctor, "Online Appointment Approved", message)
        if start_url and doctor.phone:
            purpose = (visit.purpose or "").strip()
            if purpose.upper().startswith("[CUSTOM SLOT]"):
                purpose = purpose[len("[CUSTOM SLOT]") :].strip()
            requested_date, requested_time = self._appointment_date_and_time(visit)
            meeting_id = (visit.meetingRoomName or visit.smsApprovalCode or visit.id or "—").strip()
            sent = False
            try:
                sent = self.whatsapp.send_online_meeting_doctor(
                    doctor.phone,
                    doctor_name=self._doctor_display_name(doctor),
                    visitor_name=name,
                    organization=self._organization_for_doctor_template(visit),
                    purpose=purpose or "Visit",
                    requested_date=requested_date,
                    requested_time=requested_time,
                    meeting_id=meeting_id,
                    meeting_url=start_url,
                )
            except Exception as exc:
                logger.error(
                    "Failed to WhatsApp online meeting template to doctor %s: %s",
                    doctor.phone,
                    exc,
                )
            if not sent:
                self._sms_user(
                    doctor,
                    f"Connitor: Online appointment with {name} on {appt}. Start consultation: {start_url}",
                )
        self.db.commit()

    def notify_online_meeting_started(self, visit: Visit, visitor: Visitor, doctor: User) -> None:
        name = self._visitor_name(visitor)
        appt = self._format_appt(visit)
        started = visit.checkInTime.strftime("%d %b %Y %H:%M") if visit.checkInTime else "now"
        visitor_msg = (
            f"Hello {name},\n\n"
            f"Your online consultation with Dr. {doctor.name} ({appt}) has started.\n\n"
            f"Started at: {started}\n\n"
            "Use the video consultation link from your approval email if you are not already in the room."
        )
        doctor_msg = (
            f"Your online consultation with {name} ({appt}) has started.\n\n"
            f"Started at: {started}"
        )
        self._add_notification(doctor.id, visit.id, doctor_msg)
        # Release the Visit FK lock before slow email/SMS so a room_finished webhook can check out.
        self.db.commit()
        self._email_visitor(visitor, "Online Consultation Started", visitor_msg)
        self._email_user(doctor, "Online Consultation Started", doctor_msg)
        if visitor.phone:
            self.sms.send_message(
                visitor.phone,
                f"Connitor: Online consultation with Dr. {doctor.name} has started.",
            )
        if doctor.phone:
            self._sms_user(doctor, f"Connitor: Online consultation with {name} has started.")
        self.db.commit()

    def notify_online_meeting_completed(
        self, visit: Visit, visitor: Visitor, doctor: User | None, duration: int | None
    ) -> None:
        name = self._visitor_name(visitor)
        doctor_name = doctor.name if doctor else visit.staffName or "your doctor"
        dur = f"{duration} minutes" if duration is not None else "your consultation"
        ended = visit.checkOutTime.strftime("%d %b %Y %H:%M") if visit.checkOutTime else "now"
        visitor_msg = (
            f"Hello {name},\n\n"
            f"Your online consultation with Dr. {doctor_name} is complete.\n\n"
            f"Ended at: {ended}\n"
            f"Duration: {dur}.\n\n"
            "Thank you for using our online consultation service."
        )
        admin_msg = f"Online consultation completed: {name} with Dr. {doctor_name} ({dur})."
        self._email_visitor(visitor, "Online Consultation Completed", visitor_msg)
        if visitor.phone:
            self.sms.send_message(
                visitor.phone,
                f"Connitor: Online consultation with Dr. {doctor_name} completed. Duration: {dur}.",
            )
        if doctor:
            self._add_notification(doctor.id, visit.id, admin_msg)
            self._email_user(doctor, "Online Consultation Completed", admin_msg)
            if doctor.phone:
                self._sms_user(
                    doctor,
                    f"Connitor: Online consultation with {name} completed ({dur}).",
                )
        self._notify_all_admins(visit, admin_msg, email_subject="Online Consultation Completed")
        self.db.commit()

    def notify_visitor_rejection(
        self, visit: Visit, visitor: Visitor, doctor: User, rejection_reason: str
    ) -> None:
        name = self._visitor_name(visitor)
        appt = visit.appointmentDate.strftime("%d %b %Y %H:%M") if visit.appointmentDate else "your scheduled time"
        msg = (
            f"Hello {name},\n\n"
            f"Your appointment request with Dr. {doctor.name} on {appt} was not approved.\n\n"
            f"Reason: {rejection_reason}\n\n"
            "You may book another appointment from the hospital portal."
        )
        self._email_visitor(visitor, "Appointment Not Approved", msg)
        self._send_calendar_invite(
            visit,
            doctor,
            visitor,
            status="cancelled",
            sequence=2,
        )
        phone = self._visitor_phone(visitor)
        if not phone:
            logger.warning("Visit %s rejected but the visitor has no phone for WhatsApp", visit.id)
            return
        branch = self.db.get(Branch, visit.branchId)
        requested_date, requested_time = self._appointment_date_and_time(visit)
        sent = False
        try:
            sent = self.whatsapp.send_visit_rejected(
                phone,
                visitor_name=name,
                doctor_name=self._doctor_display_name(doctor),
                hospital_name=branch.name if branch and branch.name else "Hospital",
                department=self._department_name(visit),
                requested_date=requested_date,
                requested_time=requested_time,
                visit_id=visit.smsApprovalCode or visit.id,
            )
        except Exception as exc:
            logger.error("Failed to WhatsApp visit rejection to %s: %s", phone, exc)
        if not sent:
            self.sms.send_message(
                phone,
                f"Appointment with Dr. {doctor.name} was not approved. Reason: {rejection_reason}",
            )

    def notify_visitor_id_verified(self, visit: Visit, visitor: Visitor, doctor: User | None) -> None:
        name = self._visitor_name(visitor)
        doctor_name = doctor.name if doctor else visit.staffName or "your doctor"
        appt = visit.appointmentDate.strftime("%d %b %Y %H:%M") if visit.appointmentDate else "your appointment"
        msg = (
            f"Hello {name},\n\n"
            f"Your ID has been verified by hospital security for your visit with Dr. {doctor_name} "
            f"on {appt}.\n\n"
            "Please proceed to complete check-in at the security desk."
        )
        self._email_visitor(visitor, "ID Verified — Proceed to Check-in", msg)

    def notify_visitor_otp_verified(self, visit: Visit, visitor: Visitor, doctor: User | None) -> None:
        name = self._visitor_name(visitor)
        doctor_name = doctor.name if doctor else visit.staffName or "your doctor"
        appt = visit.appointmentDate.strftime("%d %b %Y %H:%M") if visit.appointmentDate else "your appointment"
        msg = (
            f"Hello {name},\n\n"
            f"Your check-in OTP was verified successfully for your appointment with Dr. {doctor_name} "
            f"on {appt}.\n\n"
            "Security will complete your check-in shortly."
        )
        self._email_visitor(visitor, "Check-in OTP Verified", msg)

    def notify_visitor_checked_in(self, visit: Visit, visitor: Visitor, doctor: User | None) -> None:
        name = self._visitor_name(visitor)
        doctor_name = doctor.name if doctor else visit.staffName or "your doctor"
        appt = visit.appointmentDate.strftime("%d %b %Y %H:%M") if visit.appointmentDate else "today"
        check_in_time = (
            visit.checkInTime.strftime("%d %b %Y %H:%M") if visit.checkInTime else "just now"
        )
        msg = (
            f"Hello {name},\n\n"
            f"You have checked in at the hospital for your appointment with Dr. {doctor_name} "
            f"({appt}).\n\n"
            f"Check-in time: {check_in_time}\n\n"
            "Please wait in the reception area. Your doctor has been notified of your arrival."
        )
        self._email_visitor(visitor, "Checked In Successfully", msg)

    def notify_visitor_checked_out(
        self, visit: Visit, visitor: Visitor, doctor: User | None, duration: int | None
    ) -> None:
        name = self._visitor_name(visitor)
        doctor_name = doctor.name if doctor else visit.staffName or "your doctor"
        dur = f"{duration} minutes" if duration is not None else "your visit"
        msg = (
            f"Hello {name},\n\n"
            f"Thank you for visiting. You have checked out after meeting Dr. {doctor_name}.\n\n"
            f"Visit duration: {dur}.\n\n"
            "We hope you had a good experience. Safe travels!"
        )
        self._email_visitor(visitor, "Checked Out — Thank You for Visiting", msg)

    def notify_security_on_visit_approval(self, visit: Visit, staff: User, visitor: Visitor) -> None:
        message = (
            f"Visit for {self._visitor_name(visitor)} to meet {staff.name} "
            "has been approved. Please prepare for check-in."
        )
        security_users = self._security_users(visit.branchId)
        for security in security_users:
            self._add_notification(security.id, visit.id, message)
        self._email_users(security_users, "Visit Approved — Prepare for Check-in", message)
        self.db.commit()

    def notify_staff_on_check_in(self, visit: Visit, staff: User, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        message = f"Your patient, {name}, has checked in and is on their way."
        self._add_notification(staff.id, visit.id, message)
        self._email_user(staff, "Patient Checked In", message)
        self.db.commit()

    def notify_doctor_patient_arrived(self, visit: Visit, doctor: User, visitor: Visitor) -> None:
        name = self._visitor_name(visitor)
        appt = visit.appointmentDate.strftime("%d %b %Y %H:%M") if visit.appointmentDate else "today"
        check_in_time = (
            visit.checkInTime.strftime("%d %b %Y %H:%M") if visit.checkInTime else "just now"
        )
        msg = (
            f"Your patient {name} has arrived for their appointment ({appt}) and checked in at "
            f"{check_in_time}.\n\n"
            "Please be ready to receive them."
        )
        self._add_notification(doctor.id, visit.id, msg)
        self._email_user(doctor, "Patient Arrived for Appointment", msg)
        if doctor.phone:
            self.sms.send_message(doctor.phone, f"Patient {name} has checked in for their appointment.")
        visit.doctorNotifiedAt = now_ist()
        self.db.commit()

    def notify_doctor_visit_extension(self, visit: Visit, token: str) -> None:
        from app.services.visit_slot_extension_service import VisitSlotExtensionService

        doctor = visit.staff
        if not doctor:
            return
        visitor_name = self._visitor_name(visit.visitor) if visit.visitor else "your visitor"
        expected_end = format_ist_datetime(visit.expectedEndTime)
        url = VisitSlotExtensionService(self.db).build_extend_url(visit.id, token)
        msg = (
            f"Your visit with {visitor_name} is due to end at {expected_end}. "
            f"Extend here if needed: {url}. Security should hold the next visitor."
        )
        self._add_notification(doctor.id, visit.id, msg)
        if doctor.phone:
            try:
                self.sms.send_message(doctor.phone, f"Conninter: {msg}")
            except Exception as exc:
                logger.error("Failed to WhatsApp visit extension to %s: %s", doctor.phone, exc)
        if get_settings().email_notifications_enabled and doctor.email:
            try:
                self.email.send_visit_extension_email(
                    doctor.email,
                    doctor_name=doctor.name or "Doctor",
                    visitor_name=visitor_name,
                    expected_end=expected_end,
                    extend_url=url,
                )
            except Exception as exc:
                logger.error("Failed to send visit extension email to %s: %s", doctor.email, exc)

    def notify_security_visit_extended(self, visit: Visit, extra_minutes: int) -> None:
        visitor_name = self._visitor_name(visit.visitor) if visit.visitor else "Visitor"
        doctor_name = visit.staff.name if visit.staff else visit.staffName or "Doctor"
        expected_end = format_ist_datetime(visit.expectedEndTime)
        msg = (
            f"Dr. {doctor_name} extended the visit with {visitor_name} by {extra_minutes} minutes. "
            f"New expected end: {expected_end}. Hold the next visitor until then."
        )
        security = self._security_users(visit.branchId)
        for user in security:
            self._add_notification(user.id, visit.id, msg)
        self._email_users(security, "Visit Extended — Hold Next Visitor", msg)
        if get_settings().email_notifications_enabled:
            for user in security:
                if not user.email:
                    continue
                try:
                    self.email.send_visit_extended_security_email(
                        user.email,
                        visitor_name=visitor_name,
                        doctor_name=doctor_name,
                        extra_minutes=extra_minutes,
                        expected_end=expected_end,
                    )
                except Exception as exc:
                    logger.error(
                        "Failed to email security visit-extended to %s: %s", user.email, exc
                    )

    def notify_next_visitor_delayed(
        self,
        next_visit: Visit,
        current: Visit,
        extra_minutes: int,
        *,
        calendar_shifted: bool,
        new_window: str | None = None,
    ) -> None:
        visitor = next_visit.visitor
        if not visitor:
            return
        visitor_name = self._visitor_name(visitor)
        doctor_name = current.staff.name if current.staff else current.staffName or "Doctor"
        new_slot = new_window or format_ist_datetime(next_visit.appointmentDate) or "the updated time"
        shift_note = (
            f"Your visit is rescheduled to {new_slot} because the ongoing meeting was extended."
            if calendar_shifted
            else f"Please arrive about {extra_minutes} minutes later than planned (doctor running late)."
        )
        msg = (
            f"Your appointment with Dr. {doctor_name} was rescheduled due to an extension of the "
            f"ongoing meeting. New time: {new_slot}."
            if calendar_shifted
            else f"Your appointment with Dr. {doctor_name} is delayed by {extra_minutes} minutes. {shift_note}"
        )
        if visitor.email:
            try:
                self.email.send_next_visitor_delayed_email(
                    visitor.email,
                    visitor_name=visitor_name,
                    doctor_name=doctor_name,
                    extra_minutes=extra_minutes,
                    new_slot=new_slot if calendar_shifted else f"delayed by {extra_minutes} minutes",
                )
            except Exception as exc:
                logger.error("Failed to email delayed visitor %s: %s", visitor.email, exc)
        if visitor.phone:
            self.sms.send_message(visitor.phone, msg)

    def notify_admins_on_check_in(self, visit: Visit, visitor: Visitor, doctor: User | None) -> None:
        name = self._visitor_name(visitor)
        doctor_name = doctor.name if doctor else visit.staffName or "staff"
        msg = f"Check-in: {name} arrived for appointment with {doctor_name}."
        self._notify_all_admins(visit, msg, email_subject="Visitor Checked In")

    def notify_admins_on_check_out(
        self, visit: Visit, visitor: Visitor, doctor: User | None, duration: int | None
    ) -> None:
        name = self._visitor_name(visitor)
        dur = f"{duration} minutes" if duration is not None else "unknown duration"
        msg = f"Check-out: {name} left after {dur}."
        self._notify_all_admins(visit, msg, email_subject="Visitor Checked Out")

    def _notify_all_admins(
        self, visit: Visit, message: str, *, email_subject: str = "Hospital Notification"
    ) -> None:
        recipients: list[User] = []
        super_admins = (
            self.db.query(User)
            .filter(User.role == Role.SUPER_ADMIN.value, User.isActive == True)  # noqa: E712
            .all()
        )
        for admin in super_admins:
            self._add_notification(admin.id, visit.id, message)
            recipients.append(admin)
        for admin in self._hospital_admins_for_branch(visit.branchId):
            self._add_notification(admin.id, visit.id, message)
            recipients.append(admin)
        if visit.departmentId:
            for admin in (
                self.db.query(User)
                .filter(
                    User.role == Role.DEPARTMENT_ADMIN.value,
                    User.departmentId == visit.departmentId,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            ):
                self._add_notification(admin.id, visit.id, message)
                recipients.append(admin)
        if visit.subDepartmentId:
            for admin in (
                self.db.query(User)
                .filter(
                    User.role == Role.SUB_DEPARTMENT_ADMIN.value,
                    User.subDepartmentId == visit.subDepartmentId,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            ):
                self._add_notification(admin.id, visit.id, message)
                recipients.append(admin)
        self._email_users(recipients, email_subject, message)
        self.db.commit()

    def notify_staff_on_security_approval(self, visit: Visit, staff: User, visitor: Visitor) -> None:
        message = f"Security has approved the visit for {self._visitor_name(visitor)}."
        self._add_notification(staff.id, visit.id, message)
        self._email_user(staff, "Visit Approved by Security", message)
        self.db.commit()

    def notify_staff_on_security_rejection(
        self, visit: Visit, staff: User, visitor: Visitor, rejection_reason: str
    ) -> None:
        message = (
            f"Security has rejected the visit for {self._visitor_name(visitor)}. "
            f"Reason: {rejection_reason}"
        )
        self._add_notification(staff.id, visit.id, message)
        self._email_user(staff, "Visit Rejected by Security", message)
        self.db.commit()

    def notify_on_scheduled_delivery(self, delivery) -> None:
        from app.models.delivery_entities import DeliveryAgent, DeliveryVehicle, Distributor

        branch = self.db.get(Branch, delivery.branchId)
        vendor = self.db.get(Distributor, delivery.vendorId)
        agent = self.db.get(DeliveryAgent, delivery.agentId)
        vehicle = self.db.get(DeliveryVehicle, delivery.vehicleId)
        arrival = (
            format_ist_datetime(delivery.expectedArrivalTime)
            if delivery.expectedArrivalTime
            else "unscheduled"
        )
        goods = delivery.goodsType or "Goods"
        boxes = delivery.totalBoxes or 0
        vendor_name = vendor.vendorName if vendor else "Distributor"
        driver_name = agent.name if agent else "Driver"
        vehicle_no = vehicle.registrationNumber if vehicle else "—"
        branch_name = branch.name if branch else "Hospital"

        message = (
            f"New delivery scheduled: {vendor_name} — {goods} ({boxes} boxes). "
            f"Driver: {driver_name}, Vehicle: {vehicle_no}. Arrival: {arrival}."
        )
        subject = f"New Scheduled Delivery — {delivery.deliveryNumber}"

        security_users = self._security_users(delivery.branchId)
        for security in security_users:
            self._add_system_notification(security.id, message)
        self._email_users(security_users, subject, message)

        admin_recipients: list[User] = []
        super_admins = (
            self.db.query(User)
            .filter(User.role == Role.SUPER_ADMIN.value, User.isActive == True)  # noqa: E712
            .all()
        )
        for admin in super_admins:
            self._add_system_notification(admin.id, message)
            admin_recipients.append(admin)
        for admin in self._hospital_admins_for_branch(delivery.branchId):
            self._add_system_notification(admin.id, message)
            admin_recipients.append(admin)
        branch_admins = (
            self.db.query(User)
            .filter(
                User.branchId == delivery.branchId,
                User.role == Role.BRANCH_ADMIN.value,
                User.isActive == True,  # noqa: E712
            )
            .all()
        )
        for admin in branch_admins:
            self._add_system_notification(admin.id, message)
            admin_recipients.append(admin)
        self._email_users(admin_recipients, subject, message)

        if agent and agent.email:
            address = self._branch_address(branch) if branch else ""
            maps_url = None
            if address:
                from urllib.parse import quote

                maps_url = f"https://www.google.com/maps/search/?api=1&query={quote(address)}"
            qr = delivery.qrCode
            qr_expires = None
            if qr and qr.expiresAt:
                qr_expires = format_ist_datetime(qr.expiresAt)
            try:
                self.email.send_delivery_assignment_email(
                    agent.email,
                    driver_name=agent.name or "Driver",
                    delivery_number=delivery.deliveryNumber,
                    goods_type=goods,
                    total_boxes=boxes,
                    vehicle_number=vehicle_no,
                    vendor_name=vendor_name,
                    arrival_label=arrival,
                    hospital_name=branch_name,
                    hospital_address=address,
                    hospital_phone=(branch.phone if branch else "") or "",
                    maps_url=maps_url,
                    remarks=delivery.remarks,
                    qr_payload=qr.qrPayload if qr else None,
                    qr_signature=qr.signature if qr else None,
                    qr_expires_at=qr_expires,
                )
            except Exception as exc:
                logger.error("Failed to email driver %s: %s", agent.email, exc)

        if agent and agent.phone:
            try:
                self._send_delivery_pass_whatsapp(delivery, agent)
            except Exception as exc:
                logger.error("Failed to WhatsApp delivery pass to %s: %s", agent.phone, exc)

        self.db.commit()

    def _send_delivery_pass_whatsapp(self, delivery, agent) -> None:
        """Send the glassy delivery pass to the allotted driver."""
        from app.services.delivery_pass_image import assemble_delivery_pass, render_delivery_pass
        from app.services.s3_storage_service import S3StorageService

        if not agent.phone:
            return
        from sqlalchemy.orm import joinedload

        from app.models.delivery_entities import InboundDelivery

        loaded = (
            self.db.query(InboundDelivery)
            .options(joinedload(InboundDelivery.qrCodes), joinedload(InboundDelivery.items))
            .filter(InboundDelivery.id == delivery.id)
            .first()
        )
        if loaded is not None:
            delivery = loaded
        content = assemble_delivery_pass(self.db, delivery)
        image_bytes = render_delivery_pass(content, scale=2)
        image_url = S3StorageService().publish_delivery_pass_png(delivery.id, image_bytes)
        if not image_url:
            logger.warning("No public delivery-pass URL for %s; WhatsApp skipped", delivery.id)
            return
        sent = self.whatsapp.send_delivery_pass(
            agent.phone,
            driver_name=content.driver_name,
            deliver_to=content.deliver_to,
            po_number=content.po_number,
            item_text=content.item_text,
            vehicle_text=content.vehicle_text,
            date_text=content.date_text,
            time_text=content.time_text,
            image_url=image_url,
        )
        if not sent:
            logger.warning("Delivery pass template was not sent for %s", delivery.id)

    def _notify_delivery_hold_parties(
        self, delivery, *, subject: str, message: str
    ) -> None:
        from app.models.delivery_entities import DeliveryAgent, Distributor

        vendor = self.db.get(Distributor, delivery.vendorId) if delivery.vendorId else None
        agent = self.db.get(DeliveryAgent, delivery.agentId) if delivery.agentId else None

        recipients: list[User] = []

        if vendor:
            dist_users = (
                self.db.query(User)
                .filter(
                    User.distributorId == vendor.id,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            )
            for u in dist_users:
                self._add_system_notification(u.id, message)
                recipients.append(u)

        for admin in (
            self.db.query(User)
            .filter(User.role == Role.SUPER_ADMIN.value, User.isActive == True)  # noqa: E712
            .all()
        ):
            self._add_system_notification(admin.id, message)
            recipients.append(admin)

        for admin in self._hospital_admins_for_branch(delivery.branchId):
            self._add_system_notification(admin.id, message)
            recipients.append(admin)

        self._email_users(recipients, subject, message)

        if agent and agent.email:
            try:
                self.email.send_notification(agent.email, subject, message)
            except Exception as exc:
                logger.error("Failed hold email to driver %s: %s", agent.email, exc)

    def notify_on_delivery_hold(self, delivery) -> None:
        from app.models.delivery_entities import Distributor

        vendor = self.db.get(Distributor, delivery.vendorId) if delivery.vendorId else None
        vendor_name = vendor.vendorName if vendor else "Distributor"
        arrival = (
            format_ist_datetime(delivery.expectedArrivalTime)
            if delivery.expectedArrivalTime
            else "unscheduled"
        )
        reason = (delivery.holdReason or "Hospital internal delivery").strip()
        until = (
            format_ist_datetime(delivery.holdUntil) if delivery.holdUntil else "not specified"
        )
        subject = f"Delivery on hold — {delivery.deliveryNumber}"
        message = (
            f"Delivery {delivery.deliveryNumber} ({vendor_name}) is ON HOLD for hospital internal "
            f"delivery. Original arrival: {arrival}. Reason: {reason}. Hold until: {until}. "
            f"Gate entry is blocked until Security releases the hold. Slot time is unchanged."
        )
        self._notify_delivery_hold_parties(delivery, subject=subject, message=message)

    def notify_on_delivery_hold_released(self, delivery, *, prior_reason: str | None = None) -> None:
        from app.models.delivery_entities import Distributor

        vendor = self.db.get(Distributor, delivery.vendorId) if delivery.vendorId else None
        vendor_name = vendor.vendorName if vendor else "Distributor"
        arrival = (
            format_ist_datetime(delivery.expectedArrivalTime)
            if delivery.expectedArrivalTime
            else "unscheduled"
        )
        reason = (prior_reason or "hospital internal delivery").strip()
        subject = f"Delivery hold released — {delivery.deliveryNumber}"
        message = (
            f"Hold released for delivery {delivery.deliveryNumber} ({vendor_name}). "
            f"Original arrival still applies: {arrival}. Previous hold reason: {reason}. "
            f"Gate entry is allowed again."
        )
        self._notify_delivery_hold_parties(delivery, subject=subject, message=message)

    def _delivery_exit_email_targets(
        self, vendor, agent
    ) -> list[tuple[str, str]]:
        """Distributor + driver emails (entity fields, then linked User accounts)."""
        targets: list[tuple[str, str]] = []
        seen: set[str] = set()

        def add(email: str | None, name: str) -> None:
            if not email or "@" not in email:
                return
            key = email.strip().lower()
            if key in seen or key.endswith("@placeholder.local"):
                return
            seen.add(key)
            targets.append((email.strip(), name))

        if vendor:
            add(vendor.email, vendor.vendorName or "Distributor")
            dist_users = (
                self.db.query(User)
                .filter(
                    User.role == Role.DISTRIBUTOR.value,
                    User.distributorId == vendor.id,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            )
            for u in dist_users:
                add(u.email, u.name or vendor.vendorName or "Distributor")

        if agent:
            add(agent.email, agent.name or "Driver")
            if agent.userId:
                agent_user = self.db.get(User, agent.userId)
                if agent_user:
                    add(agent_user.email, agent_user.name or agent.name or "Driver")

        return targets

    def notify_on_delivery_checkout_qr(self, delivery, exit_qr) -> dict:
        """Email driver (+ distributor) with checkout QR after gate entry."""
        from app.models.delivery_entities import DeliveryAgent, DeliveryVehicle, Distributor

        branch = self.db.get(Branch, delivery.branchId)
        vendor = self.db.get(Distributor, delivery.vendorId) if delivery.vendorId else None
        agent = self.db.get(DeliveryAgent, delivery.agentId) if delivery.agentId else None
        vehicle = self.db.get(DeliveryVehicle, delivery.vehicleId) if delivery.vehicleId else None

        from app.models.delivery_entities import DeliveryGateEntry

        entry = (
            self.db.query(DeliveryGateEntry)
            .filter(DeliveryGateEntry.deliveryId == delivery.id)
            .order_by(DeliveryGateEntry.entryTime.asc())
            .first()
        )
        entry_time = entry.entryTime if entry else delivery.actualArrivalTime
        entry_label = format_ist_datetime(entry_time) if entry_time else "—"
        vendor_name = vendor.vendorName if vendor else "Distributor"
        driver_name = agent.name if agent else "Driver"
        vehicle_no = vehicle.registrationNumber if vehicle else "—"
        branch_name = branch.name if branch else "Hospital"
        goods = delivery.goodsType or "Goods"
        boxes = delivery.totalBoxes or 0

        targets = self._delivery_exit_email_targets(vendor, agent)
        sent: list[str] = []
        for to_email, recipient_name in targets:
            try:
                self.email.send_delivery_checkout_qr_email(
                    to_email,
                    driver_name=recipient_name or driver_name,
                    delivery_number=delivery.deliveryNumber,
                    goods_type=goods,
                    total_boxes=boxes,
                    vehicle_number=vehicle_no,
                    vendor_name=vendor_name,
                    hospital_name=branch_name,
                    entry_label=entry_label,
                    qr_payload=exit_qr.qrPayload if exit_qr else None,
                    qr_signature=exit_qr.signature if exit_qr else None,
                )
                sent.append(to_email)
            except Exception as exc:
                logger.error(
                    "Failed delivery checkout QR email to %s: %s", to_email, exc
                )
        return {"emailsSent": len(sent), "recipients": sent}

    def notify_on_delivery_exit(self, delivery) -> dict:
        """Email distributor + driver (and staff) with gate entry/exit duration."""
        from app.models.delivery_entities import DeliveryAgent, DeliveryVehicle, Distributor
        from app.email_templates import build_delivery_exit_email

        branch = self.db.get(Branch, delivery.branchId)
        vendor = self.db.get(Distributor, delivery.vendorId) if delivery.vendorId else None
        agent = self.db.get(DeliveryAgent, delivery.agentId) if delivery.agentId else None
        vehicle = self.db.get(DeliveryVehicle, delivery.vehicleId) if delivery.vehicleId else None

        from app.models.delivery_entities import DeliveryGateEntry, DeliveryGateExit

        entry = (
            self.db.query(DeliveryGateEntry)
            .filter(DeliveryGateEntry.deliveryId == delivery.id)
            .order_by(DeliveryGateEntry.entryTime.asc())
            .first()
        )
        exit_row = (
            self.db.query(DeliveryGateExit)
            .filter(DeliveryGateExit.deliveryId == delivery.id)
            .order_by(DeliveryGateExit.exitTime.desc())
            .first()
        )
        entry_time = entry.entryTime if entry else delivery.actualArrivalTime
        exit_time = exit_row.exitTime if exit_row else now_ist()
        duration_minutes = None
        if entry_time and exit_time:
            duration_minutes = max(0, int((exit_time - entry_time).total_seconds() // 60))

        vendor_name = vendor.vendorName if vendor else "Distributor"
        driver_name = agent.name if agent else "Driver"
        vehicle_no = vehicle.registrationNumber if vehicle else "—"
        branch_name = branch.name if branch else "Hospital"
        goods = delivery.goodsType or "Goods"
        boxes = delivery.totalBoxes or 0
        entry_label = format_ist_datetime(entry_time) if entry_time else "—"
        exit_label = format_ist_datetime(exit_time) if exit_time else "—"

        message = (
            f"Delivery {delivery.deliveryNumber} exited. "
            f"{vendor_name} / {driver_name} / {vehicle_no}. "
            f"Inside {duration_minutes if duration_minutes is not None else '—'} min "
            f"({entry_label} → {exit_label})."
        )
        subject = f"Delivery completed — {delivery.deliveryNumber}"

        notify_users: list[User] = []
        for security in self._security_users(delivery.branchId):
            self._add_system_notification(security.id, message)
            notify_users.append(security)
        for receiving in self._receiving_users(delivery.branchId):
            self._add_system_notification(receiving.id, message)
            notify_users.append(receiving)

        # In-app notify for distributor login accounts
        if vendor:
            for dist_user in (
                self.db.query(User)
                .filter(
                    User.role == Role.DISTRIBUTOR.value,
                    User.distributorId == vendor.id,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            ):
                self._add_system_notification(dist_user.id, message)
                notify_users.append(dist_user)

        self._email_users(notify_users, subject, message)

        email_targets = self._delivery_exit_email_targets(vendor, agent)
        if not email_targets:
            logger.warning(
                "Delivery exit %s: no distributor/driver email addresses found",
                delivery.deliveryNumber,
            )

        settings = get_settings()
        sent: list[str] = []
        for to_email, recipient_name in email_targets:
            try:
                subj, text_body, html_body = build_delivery_exit_email(
                    recipient_name=recipient_name,
                    delivery_number=delivery.deliveryNumber,
                    vendor_name=vendor_name,
                    driver_name=driver_name,
                    vehicle_number=vehicle_no,
                    goods_type=goods,
                    total_boxes=boxes,
                    hospital_name=branch_name,
                    entry_label=entry_label,
                    exit_label=exit_label,
                    duration_minutes=duration_minutes,
                    company_name=settings.email_from_name,
                    product_name=settings.email_product_name,
                )
                self.email._deliver_email(
                    to_email, subj, text_body, html_body, context="delivery exit"
                )
                sent.append(to_email)
            except Exception as exc:
                logger.error("Failed delivery exit email to %s: %s", to_email, exc)

        try:
            self._send_order_delivered_whatsapp(
                delivery,
                branch=branch,
                vendor=vendor,
                agent=agent,
                vehicle=vehicle,
                driver_name=driver_name,
                vehicle_no=vehicle_no,
                goods=goods,
                boxes=boxes,
                exit_time=exit_time,
            )
        except Exception as exc:
            logger.error("Failed order-delivered WhatsApp for %s: %s", delivery.id, exc)

        self.db.commit()
        return {"emailsSent": len(sent), "recipients": sent}

    def _order_delivered_phones(self, vendor, agent) -> list[tuple[str, str]]:
        """Distributor and driver mobiles. The greeting uses each person's name."""
        from app.models.delivery_entities import DeliveryAgent, Distributor
        from app.utils.phone import normalize_phone

        targets: list[tuple[str, str]] = []
        seen: set[str] = set()

        def add(phone: str | None, name: str) -> None:
            if not phone or not str(phone).strip():
                return
            try:
                key = normalize_phone(str(phone))
            except Exception:
                key = str(phone).strip()
            if not key or key in seen:
                return
            seen.add(key)
            targets.append((str(phone).strip(), name))

        if isinstance(vendor, Distributor):
            vendor_label = (vendor.contactPerson or vendor.vendorName or "Distributor").strip()
            add(vendor.phone, vendor_label)
            add(getattr(vendor, "dispatchPhone", None), vendor_label)
            for dist_user in (
                self.db.query(User)
                .filter(
                    User.role == Role.DISTRIBUTOR.value,
                    User.distributorId == vendor.id,
                    User.isActive == True,  # noqa: E712
                )
                .all()
            ):
                add(dist_user.phone, dist_user.name or vendor_label)

        if isinstance(agent, DeliveryAgent):
            driver_label = (agent.name or "Driver").strip() or "Driver"
            add(agent.phone, driver_label)
            if agent.userId:
                agent_user = self.db.get(User, agent.userId)
                if agent_user:
                    add(agent_user.phone, agent_user.name or driver_label)
        return targets

    def _send_order_delivered_whatsapp(
        self,
        delivery,
        *,
        branch,
        vendor,
        agent,
        vehicle,
        driver_name: str,
        vehicle_no: str,
        goods: str,
        boxes: int,
        exit_time,
    ) -> None:
        """conninter_hospital_order_delivered after the checkout QR is scanned."""
        from app.models import HospitalChain
        from app.models.delivery_entities import DockAssignment, GrnRecord, ReceivingDock
        from app.services.delivery_pass_image import item_line
        from app.utils.timezone import format_ist_clock

        hospital_name = branch.name if branch else "Hospital"
        if branch is not None:
            chain = getattr(branch, "hospitalChain", None)
            if chain is None and getattr(branch, "hospitalChainId", None):
                chain = self.db.get(HospitalChain, branch.hospitalChainId)
            chain_name = getattr(chain, "name", None) if chain is not None else None
            if isinstance(chain_name, str) and chain_name.strip():
                hospital_name = chain_name.strip()
        branch_name = branch.name if branch else "—"
        branch_address = self._branch_address(branch) if branch else "—"

        dock = (
            self.db.query(ReceivingDock)
            .join(DockAssignment, DockAssignment.dockId == ReceivingDock.id)
            .filter(DockAssignment.deliveryId == delivery.id)
            .order_by(DockAssignment.assignedAt.desc())
            .first()
        )
        receiving_department = (
            dock.dockName.strip() if dock is not None and (dock.dockName or "").strip() else "Receiving"
        )

        grn = (
            self.db.query(GrnRecord)
            .filter(GrnRecord.deliveryId == delivery.id)
            .first()
        )
        delivery_reference = (
            grn.grnNumber.strip()
            if grn is not None and (grn.grnNumber or "").strip()
            else delivery.deliveryNumber
        )

        order_day = getattr(delivery, "expectedDeliveryDate", None)
        if order_day is not None and hasattr(order_day, "strftime") and not hasattr(order_day, "hour"):
            order_date = order_day.strftime("%d %b %Y")
        else:
            order_source = delivery.createdAt or delivery.expectedArrivalTime
            order_date = format_ist_datetime(order_source, "%d %b %Y") if order_source else "—"
        delivery_date = format_ist_datetime(exit_time, "%d %b %Y") if exit_time else "—"
        delivery_time = format_ist_clock(exit_time) if exit_time else "—"

        items = list(getattr(delivery, "items", None) or [])
        item_text = item_line(delivery, items)
        quantity = str(boxes) if boxes else "—"
        plate = vehicle.registrationNumber if vehicle is not None else vehicle_no
        plate = (plate or "—").strip() or "—"

        details = {
            "hospital_name": hospital_name,
            "branch_name": branch_name or "—",
            "branch_address": branch_address or "—",
            "receiving_department": receiving_department,
            "order_id": delivery.deliveryNumber,
            "po_number": (delivery.poNumber or "").strip() or "—",
            "order_date": order_date or "—",
            "items": item_text or goods or "—",
            "total_quantity": quantity,
            "delivered_by": driver_name or "Driver",
            "vehicle_number": plate,
            "delivery_date": delivery_date or "—",
            "delivery_time": delivery_time or "—",
            "delivery_reference": delivery_reference or delivery.deliveryNumber,
        }
        for phone, recipient_name in self._order_delivered_phones(vendor, agent):
            try:
                sent = self.whatsapp.send_order_delivered(
                    phone,
                    recipient_name=recipient_name,
                    **details,
                )
                if not sent:
                    logger.warning(
                        "Order delivered template was not sent to %s for %s",
                        phone,
                        delivery.deliveryNumber,
                    )
            except Exception as exc:
                logger.error(
                    "Failed order-delivered WhatsApp to %s for %s: %s",
                    phone,
                    delivery.deliveryNumber,
                    exc,
                )

    def _add_system_notification(self, recipient_id: str, message: str) -> None:
        self.db.add(Notification(recipientId=recipient_id, visitId=None, message=message))

    def _receiving_users(self, branch_id: str) -> list[User]:
        return (
            self.db.query(User)
            .filter(
                User.branchId == branch_id,
                User.role == Role.RECEIVING.value,
                User.isActive == True,  # noqa: E712
            )
            .all()
        )

    def _hospital_admins_for_branch(self, branch_id: str) -> list[User]:
        return (
            self.db.query(User)
            .filter(
                User.branchId == branch_id,
                User.role == Role.HOSPITAL_ADMIN.value,
                User.isActive == True,  # noqa: E712
            )
            .all()
        )

    def _security_users(self, branch_id: str) -> list[User]:
        return (
            self.db.query(User)
            .filter(
                User.branchId == branch_id,
                User.role.in_([Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value]),
                User.isActive == True,  # noqa: E712
            )
            .all()
        )

    def get_unread_notifications(self, user_id: str) -> list[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.recipientId == user_id, Notification.read == False)  # noqa: E712
            .order_by(Notification.createdAt.desc())
            .all()
        )

    def mark_as_read(self, notification_id: str, user_id: str) -> Notification:
        from fastapi import HTTPException

        notification = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.recipientId == user_id)
            .first()
        )
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found or access denied.")
        notification.read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification
