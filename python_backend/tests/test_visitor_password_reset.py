import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

import bcrypt
from fastapi import HTTPException

from app.services.visitor_auth_service import VisitorAuthService


class VisitorPasswordResetTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = VisitorAuthService(self.db)
        self.service.accounts = MagicMock()

    def _account(self) -> MagicMock:
        account = MagicMock()
        account.id = "acct-1"
        account.phone = "9123456701"
        account.phoneVerificationAttempts = 0
        account.phoneVerificationExpiry = None
        self.db.query.return_value.filter.return_value.first.side_effect = [account, None]
        return account

    @patch("app.services.visitor_auth_service.is_test_mode_enabled", return_value=False)
    def test_forgot_password_sends_whatsapp_code(self, _test: MagicMock) -> None:
        account = self._account()
        result = self.service.forgot_password("+91 91234 56701")
        self.service.accounts.sms.send_profile_phone_otp.assert_called_once()
        phone, otp = self.service.accounts.sms.send_profile_phone_otp.call_args[0]
        self.assertEqual(phone, "9123456701")
        self.assertTrue(bcrypt.checkpw(otp.encode(), account.phoneVerificationOtpHash.encode()))
        self.assertIn("WhatsApp", result["message"])

    def test_forgot_password_unknown_phone(self) -> None:
        self.db.query.return_value.filter.return_value.first.return_value = None
        with self.assertRaises(HTTPException) as ctx:
            self.service.forgot_password("9000000009")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_reset_password_with_code_sets_password(self) -> None:
        account = self._account()
        account.phoneVerificationOtpHash = bcrypt.hashpw(b"112233", bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = datetime(2099, 1, 1)

        result = self.service.reset_password("9123456701", "112233", "NewPassword1")

        self.assertIn("Password updated", result["message"])
        self.assertTrue(account.phoneVerified)
        self.assertIsNone(account.phoneVerificationOtpHash)
        self.db.add.assert_called_once()
        self.service.accounts._activate_if_ready.assert_called_once_with("acct-1")

    def test_reset_password_wrong_code_counts_attempt(self) -> None:
        account = self._account()
        account.phoneVerificationOtpHash = bcrypt.hashpw(b"112233", bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = datetime(2099, 1, 1)

        with self.assertRaises(HTTPException) as ctx:
            self.service.reset_password("9123456701", "999999", "NewPassword1")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(account.phoneVerificationAttempts, 1)


if __name__ == "__main__":
    unittest.main()
