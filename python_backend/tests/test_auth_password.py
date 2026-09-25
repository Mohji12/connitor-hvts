import unittest
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
        user.passwordHash = hash_password("Connitor@123")
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
            result = self.service.login_with_password("doctor@hospital.com", "Connitor@123")

        self.assertEqual(result["access_token"], "signed-token")

    def test_login_with_password_rejects_invalid(self) -> None:
        user = MagicMock()
        user.isActive = True
        user.passwordHash = hash_password("Connitor@123")

        query = MagicMock()
        query.options.return_value = query
        query.filter.return_value = query
        query.first.return_value = user
        self.db.query.return_value = query

        with self.assertRaises(HTTPException) as ctx:
            self.service.login_with_password("doctor@hospital.com", "wrong-password")
        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
