import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException

from app.models.enums import Role
from app.services.users_service import UsersService


class HospitalAdminServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = UsersService(self.db)

    def test_super_admin_can_create_hospital_admin(self) -> None:
        self.db.query.return_value.filter.return_value.first.return_value = None
        self.service._validate_create_permissions(
            Role.HOSPITAL_ADMIN.value,
            {
                "hospitalChainId": "chain-1",
                "branchId": "branch-1",
            },
            {"role": Role.SUPER_ADMIN.value},
        )

    def test_hospital_admin_cannot_create_hospital_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.HOSPITAL_ADMIN.value,
                {"hospitalChainId": "chain-1", "branchId": "branch-1"},
                {"role": Role.HOSPITAL_ADMIN.value, "branchId": "branch-1"},
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_hospital_admin_can_create_department_admin_in_branch(self) -> None:
        dept = MagicMock()
        dept.branchId = "branch-1"
        self.db.get.return_value = dept
        self.service._validate_create_permissions(
            Role.DEPARTMENT_ADMIN.value,
            {
                "hospitalChainId": "chain-1",
                "branchId": "branch-1",
                "departmentId": "dept-1",
            },
            {"role": Role.HOSPITAL_ADMIN.value, "branchId": "branch-1"},
        )

    def test_hospital_admin_cannot_create_department_admin_outside_branch(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.DEPARTMENT_ADMIN.value,
                {
                    "hospitalChainId": "chain-1",
                    "branchId": "other-branch",
                    "departmentId": "dept-1",
                },
                {"role": Role.HOSPITAL_ADMIN.value, "branchId": "branch-1"},
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_hospital_admin_requires_branch_and_chain(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.HOSPITAL_ADMIN.value,
                {"hospitalChainId": "chain-1"},
                {"role": Role.SUPER_ADMIN.value},
            )
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
