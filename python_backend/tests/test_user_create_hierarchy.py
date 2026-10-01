"""User-creation ladder: SUPER_ADMIN → HOSPITAL_ADMIN → DEPARTMENT_ADMIN → SUB_DEPARTMENT_ADMIN → STAFF."""

import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException

from app.models.enums import Role
from app.services.users_service import CREATABLE_ROLES, UsersService


class UserCreateHierarchyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = UsersService(self.db)

    def test_creatable_roles_matrix_keys(self) -> None:
        self.assertIn(Role.SUPER_ADMIN.value, CREATABLE_ROLES)
        self.assertIn(Role.HOSPITAL_ADMIN.value, CREATABLE_ROLES)
        self.assertIn(Role.DEPARTMENT_ADMIN.value, CREATABLE_ROLES)
        self.assertIn(Role.SUB_DEPARTMENT_ADMIN.value, CREATABLE_ROLES)
        self.assertNotIn(
            Role.HOSPITAL_ADMIN.value,
            CREATABLE_ROLES[Role.CHAIN_ADMIN.value],
        )

    def test_super_admin_can_create_hospital_admin(self) -> None:
        self.service._validate_create_permissions(
            Role.HOSPITAL_ADMIN.value,
            {"hospitalChainId": "chain-1", "branchId": "branch-1"},
            {"role": Role.SUPER_ADMIN.value},
        )

    def test_hospital_admin_can_create_department_admin(self) -> None:
        self.service._validate_create_permissions(
            Role.DEPARTMENT_ADMIN.value,
            {
                "hospitalChainId": "chain-1",
                "branchId": "branch-1",
                "departmentId": "dept-1",
            },
            {"role": Role.HOSPITAL_ADMIN.value, "branchId": "branch-1"},
        )

    def test_hospital_admin_can_create_staff(self) -> None:
        self.service._validate_create_permissions(
            Role.STAFF.value,
            {
                "hospitalChainId": "chain-1",
                "branchId": "branch-1",
                "departmentId": "dept-1",
                "subDepartmentId": "sub-1",
            },
            {"role": Role.HOSPITAL_ADMIN.value, "branchId": "branch-1"},
        )

    def test_department_admin_can_create_sub_department_admin(self) -> None:
        self.service._validate_create_permissions(
            Role.SUB_DEPARTMENT_ADMIN.value,
            {
                "hospitalChainId": "chain-1",
                "branchId": "branch-1",
                "departmentId": "dept-1",
                "subDepartmentId": "sub-1",
            },
            {
                "role": Role.DEPARTMENT_ADMIN.value,
                "branchId": "branch-1",
                "departmentId": "dept-1",
            },
        )

    def test_sub_department_admin_can_create_staff(self) -> None:
        self.service._validate_create_permissions(
            Role.STAFF.value,
            {
                "hospitalChainId": "chain-1",
                "branchId": "branch-1",
                "departmentId": "dept-1",
                "subDepartmentId": "sub-1",
            },
            {
                "role": Role.SUB_DEPARTMENT_ADMIN.value,
                "branchId": "branch-1",
                "departmentId": "dept-1",
                "subDepartmentId": "sub-1",
            },
        )

    def test_hospital_admin_cannot_create_hospital_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.HOSPITAL_ADMIN.value,
                {"hospitalChainId": "chain-1", "branchId": "branch-1"},
                {"role": Role.HOSPITAL_ADMIN.value, "branchId": "branch-1"},
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_sub_department_admin_cannot_create_department_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.DEPARTMENT_ADMIN.value,
                {
                    "hospitalChainId": "chain-1",
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                },
                {
                    "role": Role.SUB_DEPARTMENT_ADMIN.value,
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                    "subDepartmentId": "sub-1",
                },
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_department_admin_cannot_create_hospital_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.HOSPITAL_ADMIN.value,
                {"hospitalChainId": "chain-1", "branchId": "branch-1"},
                {
                    "role": Role.DEPARTMENT_ADMIN.value,
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                },
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_staff_cannot_create_staff(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.STAFF.value,
                {
                    "hospitalChainId": "chain-1",
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                    "subDepartmentId": "sub-1",
                },
                {"role": Role.STAFF.value, "branchId": "branch-1"},
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_chain_admin_cannot_create_hospital_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.HOSPITAL_ADMIN.value,
                {"hospitalChainId": "chain-1", "branchId": "branch-1"},
                {"role": Role.CHAIN_ADMIN.value, "hospitalChainId": "chain-1"},
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_sub_department_admin_cannot_create_outside_sub_dept(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service._validate_create_permissions(
                Role.STAFF.value,
                {
                    "hospitalChainId": "chain-1",
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                    "subDepartmentId": "other-sub",
                },
                {
                    "role": Role.SUB_DEPARTMENT_ADMIN.value,
                    "branchId": "branch-1",
                    "departmentId": "dept-1",
                    "subDepartmentId": "sub-1",
                },
            )
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
