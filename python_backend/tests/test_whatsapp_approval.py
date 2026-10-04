import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.services.visit_approval_reply_service import (
    VisitApprovalReplyService,
    parse_approval_reply,
    parse_button_reply,
)
from app.services.whatsapp_webhook_service import WhatsAppWebhookService


class ParseButtonReplyTests(unittest.TestCase):
    def test_yes_button(self) -> None:
        self.assertEqual(parse_button_reply("yes_482901"), ("approve", "482901"))

    def test_confirm_button(self) -> None:
        self.assertEqual(parse_button_reply("confirm_482901"), ("approve", "482901"))

    def test_confirm_label(self) -> None:
        self.assertEqual(parse_button_reply("Confirm"), ("approve", None))

    def test_confirm_visit_label(self) -> None:
        self.assertEqual(parse_button_reply("Confirm Visit"), ("approve", None))

    def test_reject_visit_label(self) -> None:
        self.assertEqual(parse_button_reply("Reject Visit"), ("reject", None))

    def test_reschedule_label(self) -> None:
        self.assertEqual(parse_button_reply("Reschedule"), ("reschedule", None))

    def test_reschedule_button(self) -> None:
        self.assertEqual(parse_button_reply("reschedule_482901"), ("reschedule", "482901"))

    def test_no_button(self) -> None:
        self.assertEqual(parse_button_reply("NO_482901"), ("reject", "482901"))

    def test_confirm_text(self) -> None:
        self.assertEqual(parse_approval_reply("CONFIRM 482901"), ("approve", "482901"))

    def test_invalid(self) -> None:
        self.assertIsNone(parse_button_reply("approve_visit-1"))


class VisitApprovalButtonTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = VisitApprovalReplyService(self.db)
        self.service.staff_service = MagicMock()

    def _doctor(self) -> MagicMock:
        doctor = MagicMock()
        doctor.id = "doc-1"
        doctor.phone = "7676283924"
        return doctor

    def _visit(self) -> MagicMock:
        visit = MagicMock()
        visit.id = "visit-1"
        visit.smsApprovalCode = "482901"
        visit.visitor = MagicMock(firstName="Test", lastName="Visitor")
        return visit

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_approve_via_button(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        mock_find_doctor.return_value = self._doctor()
        mock_find_visit.return_value = self._visit()

        reply = self.service.handle_button_reply(
            from_phone="+917676283924",
            button_id="yes_482901",
        )

        self.service.staff_service.approve_visit.assert_called_once_with("visit-1", "doc-1")
        self.assertIn("Approved", reply)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_confirm_label_approves_pending_visit(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        mock_find_doctor.return_value = self._doctor()
        mock_find_visit.return_value = self._visit()

        reply = self.service.handle_button_reply(
            from_phone="918625877312",
            button_id="Confirm",
        )

        mock_find_visit.assert_called_once()
        self.assertIsNone(mock_find_visit.call_args.kwargs["code"])
        self.service.staff_service.approve_visit.assert_called_once_with("visit-1", "doc-1")
        self.assertIn("Approved", reply)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    def test_reject_via_button(
        self,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        mock_find_doctor.return_value = self._doctor()
        mock_find_visit.return_value = self._visit()

        reply = self.service.handle_button_reply(
            from_phone="+917676283924",
            button_id="no_482901",
        )

        self.service.staff_service.reject_visit.assert_called_once()
        self.assertIn("Rejected", reply)

    def test_invalid_button_id(self) -> None:
        reply = self.service.handle_button_reply(from_phone="+917676283924", button_id="maybe")
        self.assertIn("Unrecognized button", reply)

    @patch.object(VisitApprovalReplyService, "_find_doctor_by_phone")
    @patch.object(VisitApprovalReplyService, "_find_pending_visit")
    @patch.object(VisitApprovalReplyService, "_reschedule_link_message")
    def test_reschedule_button_sends_link(
        self,
        mock_link: MagicMock,
        mock_find_visit: MagicMock,
        mock_find_doctor: MagicMock,
    ) -> None:
        mock_find_doctor.return_value = self._doctor()
        mock_find_visit.return_value = self._visit()
        mock_link.return_value = "Pick time: http://localhost/reschedule"

        reply = self.service.handle_button_reply(
            from_phone="+917676283924",
            button_id="reschedule_482901",
        )

        mock_link.assert_called_once()
        self.assertIn("Pick time", reply)


class WhatsAppWebhookInteractiveTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = WhatsAppWebhookService(self.db)
        self.service.approval = MagicMock()

    @patch.object(WhatsAppWebhookService, "_send_text_reply")
    def test_button_reply_webhook(self, mock_send: MagicMock) -> None:
        self.service.approval.handle_button_reply.return_value = "Approved. Test Visitor has been notified."

        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "917676283924",
                                        "type": "interactive",
                                        "interactive": {
                                            "type": "button_reply",
                                            "button_reply": {"id": "yes_482901", "title": "Yes"},
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            ],
        }

        result = self.service.handle_webhook_payload(payload)

        self.assertEqual(result["handled"], 1)
        self.service.approval.handle_button_reply.assert_called_once_with(
            from_phone="+917676283924",
            button_id="yes_482901",
        )
        mock_send.assert_called_once()

    @patch.object(WhatsAppWebhookService, "_send_text_reply")
    def test_text_reply_still_works(self, mock_send: MagicMock) -> None:
        self.service.approval.handle_reply.return_value = "Approved."

        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "917676283924",
                                        "type": "text",
                                        "text": {"body": "YES 482901"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ],
        }

        result = self.service.handle_webhook_payload(payload)

        self.assertEqual(result["handled"], 1)
        self.service.approval.handle_reply.assert_called_once()

    @patch.object(WhatsAppWebhookService, "_send_text_reply")
    def test_template_quick_reply_webhook(self, mock_send: MagicMock) -> None:
        self.service.approval.handle_button_reply.return_value = "Approved."

        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "917676283924",
                                        "type": "button",
                                        "button": {
                                            "text": "Yes",
                                            "payload": "yes_482901",
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            ],
        }

        result = self.service.handle_webhook_payload(payload)

        self.assertEqual(result["handled"], 1)
        self.service.approval.handle_button_reply.assert_called_once_with(
            from_phone="+917676283924",
            button_id="yes_482901",
        )
        mock_send.assert_called_once()


class WhatsAppApprovalButtonsSendTests(unittest.TestCase):
    @patch("app.services.messaging_service.httpx.post")
    @patch("app.services.messaging_service.check_meta_whatsapp_health")
    @patch("app.services.messaging_service.is_meta_whatsapp_configured", return_value=True)
    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.get_settings")
    def test_send_interactive_payload(
        self,
        mock_settings: MagicMock,
        _mock_test: MagicMock,
        _mock_meta: MagicMock,
        mock_health: MagicMock,
        mock_post: MagicMock,
    ) -> None:
        mock_settings.return_value.whatsapp_api_url = "https://graph.facebook.com/v18.0"
        mock_settings.return_value.whatsapp_phone_number_id = "123456"
        mock_settings.return_value.whatsapp_access_token = "token"
        mock_settings.return_value.whatsapp_template_appointment_approval = ""
        mock_health.return_value = {"configured": True, "valid": True}
        mock_post.return_value.status_code = 200

        from app.services.messaging_service import WhatsAppService

        WhatsAppService().send_appointment_approval_buttons(
            "7676283924",
            visitor_name="Rahul Mehta",
            appointment_label="10 Jun 2026, 10:00 AM",
            approval_code="482901",
            purpose="Follow-up",
            approval_url="http://localhost:3000/approve-visit?token=abc",
        )

        mock_post.assert_called_once()
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["type"], "interactive")
        body = payload["interactive"]["body"]["text"]
        self.assertIn("Purpose: Follow-up", body)
        self.assertIn("approve-visit?token=abc", body)
        buttons = payload["interactive"]["action"]["buttons"]
        self.assertEqual(buttons[0]["reply"]["id"], "yes_482901")
        self.assertEqual(buttons[0]["reply"]["title"], "Yes")
        self.assertEqual(buttons[1]["reply"]["id"], "no_482901")
        self.assertEqual(buttons[1]["reply"]["title"], "No")

    @patch("app.services.messaging_service.httpx.post")
    @patch("app.services.messaging_service.check_meta_whatsapp_health")
    @patch("app.services.messaging_service.is_meta_whatsapp_configured", return_value=True)
    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.get_settings")
    def test_send_template_approval_payload(
        self,
        mock_settings: MagicMock,
        _mock_test: MagicMock,
        _mock_meta: MagicMock,
        mock_health: MagicMock,
        mock_post: MagicMock,
    ) -> None:
        mock_settings.return_value.whatsapp_api_url = "https://graph.facebook.com/v18.0"
        mock_settings.return_value.whatsapp_phone_number_id = "123456"
        mock_settings.return_value.whatsapp_access_token = "token"
        mock_settings.return_value.whatsapp_template_appointment_approval = (
            "appointment_approval_request"
        )
        mock_health.return_value = {"configured": True, "valid": True}
        mock_post.return_value.status_code = 200

        from app.services.messaging_service import WhatsAppService

        WhatsAppService().send_appointment_approval_buttons(
            "7676283924",
            visitor_name="Rahul Mehta",
            appointment_label="10 Jun 2026, 10:00 AM",
            approval_code="482901",
            purpose="Follow-up",
        )

        mock_post.assert_called_once()
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["type"], "template")
        self.assertEqual(payload["template"]["name"], "appointment_approval_request")
        body_component = next(
            c for c in payload["template"]["components"] if c["type"] == "body"
        )
        self.assertEqual(len(body_component["parameters"]), 4)
        self.assertEqual(body_component["parameters"][2]["text"], "Follow-up")
        buttons = [c for c in payload["template"]["components"] if c["type"] == "button"]
        self.assertEqual(buttons[0]["parameters"][0]["payload"], "yes_482901")
        self.assertEqual(buttons[1]["parameters"][0]["payload"], "no_482901")


if __name__ == "__main__":
    unittest.main()
