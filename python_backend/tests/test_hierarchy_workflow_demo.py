"""
Demo integration test for the department-hierarchy appointment workflow.

Flow: Public booking → Doctor approval → Security ID verify → Check-in → Check-out → Analytics
"""
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.models.enums import Role, VisitStatus
from app.services.analytics_service import AnalyticsService
from app.services.appointments_service import AppointmentsService
from app.services.security_service import SecurityService
from app.services.staff_service import StaffService
from app.services.visitors_service import VisitorsService
from app.utils.timezone import now_ist


def _make_visitor():
    return SimpleNamespace(
        id="visitor-1",
        firstName="Ananya",
        middleName=None,
        lastName="Iyer",
        phone="9123456789",
        email="ananya@example.com",
        company=None,
        designation=None,
        photo=None,
    )


def _make_doctor():
    return SimpleNamespace(
        id="doc-1",
        name="Dr. Arjun Desai",
        phone="7003636111",
        role=Role.STAFF.value,
        userType="DOCTOR",
        subDepartmentId="sub-1",
        isActive=True,
    )


def _make_visit():
    now = datetime.utcnow()
    return SimpleNamespace(
        id="visit-demo-1",
        status=VisitStatus.REQUEST_SENT.value,
        branchId="branch-1",
        departmentId="dept-1",
        subDepartmentId="sub-1",
        staffId="doc-1",
        staffName="Dr. Arjun Desai",
        staffPhone="7003636111",
        staff=_make_doctor(),
        visitor=_make_visitor(),
        visitorId="visitor-1",
        purpose="Cardiology follow-up",
        visitSubType=None,
        appointmentDate=now - timedelta(hours=1),
        appointmentMode="IN_PERSON",
        visitorPassId=None,
        visitorType=None,
        idProofVerified=False,
        idProofType=None,
        idProofNumber=None,
        verifiedBySecurityId=None,
        checkInOtp=None,
        checkInOtpExpiry=None,
        checkInTime=None,
        checkOutTime=None,
        durationMinutes=None,
        totalDurationMinutes=None,
        visitCode=None,
        visitQRCode=None,
        isCodeUsed=True,
        createdAt=now,
        updatedAt=now,
        gatePassGeneratedAt=None,
        rejectionReason=None,
    )


class HierarchyWorkflowDemoTest(unittest.TestCase):
    """End-to-end demo of the hierarchy appointment workflow (mocked DB)."""

    def setUp(self) -> None:
        self.visit = _make_visit()
        self.db = MagicMock()
        self.security_user = {
            "id": "sec-1",
            "role": Role.SECURITY.value,
            "branchId": "branch-1",
        }
        self.dept_admin = {
            "role": Role.DEPARTMENT_ADMIN.value,
            "departmentId": "dept-1",
        }

        query_chain = MagicMock()
        query_chain.options.return_value = query_chain
        query_chain.filter.return_value = query_chain
        query_chain.first.return_value = self.visit
        query_chain.order_by.return_value = query_chain
        query_chain.all.return_value = [self.visit]
        self.db.query.return_value = query_chain

    def _log(self, step: int, message: str, detail: str = "") -> None:
        suffix = f" | {detail}" if detail else ""
        print(f"  Step {step}: {message}{suffix}")

    @patch("app.services.staff_service.model_to_dict", side_effect=lambda v: {"id": v.id, "status": v.status})
    @patch("app.services.security_service.model_to_dict", side_effect=lambda v: {"id": v.id, "status": v.status})
    @patch("app.services.visitors_service.model_to_dict", side_effect=lambda v: {"id": v.id, "status": v.status})
    def test_full_appointment_workflow(self, *_mocks: MagicMock) -> None:
        print("\n=== Department Hierarchy Workflow Demo ===\n")

        # Step 1 — Public booking creates REQUEST_SENT visit
        self.assertEqual(self.visit.status, VisitStatus.REQUEST_SENT.value)
        self._log(1, "Public booking", f"status={self.visit.status}, doctor={self.visit.staffName}")

        # Step 2 — Doctor approves appointment
        staff_service = StaffService(self.db)
        staff_service.notifications = MagicMock()
        def _allocate_pass(visit, assigned_by_id=None):
            visit.visitorPassId = "VP-DEMO-1"
            return SimpleNamespace(id="pass-demo-1")

        with patch.object(staff_service, "_generate_qr_base64", return_value="data:image/png;base64,abc"), patch(
            "app.services.visitor_pass_service.VisitorPassService.allocate_for_visit",
            side_effect=_allocate_pass,
        ):
            approve_result = staff_service.approve_visit(self.visit.id, "doc-1")

        self.assertEqual(self.visit.status, VisitStatus.APPROVED.value)
        staff_service.notifications.notify_admins_on_doctor_approval.assert_called_once()
        self._log(2, "Doctor approval", approve_result["message"])

        # Step 3 — Security verifies ID proof (required before check-in)
        security_service = SecurityService(self.db)
        id_result = security_service.verify_id_proof(
            self.visit.id, self.security_user, "AADHAAR", "123456789012"
        )
        self.assertTrue(self.visit.idProofVerified)
        self._log(3, "Security ID verification", id_result["message"])

        # Step 4 — Check-in blocked without ID (sanity)
        self.visit.idProofVerified = False
        visitors_service = VisitorsService(self.db)
        visitors_service.notifications = MagicMock()
        with self.assertRaises(Exception) as blocked:
            visitors_service.check_in_visitor(self.visit.id, self.security_user)
        self.assertIn("ID_PROOF_NOT_VERIFIED", str(blocked.exception.detail))
        self.visit.idProofVerified = True
        self._log(4, "Check-in guard", "blocked when ID not verified [OK]")

        # Step 5 — Security check-in
        checkin_result = visitors_service.check_in_visitor(self.visit.id, self.security_user)
        self.assertEqual(self.visit.status, VisitStatus.CHECKED_IN.value)
        self.assertIsNotNone(self.visit.checkInTime)
        visitors_service.notifications.notify_admins_on_check_in.assert_called_once()
        self._log(5, "Check-in", f"status={self.visit.status}")

        # Step 6 — Check-out with duration
        self.visit.checkInTime = now_ist() - timedelta(minutes=90)
        checkout_result = visitors_service.checkout(self.visit.id, self.security_user)
        self.assertEqual(self.visit.status, VisitStatus.CHECKED_OUT.value)
        self.assertEqual(self.visit.totalDurationMinutes, 90)
        self._log(6, "Check-out", f"duration={checkout_result['totalDurationMinutes']} min")

        # Step 7 — Analytics reflects completed appointment
        analytics = AnalyticsService(self.db)
        with patch.object(analytics, "_today_bounds") as mock_bounds, patch.object(
            analytics, "_appointment_status_breakdown", return_value={"CHECKED_OUT": 1}
        ), patch.object(
            analytics,
            "_duration_summary",
            return_value={"avgMinutes": 90, "minMinutes": 90, "maxMinutes": 90, "count": 1},
        ):
            today = datetime.now(timezone.utc)
            mock_bounds.return_value = (
                today.replace(hour=0, minute=0, second=0),
                today.replace(hour=23, minute=59, second=59),
            )
            dept = SimpleNamespace(name="Cardiology")
            self.db.get.return_value = dept

            sub_q = MagicMock()
            sub_q.filter.return_value.count.return_value = 1
            staff_q = MagicMock()
            staff_q.filter.return_value.count.return_value = 3
            visit_q = MagicMock()
            appt_q = MagicMock()
            visit_q.filter.return_value = appt_q
            today_q = MagicMock()
            today_q.count.return_value = 1
            pending_q = MagicMock()
            pending_q.count.return_value = 0
            active_q = MagicMock()
            active_q.count.return_value = 0
            completed_q = MagicMock()
            completed_q.count.return_value = 1
            appt_q.filter.side_effect = [today_q, pending_q, active_q, completed_q]
            self.db.query.side_effect = [sub_q, staff_q, visit_q]

            overview = analytics.get_department_overview("dept-1")

        self.assertEqual(overview["completedAppointments"], 1)
        self.assertEqual(overview["visitDuration"]["avgMinutes"], 90)
        self._log(7, "Dept analytics", f"completed={overview['completedAppointments']}, avg={overview['visitDuration']['avgMinutes']} min")

        print("\n=== Workflow demo PASSED ===\n")


if __name__ == "__main__":
    unittest.main(verbosity=2)
