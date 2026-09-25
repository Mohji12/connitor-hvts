import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.models.enums import Role
from app.services.departments_service import DepartmentsService


def _dept(id_: str = "dept-1", branch_id: str = "branch-1", chain_id: str = "chain-1"):
    dept = MagicMock()
    dept.id = id_
    dept.branchId = branch_id
    dept.hospitalChainId = chain_id
    dept.isActive = True
    dept.name = "Cardiology"
    dept.code = "CARDIO"
    return dept


class DepartmentsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = DepartmentsService(self.db)
        self.super_admin = {"role": Role.SUPER_ADMIN.value}
        self.dept_admin = {
            "role": Role.DEPARTMENT_ADMIN.value,
            "departmentId": "dept-1",
        }

    def test_create_requires_super_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service.create({}, self.dept_admin)
        self.assertEqual(ctx.exception.status_code, 403)

    @patch("app.services.departments_service.model_to_dict", return_value={"id": "dept-1"})
    def test_create_success(self, _mock_serialize: MagicMock) -> None:
        branch = MagicMock()
        branch.hospitalChainId = "chain-1"
        self.db.get.return_value = MagicMock()
        self.db.query.return_value.filter.return_value.first.return_value = None
        self.service._validate_branch_chain = MagicMock(return_value=branch)

        result = self.service.create(
            {
                "name": "Cardiology",
                "code": "CARDIO",
                "branchId": "branch-1",
                "hospitalChainId": "chain-1",
            },
            self.super_admin,
        )

        self.assertEqual(result["id"], "dept-1")
        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()

    def test_find_one_scoped_for_department_admin(self) -> None:
        self.db.get.return_value = _dept("dept-2")
        with self.assertRaises(HTTPException) as ctx:
            self.service.find_one("dept-2", self.dept_admin)
        self.assertEqual(ctx.exception.status_code, 403)

    @patch("app.services.departments_service.model_to_dict", return_value={"id": "dept-1"})
    def test_find_one_own_department(self, _mock_serialize: MagicMock) -> None:
        self.db.get.return_value = _dept("dept-1")
        result = self.service.find_one("dept-1", self.dept_admin)
        self.assertEqual(result["id"], "dept-1")

    def test_remove_requires_super_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service.remove("dept-1", self.dept_admin)
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
