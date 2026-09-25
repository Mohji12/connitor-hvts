import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

import bcrypt

from fastapi import HTTPException

from app.models.enums import EmailType, ProfileStatus
from app.schemas.visitor_account import CreateVisitorAccountBody, UpdateProfessionalBody
from app.services.visitor_account_service import VisitorAccountService


class VisitorAccountServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = VisitorAccountService(self.db)
        self.service.s3 = MagicMock()
        self.service.sms = MagicMock()
        self.service.email = MagicMock()

    def test_create_draft_rejects_active_duplicate_phone(self) -> None:
        existing = MagicMock()
        existing.id = "acct-existing"
        existing.profileStatus = ProfileStatus.ACTIVE.value
        self.db.query.return_value.filter.return_value.first.return_value = existing
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_draft(
                CreateVisitorAccountBody(
                    firstName="Rahul",
                    lastName="Mehta",
                    phone="9123456701",
                    email="rahul@example.com",
                    emailType=EmailType.PERSONAL,
                )
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("log in", ctx.exception.detail.lower())

    def test_create_draft_resumes_incomplete_account(self) -> None:
        existing = MagicMock()
        existing.id = "acct-draft"
        existing.profileStatus = ProfileStatus.DRAFT.value
        self.db.query.return_value.filter.return_value.first.return_value = existing

        result = self.service.create_draft(
            CreateVisitorAccountBody(
                firstName="Rahul",
                lastName="Mehta",
                phone="9123456701",
                email="rahul@example.com",
                emailType=EmailType.PERSONAL,
            )
        )
        self.assertEqual(result["accountId"], "acct-draft")
        self.assertTrue(result["resumed"])
        self.db.commit.assert_called()

    def test_create_draft_persists_account(self) -> None:
        self.db.query.return_value.filter.return_value.first.return_value = None

        def add_side_effect(obj) -> None:
            obj.id = "acct-1"
            obj.profileStatus = ProfileStatus.DRAFT.value

        self.db.add.side_effect = add_side_effect

        result = self.service.create_draft(
            CreateVisitorAccountBody(
                firstName="Rahul",
                lastName="Mehta",
                phone="9123456701",
                email="rahul@example.com",
                emailType=EmailType.WORK,
            )
        )
        self.assertEqual(result["accountId"], "acct-1")
        self.db.commit.assert_called()

    def test_update_professional_moves_to_pending(self) -> None:
        account = MagicMock()
        account.id = "acct-1"
        account.profileStatus = ProfileStatus.DRAFT.value
        self.db.get.return_value = account

        result = self.service.update_professional(
            "acct-1",
            UpdateProfessionalBody(
                companyName="Acme Corp",
                jobTitle="Engineer",
                linkedinUrl="https://linkedin.com/in/rahul",
            ),
        )
        self.assertEqual(result["profileStatus"], ProfileStatus.PENDING_VERIFICATION.value)
        self.assertEqual(account.companyName, "Acme Corp")

    @patch("app.services.visitor_account_service.is_test_mode_enabled", return_value=True)
    @patch("app.services.visitor_account_service.get_settings")
    def test_send_phone_otp_test_mode(self, mock_settings: MagicMock, _test: MagicMock) -> None:
        mock_settings.return_value.e2e_fixed_otp = "123456"
        account = MagicMock()
        account.phone = "9123456701"
        account.phoneVerificationAttempts = 0
        self.db.get.return_value = account

        result = self.service.send_phone_otp("acct-1")
        self.assertEqual(result["testOtp"], "123456")

    @patch("app.services.visitor_account_service.is_test_mode_enabled", return_value=True)
    @patch("app.services.visitor_account_service.get_settings")
    def test_send_email_otp_test_mode(self, mock_settings: MagicMock, _test: MagicMock) -> None:
        mock_settings.return_value.e2e_fixed_otp = "654321"
        account = MagicMock()
        account.email = "rahul@example.com"
        account.emailVerificationAttempts = 0
        self.db.get.return_value = account

        result = self.service.send_email_verification("acct-1")
        self.assertEqual(result["testEmailOtp"], "654321")
        self.service.email.send_registration_otp.assert_called_once_with("rahul@example.com", "654321")

    def test_verify_email_otp_success(self) -> None:
        account = MagicMock()
        account.id = "acct-1"
        account.emailVerificationOtpHash = bcrypt.hashpw(b"654321", bcrypt.gensalt()).decode()
        account.emailVerificationExpiry = datetime(2099, 1, 1)
        account.emailVerificationAttempts = 0
        account.profileStatus = ProfileStatus.PENDING_VERIFICATION.value
        account.emailVerified = False

        self.db.get.return_value = account

        result = self.service.verify_email_otp("acct-1", "654321")
        self.assertTrue(result.get("emailVerified"))
        self.assertTrue(result.get("activated"))
        self.assertEqual(result["profileStatus"], ProfileStatus.ACTIVE.value)

    def test_verify_phone_auto_activates_when_ready(self) -> None:
        account = MagicMock()
        account.id = "acct-1"
        account.phoneVerificationOtpHash = bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = datetime(2099, 1, 1)
        account.phoneVerificationAttempts = 0
        account.emailVerified = True
        account.phoneVerified = False
        account.profileStatus = ProfileStatus.PENDING_VERIFICATION.value

        self.db.get.return_value = account

        result = self.service.verify_phone_otp("acct-1", "123456")
        self.assertTrue(result.get("activated"))
        self.assertEqual(result["profileStatus"], ProfileStatus.ACTIVE.value)


if __name__ == "__main__":
    unittest.main()
