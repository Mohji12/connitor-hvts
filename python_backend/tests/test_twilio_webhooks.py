import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.models.enums import Role, VisitStatus
from app.services.visit_approval_reply_service import VisitApprovalReplyService, parse_approval_reply
from app.services.twilio_webhook_service import (
    TwilioWebhookService,
    build_twiml,
)
from main import app


class ParseSmsReplyTests(unittest.TestCase):
    def test_yes_with_space(self) -> None:
        self.assertEqual(parse_approval_reply("YES 482901"), ("approve", "482901"))

    def test_no_without_space(self) -> None:
        self.assertEqual(parse_approval_reply("no482901"), ("reject", "482901"))

    def test_single_letter_y(self) -> None:
        self.assertEqual(parse_approval_reply("Y 482901"), ("approve", "482901"))

    def test_action_only(self) -> None:
        self.assertEqual(parse_approval_reply("YES"), ("approve", None))

    def test_invalid(self) -> None:
        self.assertIsNone(parse_approval_reply("maybe 482901"))


class BuildTwimlTests(unittest.TestCase):
    def test_escapes_xml(self) -> None:
        twiml = build_twiml("Approved & done")
        self.assertIn("Approved &amp; done", twiml)
        self.assertIn("<Response>", twiml)


class TwilioWebhookServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = TwilioWebhookService(self.db)
        self.service.approval.staff_service = MagicMock()

    def _doctor(self) -> MagicMock:
        doctor = MagicMock()
        doctor.id = "doc-1"
        doctor.phone = "7003636111"
        doctor.role = Role.STAFF.value
        doctor.isActive = True
        return doctor

    def _visit(self, *, code: str = "482901") -> MagicMock:
        visit = MagicMock()
        visit.id = "visit-1"
        visit.smsApprovalCode = code
        visit.staffId = "doc-1"
        visit.status = VisitStatus.REQUEST_SENT.value
        visitor = MagicMock()
        visitor.firstName = "Rahul"
        visitor.lastName = "Mehta"
        visit.visitor = visitor
        return visit

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_approve_returns_twiml(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        doctor = self._doctor()
        visit = self._visit()
        mock_find_doctor.return_value = doctor
        mock_find_visit.return_value = visit

        twiml = self.service.handle_inbound_sms(body="YES 482901", from_phone="+917003636111")

        self.service.approval.staff_service.approve_visit.assert_called_once_with("visit-1", "doc-1")
        self.assertIn("Approved", twiml)
        self.assertIn("Rahul Mehta", twiml)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_reject_calls_staff_service(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        doctor = self._doctor()
        visit = self._visit()
        mock_find_doctor.return_value = doctor
        mock_find_visit.return_value = visit

        twiml = self.service.handle_inbound_sms(body="NO482901", from_phone="+917003636111")

        self.service.approval.staff_service.reject_visit.assert_called_once_with(
            "visit-1", "doc-1", "Declined via WhatsApp"
        )
        self.assertIn("Rejected", twiml)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    def test_unknown_doctor_phone(self, mock_find_doctor: MagicMock) -> None:
        mock_find_doctor.return_value = None
        twiml = self.service.handle_inbound_sms(body="YES 482901", from_phone="+919999999999")
        self.assertIn("not registered", twiml)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_wrong_code_message(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        mock_find_doctor.return_value = self._doctor()
        mock_find_visit.return_value = None

        twiml = self.service.handle_inbound_sms(body="YES 000000", from_phone="+917003636111")
        self.assertIn("No pending appointment", twiml)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_already_processed_http_exception(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        mock_find_doctor.return_value = self._doctor()
        mock_find_visit.return_value = self._visit()
        self.service.approval.staff_service.approve_visit.side_effect = HTTPException(
            status_code=409, detail="already processed"
        )

        twiml = self.service.handle_inbound_sms(body="YES 482901", from_phone="+917003636111")
        self.assertIn("already processed", twiml.lower())

    def test_invalid_reply(self) -> None:
        twiml = self.service.handle_inbound_sms(body="hello", from_phone="+917003636111")
        self.assertIn("Unrecognized reply", twiml)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_whatsapp_from_prefix_accepted(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        doctor = self._doctor()
        visit = self._visit()
        mock_find_doctor.return_value = doctor
        mock_find_visit.return_value = visit

        twiml = self.service.handle_inbound_sms(
            body="YES 482901",
            from_phone="whatsapp:+917003636111",
        )
        self.assertIn("Approved", twiml)


class TwilioWebhookRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.routers.twilio_webhooks.TwilioWebhookService")
    def test_inbound_sms_route(self, mock_service_cls: MagicMock) -> None:
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.resolve_webhook_url.return_value = "http://testserver/api/webhooks/twilio/sms"
        mock_service.handle_inbound_sms.return_value = build_twiml("Approved.")

        response = self.client.post(
            "/api/webhooks/twilio/sms",
            data={"Body": "YES 482901", "From": "+917003636111", "To": "+16592267175"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "application/xml")
        self.assertIn("Approved", response.text)
        mock_service.validate_request.assert_called_once()
        mock_service.handle_inbound_sms.assert_called_once_with(
            body="YES 482901",
            from_phone="+917003636111",
        )

    def test_missing_body_returns_400(self) -> None:
        response = self.client.post(
            "/api/webhooks/twilio/sms",
            data={"From": "+917003636111"},
        )
        self.assertEqual(response.status_code, 400)


class ValidateRequestTests(unittest.TestCase):
    @patch("app.services.twilio_webhook_service.verify_twilio_signature", return_value=True)
    @patch("app.services.twilio_webhook_service.is_twilio_configured", return_value=True)
    @patch("app.services.twilio_webhook_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.twilio_webhook_service.get_settings")
    def test_validate_request_calls_signature_check(
        self,
        mock_settings: MagicMock,
        _mock_test_mode: MagicMock,
        _mock_twilio: MagicMock,
        mock_verify: MagicMock,
    ) -> None:
        mock_settings.return_value.twilio_auth_token = "token"
        service = TwilioWebhookService(MagicMock())
        service.settings = mock_settings.return_value
        service.validate_request(
            url="https://example.com/api/webhooks/twilio/sms",
            params={"Body": "YES 482901"},
            signature="sig",
        )
        mock_verify.assert_called_once()

    @patch("app.services.twilio_webhook_service.is_test_mode_enabled", return_value=True)
    def test_validate_request_skips_in_test_mode(self, _mock_test_mode: MagicMock) -> None:
        service = TwilioWebhookService(MagicMock())
        service.validate_request(url="http://x", params={}, signature=None)


if __name__ == "__main__":
    unittest.main()
