from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Branch, Department, HospitalChain
from app.models.enums import Role
from app.utils.serializers import model_to_dict


class DepartmentsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _validate_branch_chain(self, branch_id: str, chain_id: str) -> Branch:
        branch = self.db.get(Branch, branch_id)
        if not branch or branch.hospitalChainId != chain_id:
            raise HTTPException(status_code=400, detail="Invalid branchId for hospitalChainId.")
        return branch

    def _check_read_scope(self, req_user: dict, dept: Department) -> None:
        role = req_user["role"]
        if role == Role.HOSPITAL_ADMIN.value and dept.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only access departments in your branch.")
        if role == Role.DEPARTMENT_ADMIN.value and dept.id != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only access your own department.")
        if role == Role.SUB_DEPARTMENT_ADMIN.value and dept.id != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only access your own department.")

    def create(self, data: dict, req_user: dict) -> dict:
        role = req_user["role"]
        if role not in (Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value):
            raise HTTPException(status_code=403, detail="Only SUPER_ADMIN or HOSPITAL_ADMIN can create departments.")
        if role == Role.HOSPITAL_ADMIN.value and data.get("branchId") != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only create departments in your own branch.")
        if not self.db.get(HospitalChain, data["hospitalChainId"]):
            raise HTTPException(status_code=400, detail="Invalid hospitalChainId.")
        self._validate_branch_chain(data["branchId"], data["hospitalChainId"])
        existing = (
            self.db.query(Department)
            .filter(Department.branchId == data["branchId"], Department.code == data["code"])
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Department code already exists for this branch.")
        dept = Department(**{**data, "isActive": True})
        self.db.add(dept)
        self.db.commit()
        self.db.refresh(dept)
        return model_to_dict(dept)

    def find_all(self, filters: dict, req_user: dict) -> list[dict]:
        q = self.db.query(Department).filter(Department.isActive == True)  # noqa: E712
        role = req_user["role"]
        if role == Role.HOSPITAL_ADMIN.value:
            q = q.filter(Department.branchId == req_user.get("branchId"))
        elif role == Role.DEPARTMENT_ADMIN.value:
            q = q.filter(Department.id == req_user.get("departmentId"))
        elif role == Role.SUB_DEPARTMENT_ADMIN.value:
            q = q.filter(Department.id == req_user.get("departmentId"))
        if filters.get("branchId"):
            q = q.filter(Department.branchId == filters["branchId"])
        if filters.get("chainId"):
            q = q.filter(Department.hospitalChainId == filters["chainId"])
        return [model_to_dict(d) for d in q.order_by(Department.name).all()]

    def find_one(self, dept_id: str, req_user: dict) -> dict:
        dept = self.db.get(Department, dept_id)
        if not dept or not dept.isActive:
            raise HTTPException(status_code=404, detail="Department not found.")
        if req_user["role"] not in (Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value):
            self._check_read_scope(req_user, dept)
        return model_to_dict(dept)

    def update(self, dept_id: str, data: dict, req_user: dict) -> dict:
        dept = self.db.get(Department, dept_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found.")
        if req_user["role"] not in (
            Role.SUPER_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
            Role.DEPARTMENT_ADMIN.value,
        ):
            raise HTTPException(status_code=403, detail="Forbidden")
        if req_user["role"] == Role.HOSPITAL_ADMIN.value and dept.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only update departments in your branch.")
        if req_user["role"] == Role.DEPARTMENT_ADMIN.value and dept.id != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only update your own department.")
        for key, value in data.items():
            if value is not None:
                setattr(dept, key, value)
        self.db.commit()
        self.db.refresh(dept)
        return model_to_dict(dept)

    def remove(self, dept_id: str, req_user: dict) -> dict:
        if req_user["role"] not in (Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value):
            raise HTTPException(status_code=403, detail="Only SUPER_ADMIN or HOSPITAL_ADMIN can delete departments.")
        dept = self.db.get(Department, dept_id)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found.")
        if req_user["role"] == Role.HOSPITAL_ADMIN.value and dept.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only delete departments in your branch.")
        dept.isActive = False
        self.db.commit()
        return model_to_dict(dept)
