import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.models.enums import Role, VisitStatus
from app.services.security_service import SecurityService


class SecurityServicePhase4Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = SecurityService(self.db)
        self.security_user = {
            "id": "sec-1",
            "role": Role.SECURITY.value,
            "branchId": "branch-1",
        }

    def test_verify_id_proof_requires_approved_visit(self) -> None:
        visit = MagicMock()
        visit.status = VisitStatus.REQUEST_SENT.value
        visit.branchId = "branch-1"
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

        with self.assertRaises(HTTPException) as ctx:
            self.service.verify_id_proof("visit-1", self.security_user, "AADHAAR", "1234")
        self.assertEqual(ctx.exception.status_code, 400)

    @patch("app.services.security_service.model_to_dict", return_value={"id": "visit-1"})
    def test_verify_id_proof_success(self, _mock_serialize: MagicMock) -> None:
        visit = MagicMock()
        visit.status = VisitStatus.APPROVED.value
        visit.branchId = "branch-1"
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

        result = self.service.verify_id_proof(
            "visit-1", self.security_user, "AADHAAR", "123456789012"
        )
        self.assertEqual(result["message"], "ID proof verified successfully.")
        self.assertTrue(visit.idProofVerified)

    def test_serialize_appointment_includes_check_in_times(self) -> None:
        visit = MagicMock()
        visit.id = "visit-1"
        visit.visitor.firstName = "Rahul"
        visit.visitor.middleName = None
        visit.visitor.lastName = "Mehta"
        visit.visitor.phone = "9123456701"
        visit.staff.name = "Dr. Arjun"
        visit.staffName = None
        visit.appointmentDate = None
        visit.status = VisitStatus.CHECKED_IN.value
        visit.idProofVerified = True
        visit.purpose = "Consultation"
        visit.checkInTime = MagicMock()
        visit.checkInTime.isoformat.return_value = "2026-06-10T10:30:00+05:30"
        visit.checkOutTime = None
        visit.appointmentMode = "IN_PERSON"
        visit.meetingJoinUrl = None
        visit.zoomJoinUrl = None
        visit.visitorType = None
        visit.meetingStatus = None
        visit.visitorPassId = "ELC-260816-0001"

        result = self.service._serialize_appointment(visit)

        self.assertEqual(result["checkInTime"], "2026-06-10T10:30:00+05:30")
        self.assertIsNone(result["checkOutTime"])
        self.assertEqual(result["appointmentMode"], "IN_PERSON")
        self.assertFalse(result["isOnline"])
        self.assertIsNone(result["meetingJoinUrl"])
        self.assertEqual(result["visitorPassId"], "ELC-260816-0001")

    def test_serialize_appointment_online_fields(self) -> None:
        from app.models.enums import AppointmentMode

        visit = MagicMock()
        visit.id = "visit-2"
        visit.visitor.firstName = "Priya"
        visit.visitor.middleName = None
        visit.visitor.lastName = "Sharma"
        visit.visitor.phone = "9123456702"
        visit.staff.name = "Dr. Meera"
        visit.staffName = None
        visit.appointmentDate = None
        visit.status = VisitStatus.APPROVED.value
        visit.idProofVerified = False
        visit.purpose = "Teleconsult"
        visit.checkInTime = None
        visit.checkOutTime = None
        visit.appointmentMode = AppointmentMode.ONLINE.value
        visit.meetingJoinUrl = "https://app.example.com/meet/?t=abc"
        visit.visitorPassId = None

        result = self.service._serialize_appointment(visit)

        self.assertEqual(result["appointmentMode"], "ONLINE")
        self.assertTrue(result["isOnline"])
        self.assertEqual(result["meetingJoinUrl"], "https://app.example.com/meet/?t=abc")

    def test_get_pending_appointments_returns_request_sent(self) -> None:
        visit = MagicMock()
        visit.status = VisitStatus.REQUEST_SENT.value
        visit.branchId = "branch-1"
        visit.appointmentDate = MagicMock()
        self.db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value = [
            visit
        ]
        self.service._serialize_appointment = MagicMock(return_value={"visitId": "visit-1", "status": "REQUEST_SENT"})

        result = self.service.get_pending_appointments(self.security_user)

        self.assertEqual(result["total"], 1)
        self.assertEqual(result["appointments"][0]["status"], "REQUEST_SENT")


if __name__ == "__main__":
    unittest.main()
