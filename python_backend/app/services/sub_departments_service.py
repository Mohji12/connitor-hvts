from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Department, SubDepartment
from app.models.enums import Role
from app.utils.serializers import model_to_dict


class SubDepartmentsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_department(self, department_id: str) -> Department:
        dept = self.db.get(Department, department_id)
        if not dept or not dept.isActive:
            raise HTTPException(status_code=404, detail="Department not found.")
        return dept

    def _check_read_scope(self, req_user: dict, sub: SubDepartment) -> None:
        role = req_user["role"]
        if role == Role.HOSPITAL_ADMIN.value and sub.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only access sub-departments in your branch.")
        if role == Role.DEPARTMENT_ADMIN.value and sub.departmentId != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only access sub-departments in your department.")
        if role == Role.SUB_DEPARTMENT_ADMIN.value and sub.id != req_user.get("subDepartmentId"):
            raise HTTPException(status_code=403, detail="You can only access your own sub-department.")

    def create(self, data: dict, req_user: dict) -> dict:
        if req_user["role"] not in (
            Role.SUPER_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
            Role.DEPARTMENT_ADMIN.value,
        ):
            raise HTTPException(
                status_code=403,
                detail="Only SUPER_ADMIN, HOSPITAL_ADMIN, or DEPARTMENT_ADMIN can create sub-departments.",
            )
        dept = self._get_department(data["departmentId"])
        if req_user["role"] == Role.HOSPITAL_ADMIN.value and dept.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only create sub-departments in your branch.")
        if req_user["role"] == Role.DEPARTMENT_ADMIN.value and dept.id != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only create sub-departments in your own department.")
        if data.get("branchId") != dept.branchId:
            raise HTTPException(status_code=400, detail="branchId must match department branch.")
        data["branchId"] = dept.branchId
        data["hospitalChainId"] = dept.hospitalChainId
        existing = (
            self.db.query(SubDepartment)
            .filter(SubDepartment.departmentId == data["departmentId"], SubDepartment.code == data["code"])
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Sub-department code already exists.")
        sub = SubDepartment(**{**data, "isActive": True})
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)
        return model_to_dict(sub)

    def find_all(self, filters: dict, req_user: dict) -> list[dict]:
        q = self.db.query(SubDepartment).filter(SubDepartment.isActive == True)  # noqa: E712
        role = req_user["role"]
        if role == Role.HOSPITAL_ADMIN.value:
            q = q.filter(SubDepartment.branchId == req_user.get("branchId"))
        elif role == Role.DEPARTMENT_ADMIN.value:
            q = q.filter(SubDepartment.departmentId == req_user.get("departmentId"))
        elif role == Role.SUB_DEPARTMENT_ADMIN.value:
            q = q.filter(SubDepartment.id == req_user.get("subDepartmentId"))
        if filters.get("departmentId"):
            q = q.filter(SubDepartment.departmentId == filters["departmentId"])
        if filters.get("branchId"):
            q = q.filter(SubDepartment.branchId == filters["branchId"])
        return [model_to_dict(s) for s in q.order_by(SubDepartment.name).all()]

    def find_one(self, sub_id: str, req_user: dict) -> dict:
        sub = self.db.get(SubDepartment, sub_id)
        if not sub or not sub.isActive:
            raise HTTPException(status_code=404, detail="Sub-department not found.")
        if req_user["role"] not in (Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value):
            self._check_read_scope(req_user, sub)
        return model_to_dict(sub)

    def update(self, sub_id: str, data: dict, req_user: dict) -> dict:
        sub = self.db.get(SubDepartment, sub_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Sub-department not found.")
        allowed = (
            Role.SUPER_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
            Role.DEPARTMENT_ADMIN.value,
            Role.SUB_DEPARTMENT_ADMIN.value,
        )
        if req_user["role"] not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        if req_user["role"] == Role.HOSPITAL_ADMIN.value and sub.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only update sub-departments in your branch.")
        if req_user["role"] == Role.DEPARTMENT_ADMIN.value and sub.departmentId != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only update sub-departments in your department.")
        if req_user["role"] == Role.SUB_DEPARTMENT_ADMIN.value and sub.id != req_user.get("subDepartmentId"):
            raise HTTPException(status_code=403, detail="You can only update your own sub-department.")
        for key, value in data.items():
            if value is not None:
                setattr(sub, key, value)
        self.db.commit()
        self.db.refresh(sub)
        return model_to_dict(sub)

    def remove(self, sub_id: str, req_user: dict) -> dict:
        if req_user["role"] not in (
            Role.SUPER_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
            Role.DEPARTMENT_ADMIN.value,
        ):
            raise HTTPException(status_code=403, detail="Forbidden")
        sub = self.db.get(SubDepartment, sub_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Sub-department not found.")
        if req_user["role"] == Role.HOSPITAL_ADMIN.value and sub.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only delete sub-departments in your branch.")
        if req_user["role"] == Role.DEPARTMENT_ADMIN.value and sub.departmentId != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only delete sub-departments in your department.")
        sub.isActive = False
        self.db.commit()
        return model_to_dict(sub)
