import unittest
from datetime import datetime
from unittest.mock import ANY, MagicMock, patch

from app.models.enums import AppointmentMode, Role, VisitStatus
from app.services.notifications_service import NotificationsService
from app.services.visitors_service import VisitorsService


def _visit(
    *,
    visit_id: str = "visit-1",
    branch_id: str = "branch-1",
    appointment_date: datetime | None = None,
) -> MagicMock:
    visit = MagicMock()
    visit.id = visit_id
    visit.branchId = branch_id
    visit.departmentId = "dept-1"
    visit.subDepartmentId = None
    visit.appointmentDate = appointment_date or datetime(2026, 6, 10, 10, 0, 0)
    visit.purpose = "Follow-up"
    visit.doctorFeedback = None
    visit.checkInOtp = "123456"
    visit.visitCode = "ABC123"
    visit.visitQRCode = "data:image/png;base64,iVBORw0KGgo="
    visit.checkInTime = datetime(2026, 6, 10, 10, 30, 0)
    visit.appointmentMode = AppointmentMode.IN_PERSON.value
    visit.meetingJoinUrl = None
    visit.meetingHostUrl = None
    visit.zoomJoinUrl = None
    visit.zoomStartUrl = None
    return visit


def _visitor() -> MagicMock:
    visitor = MagicMock()
    visitor.firstName = "Rahul"
    visitor.middleName = None
    visitor.lastName = "Mehta"
    visitor.email = "rahul@example.com"
    visitor.phone = "9123456701"
    return visitor


def _doctor() -> MagicMock:
    doctor = MagicMock()
    doctor.id = "doc-1"
    doctor.name = "Dr. Arjun Desai"
    doctor.email = "arjun@hospital.com"
    doctor.phone = "7003636111"
    return doctor


def _branch() -> MagicMock:
    branch = MagicMock()
    branch.id = "branch-1"
    branch.name = "Apollo Chennai"
    branch.street = "123 Main St"
    branch.city = "Chennai"
    branch.state = "TN"
    branch.pinCode = "600001"
    branch.country = "India"
    return branch


class AppointmentNotificationsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = NotificationsService(self.db)
        self.service.email = MagicMock()
        self.service.sms = MagicMock()
        self.service.whatsapp = MagicMock()
        self.service.calendar = MagicMock()

    @patch.object(NotificationsService, "_send_calendar_invite")
    def test_booking_notifies_visitor_email_and_sms(self, _mock_calendar: MagicMock) -> None:
        visit = _visit()
        doctor = _doctor()
        visitor = _visitor()
        branch = _branch()
        self.db.get.return_value = branch

        self.service.notify_visitor_booking_received(
            visit, doctor, visitor, branch=branch, department=None
        )

        self.service.email.send_booking_confirmation_email.assert_called_once()
        call_kwargs = self.service.email.send_booking_confirmation_email.call_args.kwargs
        self.assertEqual(call_kwargs["visitor_name"], "Rahul Mehta")
        self.assertEqual(call_kwargs["doctor_name"], doctor.name)
        self.assertEqual(call_kwargs["booking_id"], visit.id)

        self.service.sms.send_message.assert_called_once()
        sms_args = self.service.sms.send_message.call_args[0]
        self.assertEqual(sms_args[0], visitor.phone)
        self.assertIn("Awaiting doctor approval", sms_args[1])

    @patch.object(NotificationsService, "_send_calendar_invite")
    def test_booking_online_mentions_video_link_in_sms(self, _mock_calendar: MagicMock) -> None:
        visit = _visit()
        visit.appointmentMode = AppointmentMode.ONLINE.value
        doctor = _doctor()
        visitor = _visitor()
        branch = _branch()
        self.db.get.return_value = branch

        self.service.notify_visitor_booking_received(
            visit, doctor, visitor, branch=branch, department=None
        )

        sms_text = self.service.sms.send_message.call_args[0][1]
        self.assertIn("Online", sms_text)
        self.assertIn("video consultation link", sms_text)

    @patch("app.services.visit_approval_link_service.VisitApprovalLinkService")
    @patch("app.services.notifications_service.random.randint", return_value=482901)
    def test_booking_notifies_doctor_email_only_by_default(
        self, _mock_rand: MagicMock, mock_link_cls: MagicMock
    ) -> None:
        visit = _visit()
        visit.status = VisitStatus.REQUEST_SENT.value
        visit.smsApprovalCode = None
        doctor = _doctor()
        visitor = _visitor()
        mock_link_cls.return_value.create_link.return_value = (
            "tok",
            "http://localhost:3000/approve-visit?token=tok",
            "http://localhost:3000/approve-visit/reschedule?token=tok",
        )

        self.service.notify_staff_on_visit_request(visit, doctor, visitor)

        self.service.email.send_doctor_approval_request_email.assert_called_once_with(
            doctor.email,
            doctor_name=doctor.name,
            visitor_name="Rahul Mehta",
            appointment_date=ANY,
            purpose="Follow-up",
            approval_url="http://localhost:3000/approve-visit?token=tok",
            open_slot_request=False,
            meeting_mode="Offline",
        )
        self.service.sms.send_sms_only.assert_not_called()
        self.service.whatsapp.send_appointment_approval_buttons.assert_not_called()
        self.assertEqual(visit.smsApprovalCode, "482901")
        self.db.commit.assert_called_once()

    @patch("app.services.visit_approval_link_service.VisitApprovalLinkService")
    @patch("app.services.notifications_service.random.randint", return_value=482901)
    @patch("app.config.get_settings")
    def test_booking_sends_doctor_approval_sms_when_whatsapp_flag_enabled(
        self,
        mock_settings: MagicMock,
        _mock_rand: MagicMock,
        mock_link_cls: MagicMock,
    ) -> None:
        mock_settings.return_value.doctor_approval_whatsapp_enabled = True
        mock_settings.return_value.whatsapp_provider = "twilio"
        visit = _visit()
        visit.status = VisitStatus.REQUEST_SENT.value
        visit.smsApprovalCode = None
        doctor = _doctor()
        visitor = _visitor()
        mock_link_cls.return_value.create_link.return_value = (
            "tok",
            "https://staging.example.com/approve-visit?token=tok",
            "https://staging.example.com/approve-visit/reschedule?token=tok",
        )

        with patch("app.config.is_wapblaster_configured", return_value=False):
            self.service.notify_staff_on_visit_request(visit, doctor, visitor)

        self.service.sms.send_sms_only.assert_called_once_with(
            doctor.phone,
            ANY,
        )
        sms_text = self.service.sms.send_sms_only.call_args[0][1]
        self.assertIn("https://staging.example.com/approve-visit?token=tok", sms_text)
        self.assertIn("Rahul Mehta", sms_text)
        self.service.whatsapp.send_appointment_approval_buttons.assert_not_called()

    @patch("app.services.visit_approval_link_service.VisitApprovalLinkService")
    @patch("app.services.notifications_service.random.randint", return_value=482901)
    def test_custom_slot_request_emails_doctor_datetime_and_mode(
        self, _mock_rand: MagicMock, mock_link_cls: MagicMock
    ) -> None:
        visit = _visit(appointment_date=datetime(2026, 8, 16, 10, 0, 0))
        visit.purpose = "[CUSTOM SLOT] Need a visit"
        visit.appointmentMode = AppointmentMode.ONLINE.value
        visit.status = VisitStatus.REQUEST_SENT.value
        visit.smsApprovalCode = None
        doctor = _doctor()
        visitor = _visitor()
        mock_link_cls.return_value.create_link.return_value = (
            "tok",
            "http://localhost:3000/approve-visit?token=tok",
            "http://localhost:3000/approve-visit/reschedule?token=tok",
        )

        self.service.notify_staff_on_visit_request(visit, doctor, visitor)

        self.service.email.send_doctor_approval_request_email.assert_called_once_with(
            doctor.email,
            doctor_name=doctor.name,
            visitor_name="Rahul Mehta",
            appointment_date=ANY,
            purpose="Need a visit",
            approval_url="http://localhost:3000/approve-visit?token=tok",
            open_slot_request=False,
            meeting_mode="Online",
        )
        appt_arg = self.service.email.send_doctor_approval_request_email.call_args.kwargs[
            "appointment_date"
        ]
        self.assertNotIn("to be decided", appt_arg)
        self.service.sms.send_sms_only.assert_not_called()

    @patch.object(NotificationsService, "_send_calendar_invite")
    def test_open_slot_request_skips_visitor_sms(
        self, mock_calendar: MagicMock
    ) -> None:
        visit = _visit(appointment_date=datetime(2026, 8, 16, 0, 0, 0))
        visit.purpose = "[CUSTOM SLOT] Need a visit"
        doctor = _doctor()
        visitor = _visitor()
        branch = _branch()
        self.db.get.return_value = branch

        self.service.notify_visitor_booking_received(
            visit, doctor, visitor, branch=branch, department=None
        )

        mock_calendar.assert_not_called()
        self.service.sms.send_message.assert_not_called()
        kwargs = self.service.email.send_booking_confirmation_email.call_args.kwargs
        self.assertEqual(kwargs["appointment_date"], "to be decided by the doctor")
        self.assertEqual(kwargs["purpose"], "Need a visit")

    def test_booking_notifies_security_email_and_sms(self) -> None:
        visit = _visit()
        doctor = _doctor()
        visitor = _visitor()
        security = MagicMock()
        security.id = "sec-1"
        security.email = "security@hospital.com"
        security.phone = "9000000001"
        self.db.query.return_value.filter.return_value.all.return_value = [security]

        self.service.notify_security_on_new_visit_request(visit, doctor, visitor)

        self.service.email.send_notification.assert_called_once()
        self.service.sms.send_message.assert_called_once()
        sms_phone, sms_text = self.service.sms.send_message.call_args[0]
        self.assertEqual(sms_phone, security.phone)
        self.assertIn("Pending doctor approval", sms_text)
        self.db.commit.assert_called_once()

    @patch.object(NotificationsService, "_send_calendar_invite")
    def test_approval_sends_gate_pass_email_with_qr(self, _mock_calendar: MagicMock) -> None:
        visit = _visit()
        doctor = _doctor()
        visitor = _visitor()

        self.service.notify_visitor_approval(visit, visitor, doctor)

        self.service.email.send_gate_pass_email.assert_called_once()
        call_kwargs = self.service.email.send_gate_pass_email.call_args.kwargs
        self.assertEqual(call_kwargs["visitor_name"], "Rahul Mehta")
        self.assertEqual(call_kwargs["check_in_otp"], "123456")
        self.assertEqual(call_kwargs["qr_image_base64"], visit.visitQRCode)

        self.service.sms.send_message.assert_called_once()
        sms_text = self.service.sms.send_message.call_args[0][1]
        self.assertIn("Check-in OTP: 123456", sms_text)

    def test_approval_notifies_doctor_sms(self) -> None:
        visit = _visit()
        doctor = _doctor()
        visitor = _visitor()

        self.service.notify_staff_on_approval(visit, doctor, visitor)

        self.service.email.send_notification.assert_called_once()
        self.service.sms.send_message.assert_called_once()
        sms_phone, sms_text = self.service.sms.send_message.call_args[0]
        self.assertEqual(sms_phone, doctor.phone)
        self.assertIn("You approved", sms_text)
        self.db.commit.assert_called_once()

    @patch.object(NotificationsService, "_security_users")
    def test_approval_notifies_security_sms(self, mock_security_users: MagicMock) -> None:
        visit = _visit()
        doctor = _doctor()
        visitor = _visitor()
        security = MagicMock()
        security.id = "sec-1"
        security.email = "security@hospital.com"
        security.phone = "9000000001"
        mock_security_users.return_value = [security]

        self.db.query.return_value.filter.return_value.all.return_value = []

        self.service.notify_admins_on_doctor_approval(visit, doctor, visitor)

        self.assertEqual(self.service.sms.send_message.call_count, 1)
        sms_phone, sms_text = self.service.sms.send_message.call_args[0]
        self.assertEqual(sms_phone, security.phone)
        self.assertIn("Prepare for check-in", sms_text)
        self.db.commit.assert_called_once()

    @patch.object(NotificationsService, "_security_users")
    def test_approval_notifies_admins_and_security_sms(self, mock_security_users: MagicMock) -> None:
        visit = _visit()
        doctor = _doctor()
        visitor = _visitor()
        security = MagicMock()
        security.id = "sec-1"
        security.email = "security@hospital.com"
        security.phone = "9000000001"
        super_admin = MagicMock()
        super_admin.id = "sa-1"
        super_admin.email = "admin@hospital.com"
        super_admin.phone = "9000000002"
        mock_security_users.return_value = [security]
        self.db.query.return_value.filter.return_value.all.return_value = [super_admin]

        self.service.notify_admins_on_doctor_approval(visit, doctor, visitor)

        self.assertEqual(self.service.sms.send_message.call_count, 2)
        phones = {c[0][0] for c in self.service.sms.send_message.call_args_list}
        self.assertEqual(phones, {super_admin.phone, security.phone})
        self.db.commit.assert_called_once()

    @patch.object(NotificationsService, "_security_users")
    def test_approval_online_notifies_security_no_check_in(
        self, mock_security_users: MagicMock
    ) -> None:
        visit = _visit()
        visit.appointmentMode = AppointmentMode.ONLINE.value
        doctor = _doctor()
        visitor = _visitor()
        security = MagicMock()
        security.id = "sec-1"
        security.email = "security@hospital.com"
        security.phone = "9000000001"
        mock_security_users.return_value = [security]
        self.db.query.return_value.filter.return_value.all.return_value = []

        self.service.notify_admins_on_doctor_approval(visit, doctor, visitor)

        sms_text = self.service.sms.send_message.call_args[0][1]
        self.assertIn("Online", sms_text)
        self.assertIn("no physical check-in", sms_text.lower())

    def test_check_in_rejects_online_visit(self) -> None:
        visit = _visit()
        visit.status = VisitStatus.APPROVED.value
        visit.appointmentMode = AppointmentMode.ONLINE.value
        visit.idProofVerified = True
        visit.visitor = _visitor()
        visit.staff = _doctor()
        visit.branchId = "branch-1"

        visitors_service = VisitorsService(self.db)
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

        security_user = {"id": "sec-1", "role": Role.SECURITY.value, "branchId": "branch-1"}
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            visitors_service.check_in_visitor(visit.id, security_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("online appointment", ctx.exception.detail.lower())

    def test_check_in_notifies_doctor_patient_arrived(self) -> None:
        visit = _visit()
        visit.status = VisitStatus.APPROVED.value
        visit.appointmentDate = datetime(2026, 6, 10, 10, 0, 0)
        visit.idProofVerified = True
        visit.visitor = _visitor()
        visit.staff = _doctor()
        visit.branchId = "branch-1"

        visitors_service = VisitorsService(self.db)
        visitors_service.notifications = MagicMock()

        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

        security_user = {"id": "sec-1", "role": Role.SECURITY.value, "branchId": "branch-1"}
        result = visitors_service.check_in_visitor(visit.id, security_user)

        self.assertTrue(result["success"])
        visitors_service.notifications.notify_doctor_patient_arrived.assert_called_once_with(
            visit, visit.staff, visit.visitor
        )


if __name__ == "__main__":
    unittest.main()
