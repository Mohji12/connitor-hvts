import base64
import io
import unittest
from unittest.mock import MagicMock, patch

import qrcode

from app.services.messaging_service import EmailService, GATE_PASS_QR_CID


def _sample_qr_data_uri() -> str:
    img = qrcode.make("test-payload")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


class GatePassEmailQrTests(unittest.TestCase):
    def test_decode_qr_image_parses_data_uri(self) -> None:
        data_uri = _sample_qr_data_uri()
        decoded = EmailService._decode_qr_image(data_uri)
        self.assertIsNotNone(decoded)
        self.assertTrue(decoded.startswith(b"\x89PNG"))

    @patch.object(EmailService, "_deliver_email")
    def test_send_gate_pass_email_uses_inline_cid(self, mock_deliver: MagicMock) -> None:
        service = EmailService()
        data_uri = _sample_qr_data_uri()

        service.send_gate_pass_email(
            "visitor@example.com",
            visitor_name="Jane Doe",
            doctor_name="Dr. Smith",
            appointment_date="10 Jun 2026 14:00",
            check_in_otp="654321",
            qr_image_base64=data_uri,
        )

        mock_deliver.assert_called_once()
        kwargs = mock_deliver.call_args.kwargs
        inline = kwargs.get("inline_images")
        self.assertIsNotNone(inline)
        self.assertEqual(inline[0][0], GATE_PASS_QR_CID)
        self.assertEqual(inline[0][2], "image/png")
        html_body = mock_deliver.call_args.args[3]
        self.assertIn(f"cid:{GATE_PASS_QR_CID}", html_body)


if __name__ == "__main__":
    unittest.main()
