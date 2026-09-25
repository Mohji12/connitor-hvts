import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.services.gate_pass_service import GatePassService


def _visit(*, status: str = "APPROVED", is_code_used: bool = True):
    visitor = MagicMock()
    visitor.id = "visitor-1"
    visitor.firstName = "Rahul"
    visitor.lastName = "Mehta"
    visitor.phone = "9123456701"
    visitor.email = "rahul@example.com"
    visitor.photo = None
    visitor.company = None

    staff = MagicMock()
    staff.name = "Dr. Arjun"

    visit = MagicMock()
    visit.id = "visit-1"
    visit.visitorId = "visitor-1"
    visit.visitor = visitor
    visit.staff = staff
    visit.status = status
    visit.visitCode = "654321"
    visit.checkInOtp = "654321"
    visit.checkInOtpExpiry = datetime.utcnow() + timedelta(hours=2)
    visit.isCodeUsed = is_code_used
    visit.branchId = "branch-1"
    visit.visitCategory = "MEETING"
    visit.appointmentDate = datetime(2020, 1, 1, 10, 0, 0)
    visit.idProofVerified = False
    visit.purpose = "Consultation"
    return visit


class GatePassScanQrTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = GatePassService(self.db)
        self.service.notifications = MagicMock()

    def test_parse_qr_json_payload(self) -> None:
        payload = json.dumps({"visitId": "visit-1", "visitCode": "654321"})
        visit_id, visit_code, _qr_type = self.service._parse_qr_payload(payload)
        self.assertEqual(visit_id, "visit-1")
        self.assertEqual(visit_code, "654321")

    @patch("app.services.gate_pass_service.now_ist")
    @patch("app.services.gate_pass_service.model_to_dict_visit", return_value={"id": "visit-1"})
    def test_scan_check_in_qr_returns_visitor_details(
        self, _mock_serialize: MagicMock, mock_now: MagicMock
    ) -> None:
        visit = _visit()
        mock_now.return_value = datetime.utcnow()
        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = visit
        self.db.query.return_value = query
        payload = json.dumps({"visitId": "visit-1", "visitCode": "654321"})
        user = {"branchId": "branch-1", "id": "security-1"}

        result = self.service.scan_check_in_qr(payload, user)

        self.assertTrue(result["success"])
        self.assertEqual(result["visitId"], "visit-1")
        self.assertTrue(result["canCheckIn"])
        self.assertFalse(result.get("canCheckOut"))

    @patch("app.services.gate_pass_service.model_to_dict_visit", return_value={"id": "visit-1", "status": "CHECKED_IN"})
    def test_scan_check_in_qr_checked_in_returns_checkout(self, _mock_serialize: MagicMock) -> None:
        visit = _visit(status="CHECKED_IN")
        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = visit
        self.db.query.return_value = query
        payload = json.dumps({"visitId": "visit-1", "visitCode": "654321"})
        user = {"branchId": "branch-1", "id": "security-1"}

        result = self.service.scan_check_in_qr(payload, user)

        self.assertTrue(result["success"])
        self.assertFalse(result["canCheckIn"])
        self.assertTrue(result["canCheckOut"])

    def test_scan_check_in_qr_invalid_payload(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service.scan_check_in_qr("not-json-or-otp", {"branchId": "branch-1"})
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "INVALID_QR_CODE")

    @patch("app.services.visit_slot_extension_service.now_ist")
    @patch("app.services.gate_pass_service.now_ist")
    def test_scan_check_in_qr_rejects_before_slot_start(
        self, mock_gate_now: MagicMock, mock_clock_now: MagicMock
    ) -> None:
        visit = _visit()
        visit.bookedSlot = None
        visit.appointmentMode = "IN_PERSON"
        visit.visitSubType = None
        visit.appointmentDate = datetime(2026, 8, 16, 18, 55, 0)
        visit.checkInOtpExpiry = datetime(2026, 8, 16, 23, 59, 0)
        now = datetime(2026, 8, 16, 18, 51, 0)
        mock_gate_now.return_value = now
        mock_clock_now.return_value = now
        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = visit
        self.db.query.return_value = query
        payload = json.dumps({"visitId": "visit-1", "visitCode": "654321"})
        user = {"branchId": "branch-1", "id": "security-1"}

        with self.assertRaises(HTTPException) as ctx:
            self.service.scan_check_in_qr(payload, user)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("SLOT_NOT_STARTED", str(ctx.exception.detail))
        self.assertIn("6:55", str(ctx.exception.detail))


if __name__ == "__main__":
    unittest.main()
