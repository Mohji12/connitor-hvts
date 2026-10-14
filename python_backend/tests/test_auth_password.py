import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.services.auth_service import AuthService
from app.utils.passwords import hash_password


class AuthPasswordLoginTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = AuthService(self.db)

    def test_login_with_password_success(self) -> None:
        user = MagicMock()
        user.isActive = True
        user.passwordHash = hash_password("Conninter123@")
        user.id = "user-1"
        user.name = "Dr. Test"
        user.phone = "9000000001"
        user.email = "doctor@hospital.com"
        user.role = "STAFF"
        user.userType = "DOCTOR"
        user.department = "CARDIOLOGY"
        user.location = "Room 1"
        user.hospitalChainId = "chain-1"
        user.branchId = "branch-1"
        user.departmentId = "dept-1"
        user.subDepartmentId = "sub-1"
        user.hospitalChain = None
        user.branch = None

        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = user
        self.db.query.return_value = query

        with patch("app.services.auth_service.jwt.encode", return_value="signed-token"):
            result = self.service.login_with_password("doctor@hospital.com", "Conninter123@")

        self.assertEqual(result["access_token"], "signed-token")

    def test_login_with_password_rejects_invalid(self) -> None:
        user = MagicMock()
        user.isActive = True
        user.passwordHash = hash_password("Conninter123@")

        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = user
        self.db.query.return_value = query

        with self.assertRaises(HTTPException) as ctx:
            self.service.login_with_password("doctor@hospital.com", "wrong-password")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_distributor_login_requires_whatsapp_verification(self) -> None:
        user = MagicMock()
        user.isActive = True
        user.phoneVerified = False
        user.role = "DISTRIBUTOR"
        user.passwordHash = hash_password("Conninter123@")

        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = user
        self.db.query.return_value = query

        with self.assertRaises(HTTPException) as ctx:
            self.service.login_with_password("vendor@example.com", "Conninter123@")
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("WhatsApp", ctx.exception.detail)

    def test_reset_password_with_otp_updates_hash(self) -> None:
        user = MagicMock()
        user.isActive = True
        user.otp = hash_password("654321")
        user.otpExpires = datetime(2099, 1, 1)
        user.passwordHash = hash_password("OldPassword1")

        query = MagicMock()
        query.filter.return_value = query
        query.first.return_value = user
        self.db.query.return_value = query

        with patch("app.services.auth_service.is_test_mode_enabled", return_value=False), patch(
            "app.services.auth_service.bcrypt.checkpw", return_value=True
        ), patch("app.services.auth_service.now_ist", return_value=datetime(2026, 10, 8)):
            result = self.service.reset_password_with_otp(
                "doctor@hospital.com",
                "654321",
                "NewPassword1",
            )

        self.assertIn("Password updated", result["message"])
        self.assertTrue(user.passwordHash)
        self.assertIsNone(user.otp)
        self.db.commit.assert_called()

    def test_reset_password_rejects_short_password(self) -> None:
        user = MagicMock()
        user.isActive = True
        user.otp = "hashed"
        user.otpExpires = MagicMock()

        query = MagicMock()
        query.filter.return_value = query
        query.first.return_value = user
        self.db.query.return_value = query

        with patch("app.services.auth_service.is_test_mode_enabled", return_value=True):
            with self.assertRaises(HTTPException) as ctx:
                self.service.reset_password_with_otp("doctor@hospital.com", "654321", "short")
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
