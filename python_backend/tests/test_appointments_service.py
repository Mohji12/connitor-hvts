import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.models.enums import Role
from app.services.appointments_service import AppointmentsService


def _branch(id_: str = "branch-1"):
    branch = MagicMock()
    branch.id = id_
    branch.name = "Apollo Chennai"
    branch.city = "Chennai"
    branch.state = "TN"
    branch.hospitalChainId = "chain-1"
    return branch


def _department(id_: str = "dept-1", branch_id: str = "branch-1"):
    dept = MagicMock()
    dept.id = id_
    dept.branchId = branch_id
    dept.hospitalChainId = "chain-1"
    dept.isActive = True
    dept.name = "Cardiology"
    dept.code = "CARDIO"
    return dept


def _sub_department(id_: str = "sub-1", department_id: str = "dept-1"):
    sub = MagicMock()
    sub.id = id_
    sub.departmentId = department_id
    sub.branchId = "branch-1"
    sub.isActive = True
    sub.name = "ICU Cardiology"
    sub.code = "ICU-CARD"
    return sub


def _doctor(id_: str = "doc-1", sub_id: str = "sub-1"):
    doctor = MagicMock()
    doctor.id = id_
    doctor.name = "Dr. Arjun Desai"
    doctor.phone = "7003636111"
    doctor.role = Role.STAFF.value
    doctor.userType = "DOCTOR"
    doctor.subDepartmentId = sub_id
    doctor.isActive = True
    return doctor


class AppointmentsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = AppointmentsService(self.db)
        self.service.notifications = MagicMock()

    def test_book_appointment_invalid_doctor(self) -> None:
        self.db.get.side_effect = [_branch(), _department(), _sub_department(), None]
        with self.assertRaises(HTTPException) as ctx:
            self.service.book_appointment(
                {
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                    "subDepartmentId": "sub-1",
                    "doctorId": "missing",
                    "firstName": "Rahul",
                    "lastName": "Mehta",
                    "phone": "9123456701",
                    "appointmentDate": "2026-06-10T10:00:00+00:00",
                    "purpose": "Follow-up consultation",
                }
            )
        self.assertEqual(ctx.exception.status_code, 404)

    @patch("app.services.appointments_service.now_ist", return_value=datetime(2026, 6, 1, 8, 0, 0))
    @patch("app.services.appointments_service.model_to_dict", side_effect=lambda x: {"id": getattr(x, "id", "visit-1")})
    def test_book_appointment_creates_visit(self, _mock_serialize: MagicMock, _mock_now: MagicMock) -> None:
        branch = _branch()
        dept = _department()
        sub = _sub_department()
        doctor = _doctor()
        self.db.get.side_effect = [branch, dept, sub, doctor]
        self.db.query.return_value.filter.return_value.first.return_value = None

        result = self.service.book_appointment(
            {
                "branchId": "branch-1",
                "departmentId": "dept-1",
                "subDepartmentId": "sub-1",
                "doctorId": "doc-1",
                "firstName": "Rahul",
                "lastName": "Mehta",
                "phone": "9123456701",
                "appointmentDate": "2026-06-10T10:00:00+00:00",
                "purpose": "Follow-up consultation",
            }
        )

        self.assertEqual(result["status"], "REQUEST_SENT")
        self.db.add.assert_called()
        self.service.notifications.notify_staff_on_visit_request.assert_called_once()

    def test_get_booking_status_wrong_phone(self) -> None:
        visit = MagicMock()
        visit.visitor.phone = "9123456701"
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit
        with self.assertRaises(HTTPException) as ctx:
            self.service.get_booking_status("visit-1", "9999999999")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_list_appointments_scoped_for_staff(self) -> None:
        staff_user = {"role": Role.STAFF.value, "id": "doc-1"}
        visit = MagicMock()
        visit.visitor = MagicMock(firstName="Rahul", lastName="Mehta", phone="9123456701")
        visit.appointmentDate = datetime(2026, 6, 10, 10, 0, tzinfo=timezone.utc)

        query = MagicMock()
        query.filter.return_value = query
        query.order_by.return_value = query
        query.limit.return_value = query
        query.all.return_value = [visit]
        self.db.query.return_value.options.return_value = query

        with patch("app.services.appointments_service.model_to_dict", return_value={"id": "visit-1"}):
            rows = self.service.list_appointments({}, staff_user)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["visitor"]["firstName"], "Rahul")

    @patch("app.services.appointments_service.is_meta_whatsapp_configured", return_value=False)
    @patch("app.services.appointments_service.get_settings")
    def test_get_whatsapp_simulation_returns_context(
        self,
        mock_settings: MagicMock,
        _mock_meta: MagicMock,
    ) -> None:
        mock_settings.return_value.node_env = "development"
        mock_settings.return_value.pywhatkit_central_phone = "8625877312"

        visitor = MagicMock()
        visitor.phone = "9123456701"
        visitor.firstName = "Rahul"
        visitor.middleName = None
        visitor.lastName = "Mehta"

        visit = MagicMock()
        visit.id = "visit-1"
        visit.status = "REQUEST_SENT"
        visit.staffName = "Dr. Arjun Desai"
        visit.staffPhone = "7003636111"
        visit.smsApprovalCode = "482901"
        visit.appointmentDate = datetime(2026, 6, 10, 10, 0)
        visit.visitor = visitor
        visit.staff = None

        self.service.notifications._visitor_name.return_value = "Rahul Mehta"
        self.service.notifications._format_appt.return_value = "10 Jun 2026, 10:00 AM"
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

        result = self.service.get_whatsapp_simulation("visit-1", "9123456701")

        self.assertEqual(result["bookingId"], "visit-1")
        self.assertEqual(result["approvalCode"], "482901")
        self.assertEqual(result["doctorPhone"], "7003636111")
        self.assertIn("482901", result["outboundMessage"])
        self.assertFalse(result["supportsInteractiveButtons"])

    @patch("app.services.appointments_service.get_settings")
    def test_get_whatsapp_simulation_wrong_phone(self, mock_settings: MagicMock) -> None:
        mock_settings.return_value.node_env = "development"

        visit = MagicMock()
        visit.visitor.phone = "9123456701"
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

        with self.assertRaises(HTTPException) as ctx:
            self.service.get_whatsapp_simulation("visit-1", "9999999999")
        self.assertEqual(ctx.exception.status_code, 404)

    @patch("app.services.appointments_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.appointments_service.is_demo_mode_enabled", return_value=False)
    @patch("app.services.appointments_service.get_settings")
    def test_get_whatsapp_simulation_blocked_in_production(
        self,
        mock_settings: MagicMock,
        _mock_demo: MagicMock,
        _mock_test: MagicMock,
    ) -> None:
        mock_settings.return_value.node_env = "production"

        with self.assertRaises(HTTPException) as ctx:
            self.service.get_whatsapp_simulation("visit-1", "9123456701")
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
