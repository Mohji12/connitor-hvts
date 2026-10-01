import unittest

from app.services.wapblaster_inbound import parse_wapblaster_inbound


class WapBlasterInboundParserTests(unittest.TestCase):
    def test_flat_phone_and_button(self) -> None:
        phone, body, button = parse_wapblaster_inbound(
            {
                "phone_number": "919876543210",
                "button_payload": "confirm_482901",
            }
        )
        self.assertEqual(phone, "919876543210")
        self.assertIsNone(body)
        self.assertEqual(button, "confirm_482901")

    def test_message_body_text(self) -> None:
        phone, body, button = parse_wapblaster_inbound(
            {"from": "918625877312", "message_body": "CONFIRM 482901"}
        )
        self.assertEqual(phone, "918625877312")
        self.assertEqual(body, "CONFIRM 482901")
        self.assertIsNone(button)

    def test_meta_envelope(self) -> None:
        phone, body, button = parse_wapblaster_inbound(
            {
                "entry": [
                    {
                        "changes": [
                            {
                                "value": {
                                    "messages": [
                                        {
                                            "from": "919999999999",
                                            "type": "interactive",
                                            "interactive": {
                                                "type": "button_reply",
                                                "button_reply": {"id": "confirm_111111"},
                                            },
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        )
        self.assertEqual(phone, "919999999999")
        self.assertEqual(button, "confirm_111111")

    def test_confirm_button_label(self) -> None:
        phone, body, button = parse_wapblaster_inbound(
            {
                "from": "918625877312",
                "type": "button",
                "message": "Confirm",
                "button": {"text": "Confirm", "payload": "Confirm"},
            }
        )
        self.assertEqual(phone, "918625877312")
        self.assertEqual(button, "Confirm")
        self.assertEqual(body, "Confirm")


if __name__ == "__main__":
    unittest.main()
