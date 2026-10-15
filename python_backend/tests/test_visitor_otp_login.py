import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

import bcrypt
from fastapi import HTTPException

from app.models.enums import ProfileStatus
from app.services.visitor_auth_service import VisitorAuthService


class VisitorOtpLoginTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = VisitorAuthService(self.db)
        self.service.accounts = MagicMock()

    def _account(self, status: str = ProfileStatus.ACTIVE.value) -> MagicMock:
        account = MagicMock()
        account.id = "acct-1"
        account.firstName = "Asha"
        account.lastName = "Rao"
        account.email = "asha@example.com"
        account.phone = "9123456701"
        account.profileStatus = status
        account.phoneVerificationAttempts = 0
        account.phoneVerificationExpiry = None
        self.db.query.return_value.filter.return_value.first.return_value = account
        return account

    @patch("app.services.visitor_auth_service.is_test_mode_enabled", return_value=False)
    def test_request_sends_whatsapp_code(self, _test: MagicMock) -> None:
        account = self._account()
        result = self.service.request_login_otp("+91 91234 56701")
        phone, otp = self.service.accounts.sms.send_profile_phone_otp.call_args[0]
        self.assertEqual(phone, "9123456701")
        self.assertTrue(bcrypt.checkpw(otp.encode(), account.phoneVerificationOtpHash.encode()))
        self.assertIn("WhatsApp", result["message"])

    def test_request_unknown_phone(self) -> None:
        self.db.query.return_value.filter.return_value.first.return_value = None
        with self.assertRaises(HTTPException) as ctx:
            self.service.request_login_otp("9000000009")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_correct_code_signs_in_and_is_single_use(self) -> None:
        account = self._account()
        account.phoneVerificationOtpHash = bcrypt.hashpw(b"112233", bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = datetime(2099, 1, 1)

        result = self.service.login_with_otp("9123456701", "112233")

        self.assertTrue(result["access_token"])
        self.assertEqual(result["accountId"], "acct-1")
        self.assertEqual(result["name"], "Asha Rao")
        self.assertIsNone(account.phoneVerificationOtpHash)
        with self.assertRaises(HTTPException):
            self.service.login_with_otp("9123456701", "112233")

    def test_wrong_code_counts_attempt(self) -> None:
        account = self._account()
        account.phoneVerificationOtpHash = bcrypt.hashpw(b"112233", bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = datetime(2099, 1, 1)
        with self.assertRaises(HTTPException) as ctx:
            self.service.login_with_otp("9123456701", "000000")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(account.phoneVerificationAttempts, 1)

    def test_incomplete_profile_is_refused(self) -> None:
        account = self._account(ProfileStatus.PENDING_VERIFICATION.value)
        account.phoneVerificationOtpHash = bcrypt.hashpw(b"112233", bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = datetime(2099, 1, 1)
        with self.assertRaises(HTTPException) as ctx:
            self.service.login_with_otp("9123456701", "112233")
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
