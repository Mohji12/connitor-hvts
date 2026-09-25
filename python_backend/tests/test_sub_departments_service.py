import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.models.enums import Role
from app.services.sub_departments_service import SubDepartmentsService


def _department(id_: str = "dept-1"):
    dept = MagicMock()
    dept.id = id_
    dept.branchId = "branch-1"
    dept.hospitalChainId = "chain-1"
    dept.isActive = True
    return dept


def _sub_department(id_: str = "sub-1", department_id: str = "dept-1"):
    sub = MagicMock()
    sub.id = id_
    sub.departmentId = department_id
    sub.branchId = "branch-1"
    sub.hospitalChainId = "chain-1"
    sub.isActive = True
    sub.name = "ICU"
    sub.code = "ICU"
    return sub


class SubDepartmentsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = SubDepartmentsService(self.db)
        self.super_admin = {"role": Role.SUPER_ADMIN.value}
        self.dept_admin = {
            "role": Role.DEPARTMENT_ADMIN.value,
            "departmentId": "dept-1",
        }
        self.sub_dept_admin = {
            "role": Role.SUB_DEPARTMENT_ADMIN.value,
            "departmentId": "dept-1",
            "subDepartmentId": "sub-1",
        }

    def test_create_forbidden_for_sub_department_admin(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.service.create({"departmentId": "dept-1"}, self.sub_dept_admin)
        self.assertEqual(ctx.exception.status_code, 403)

    @patch("app.services.sub_departments_service.model_to_dict", return_value={"id": "sub-1"})
    def test_create_by_department_admin(self, _mock_serialize: MagicMock) -> None:
        self.db.get.return_value = _department("dept-1")
        self.db.query.return_value.filter.return_value.first.return_value = None

        result = self.service.create(
            {
                "name": "ICU",
                "code": "ICU",
                "departmentId": "dept-1",
                "branchId": "branch-1",
                "hospitalChainId": "chain-1",
            },
            self.dept_admin,
        )

        self.assertEqual(result["id"], "sub-1")
        self.db.add.assert_called_once()

    def test_find_one_scoped_for_sub_department_admin(self) -> None:
        self.db.get.return_value = _sub_department("sub-2", "dept-1")
        with self.assertRaises(HTTPException) as ctx:
            self.service.find_one("sub-2", self.sub_dept_admin)
        self.assertEqual(ctx.exception.status_code, 403)

    @patch("app.services.sub_departments_service.model_to_dict", return_value={"id": "sub-1"})
    def test_update_own_sub_department(self, _mock_serialize: MagicMock) -> None:
        self.db.get.return_value = _sub_department("sub-1", "dept-1")
        result = self.service.update("sub-1", {"name": "ICU Cardiology"}, self.sub_dept_admin)
        self.assertEqual(result["id"], "sub-1")


if __name__ == "__main__":
    unittest.main()
