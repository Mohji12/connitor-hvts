"""Tests for deferred visit booking notifications."""

import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from app.services.appointments_service import AppointmentsService
from app.services.visit_notification_dispatch import dispatch_new_visit_request_notifications


class VisitNotificationDispatchTests(unittest.TestCase):
    @patch("app.services.visit_notification_dispatch.SessionLocal")
    @patch("app.services.visit_notification_dispatch.NotificationsService")
    def test_dispatch_calls_all_notification_hooks(self, mock_notifications_cls, mock_session_local):
        db = MagicMock()
        mock_session_local.return_value = db

        visit = MagicMock()
        visit.id = "visit-1"
        visit.branchId = "branch-1"
        visit.departmentId = "dept-1"
        visit.subDepartmentId = "sub-1"
        visit.visitor = MagicMock()
        visit.staff = MagicMock()

        db.query.return_value.options.return_value.filter.return_value.first.return_value = visit
        db.get.side_effect = lambda model, pk: MagicMock(id=pk)

        notifications = MagicMock()
        mock_notifications_cls.return_value = notifications

        dispatch_new_visit_request_notifications("visit-1")

        notifications.notify_staff_on_visit_request.assert_called_once()
        notifications.notify_security_on_new_visit_request.assert_called_once()
        notifications.notify_visitor_booking_received.assert_called_once()
        db.close.assert_called_once()

    @patch("app.services.appointments_service.now_ist", return_value=datetime(2026, 6, 1, 8, 0, 0))
    def test_book_appointment_can_defer_notifications(self, _mock_now: MagicMock) -> None:
        db = MagicMock()
        service = AppointmentsService(db)
        service.notifications = MagicMock()

        branch = MagicMock(id="branch-1", name="Apollo")
        dept = MagicMock(id="dept-1", isActive=True, branchId="branch-1", name="Cardio", code="CARDIO")
        sub = MagicMock(id="sub-1", isActive=True, departmentId="dept-1", name="ICU")
        doctor = MagicMock(
            id="doc-1",
            name="Dr. Test",
            phone="7000000001",
            role="STAFF",
            userType="DOCTOR",
            subDepartmentId="sub-1",
            isActive=True,
        )
        db.get.side_effect = [branch, dept, sub, doctor]
        db.query.return_value.filter.return_value.first.return_value = None

        service.book_appointment(
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
            },
            defer_notifications=True,
        )

        service.notifications.notify_staff_on_visit_request.assert_not_called()
        service.notifications.notify_security_on_new_visit_request.assert_not_called()
        service.notifications.notify_visitor_booking_received.assert_not_called()


if __name__ == "__main__":
    unittest.main()
