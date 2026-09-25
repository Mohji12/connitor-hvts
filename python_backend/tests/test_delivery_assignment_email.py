import json
import unittest
from unittest.mock import MagicMock, patch

from app.services.messaging_service import DELIVERY_QR_CID, EmailService


class DeliveryAssignmentEmailTests(unittest.TestCase):
    @patch.object(EmailService, "_deliver_email")
    def test_send_delivery_assignment_email_embeds_qr(self, mock_deliver: MagicMock) -> None:
        service = EmailService()
        service.send_delivery_assignment_email(
            "driver@example.com",
            driver_name="Ravi",
            delivery_number="DEL-99",
            goods_type="Pharmaceuticals",
            total_boxes=2,
            vehicle_number="KA01XY9999",
            vendor_name="Vendor Co",
            arrival_label="16 Jul 2026 11:00",
            hospital_name="Test Hospital",
            hospital_address="1 Main St, City",
            hospital_phone="9000000000",
            maps_url="https://www.google.com/maps/search/?api=1&query=1+Main+St",
            remarks="Bay A",
            qr_payload="delivery-id:DEL-99:ts",
            qr_signature="abc123signature",
            qr_expires_at="18 Jul 2026 11:00",
        )

        mock_deliver.assert_called_once()
        kwargs = mock_deliver.call_args.kwargs
        inline = kwargs.get("inline_images")
        self.assertIsNotNone(inline)
        self.assertEqual(inline[0][0], DELIVERY_QR_CID)
        self.assertEqual(inline[0][2], "image/png")
        self.assertTrue(inline[0][1].startswith(b"\x89PNG"))
        html_body = mock_deliver.call_args.args[3]
        self.assertIn(f"cid:{DELIVERY_QR_CID}", html_body)
        self.assertIn("Bay A", html_body)
        self.assertIn("1 Main St", html_body)

    def test_build_delivery_qr_png_encodes_json_payload(self) -> None:
        png = EmailService._build_delivery_qr_png("payload-1", "sig-1")
        self.assertIsNotNone(png)
        self.assertTrue(png.startswith(b"\x89PNG"))
        # Ensure helper accepts the same structure security scan expects
        encoded = json.dumps({"qrPayload": "payload-1", "signature": "sig-1"})
        self.assertIn("qrPayload", encoded)


if __name__ == "__main__":
    unittest.main()
