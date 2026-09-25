import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.models.enums import VisitStatus
from app.services.visit_approval_link_service import VisitApprovalLinkService


def _visit(*, status: str = VisitStatus.REQUEST_SENT.value) -> MagicMock:
    visitor = MagicMock()
    visitor.firstName = "Rahul"
    visitor.middleName = None
    visitor.lastName = "Mehta"

    staff = MagicMock()
    staff.name = "Dr. Arjun"
    staff.id = "doc-1"

    visit = MagicMock()
    visit.id = "visit-1"
    visit.status = status
    visit.staffId = "doc-1"
    visit.staff = staff
    visit.visitor = visitor
    visit.appointmentDate = datetime(2026, 6, 10, 10, 0, 0)
    visit.purpose = "Follow-up"
    visit.appointmentMode = "IN_PERSON"
    visit.approvalLinkTokenHash = None
    visit.approvalLinkExpiresAt = None
    visit.approvalLinkUsedAt = None
    return visit


class VisitApprovalLinkServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = VisitApprovalLinkService(self.db)
        self.service._staff = MagicMock()

    @patch("app.services.visit_approval_link_service.get_doctor_approval_link_url", return_value="http://localhost:3000")
    @patch("app.services.visit_approval_link_service.now_ist")
    def test_create_link_returns_localhost_url(self, mock_now: MagicMock, _mock_base: MagicMock) -> None:
        mock_now.return_value = datetime(2026, 6, 6, 12, 0, 0)
        visit = _visit()
        _token, url, reschedule_url = self.service.create_link(visit)
        self.assertIn("http://localhost:3000/approve-visit?token=", url)
        self.assertIn("http://localhost:3000/approve-visit/reschedule?token=", reschedule_url)
        self.assertTrue(visit.approvalLinkTokenHash)
        self.db.commit.assert_called()

    def test_approve_marks_link_used(self) -> None:
        visit = _visit()
        visit.approvalLinkExpiresAt = datetime.utcnow() + timedelta(hours=1)
        visit.approvalLinkUsedAt = None
        self.service.staff.approve_visit.return_value = {"ok": True}

        with patch.object(self.service, "_get_visit_for_token", return_value=visit):
            result = self.service.approve("raw-token-value-here-32chars-min")

        self.service.staff.approve_visit.assert_called_once_with("visit-1", "doc-1")
        self.assertEqual(result["status"], VisitStatus.APPROVED.value)
        self.assertIsNotNone(visit.approvalLinkUsedAt)
        self.assertIsNone(visit.approvalLinkTokenHash)

    def test_get_preview_rejects_used_link(self) -> None:
        visit = _visit()
        visit.approvalLinkUsedAt = datetime.utcnow()
        visit.approvalLinkExpiresAt = datetime.utcnow() + timedelta(hours=1)

        with patch.object(self.service, "_get_visit_for_token", side_effect=HTTPException(status_code=410, detail="used")):
            with self.assertRaises(HTTPException) as ctx:
                self.service.get_preview("token")
        self.assertEqual(ctx.exception.status_code, 410)


if __name__ == "__main__":
    unittest.main()
