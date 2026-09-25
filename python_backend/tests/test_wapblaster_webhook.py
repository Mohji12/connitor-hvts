import unittest
from unittest.mock import MagicMock, patch

from app.services.wapblaster_webhook_service import WapBlasterWebhookService


class WapBlasterWebhookServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = WapBlasterWebhookService(self.db)
        self.service.approval = MagicMock()
        self.service.approval.handle_button_reply.return_value = "Approved."

    @patch.object(WapBlasterWebhookService, "_reply_doctor")
    def test_handles_button_payload(self, mock_reply: MagicMock) -> None:
        result = self.service.handle_payload(
            {"phone_number": "919876543210", "button_payload": "confirm_123456"}
        )
        self.assertEqual(result["handled"], 1)
        self.service.approval.handle_button_reply.assert_called_once()
        mock_reply.assert_called_once()

    def test_ignores_empty_payload(self) -> None:
        result = self.service.handle_payload({})
        self.assertEqual(result["handled"], 0)


if __name__ == "__main__":
    unittest.main()
