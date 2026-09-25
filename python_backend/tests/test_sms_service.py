import unittest
from unittest.mock import MagicMock, patch

from app.services.messaging_service import SmsService


class SmsServiceTests(unittest.TestCase):
    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.is_twilio_configured", return_value=True)
    @patch("app.services.messaging_service.is_aws_sns_configured", return_value=False)
    @patch("app.services.messaging_service.get_settings")
    def test_send_message_uses_twilio_when_configured(
        self,
        mock_settings: MagicMock,
        *_mocks: MagicMock,
    ) -> None:
        mock_settings.return_value.sms_provider = "auto"
        mock_settings.return_value.notification_channel = "sms"
        mock_settings.return_value.sms_default_country_code = "91"
        mock_settings.return_value.twilio_account_sid = "AC123"
        mock_settings.return_value.twilio_auth_token = "secret"
        mock_settings.return_value.twilio_from_number = "+15551234567"

        service = SmsService()
        with patch.object(service, "_send_via_twilio") as send_twilio:
            service.send_message("9876543210", "Hello visitor")
            send_twilio.assert_called_once_with("9876543210", "Hello visitor")

    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.is_twilio_configured", return_value=False)
    @patch("app.services.messaging_service.is_aws_sns_configured", return_value=True)
    @patch("app.services.messaging_service.get_settings")
    def test_send_message_falls_back_to_aws(
        self,
        mock_settings: MagicMock,
        *_mocks: MagicMock,
    ) -> None:
        mock_settings.return_value.sms_provider = "auto"
        mock_settings.return_value.notification_channel = "sms"
        mock_settings.return_value.sms_default_country_code = "91"

        service = SmsService()
        with patch.object(service, "_send_via_aws_sns") as send_aws:
            service.send_message("9876543210", "Hello visitor")
            send_aws.assert_called_once_with("9876543210", "Hello visitor")

    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.whatsapp_provider_order", return_value=["pywhatkit"])
    @patch("app.services.messaging_service.is_pywhatkit_configured", return_value=True)
    @patch("app.services.messaging_service.get_settings")
    def test_send_message_uses_pywhatkit_when_configured(
        self,
        mock_settings: MagicMock,
        *_mocks: MagicMock,
    ) -> None:
        mock_settings.return_value.pywhatkit_central_phone = "8625877312"
        mock_settings.return_value.pywhatkit_wait_time = 20
        mock_settings.return_value.pywhatkit_tab_close = True
        mock_settings.return_value.pywhatkit_close_time = 3
        mock_settings.return_value.sms_default_country_code = "91"

        service = SmsService()
        with patch.object(service, "_send_via_pywhatkit") as send_pwk:
            service.send_message("7676283924", "Hello doctor")
            send_pwk.assert_called_once_with("7676283924", "Hello doctor")

    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.whatsapp_provider_order", return_value=["twilio"])
    @patch("app.services.messaging_service.is_twilio_whatsapp_configured", return_value=True)
    @patch("app.services.messaging_service.get_settings")
    def test_send_message_uses_whatsapp_when_configured(
        self,
        mock_settings: MagicMock,
        *_mocks: MagicMock,
    ) -> None:
        mock_settings.return_value.twilio_account_sid = "AC123"
        mock_settings.return_value.twilio_auth_token = "secret"
        mock_settings.return_value.twilio_from_number = "+15551234567"
        mock_settings.return_value.twilio_whatsapp_from = None
        mock_settings.return_value.sms_default_country_code = "91"

        service = SmsService()
        with patch.object(service, "_send_via_twilio_whatsapp") as send_wa:
            service.send_message("9876543210", "Hello doctor")
            send_wa.assert_called_once_with("9876543210", "Hello doctor")

    @patch("app.services.messaging_service.is_test_mode_enabled", return_value=False)
    @patch("app.services.messaging_service.is_twilio_configured", return_value=False)
    @patch("app.services.messaging_service.is_aws_sns_configured", return_value=False)
    @patch("app.services.messaging_service.get_settings")
    def test_send_otp_raises_when_no_provider(
        self,
        mock_settings: MagicMock,
        *_mocks: MagicMock,
    ) -> None:
        mock_settings.return_value.sms_provider = "auto"

        service = SmsService()
        with self.assertRaises(RuntimeError):
            service.send_otp("9876543210", "123456")

    def test_normalize_phone_adds_country_code(self) -> None:
        service = SmsService()
        with patch("app.services.messaging_service.get_settings") as mock_settings:
            mock_settings.return_value.sms_default_country_code = "91"
            self.assertEqual(service._normalize_phone("9876543210"), "+919876543210")
            self.assertEqual(service._normalize_phone("+14155552671"), "+14155552671")


if __name__ == "__main__":
    unittest.main()
