from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Branch, Department, HospitalChain, SubDepartment, User
from app.models.enums import Role
from app.services.auth_service import AuthService
from app.services.messaging_service import EmailService
from app.utils.passwords import hash_password
from app.utils.serializers import model_to_dict

ADMIN_ROLES = (
    Role.SUPER_ADMIN.value,
    Role.CHAIN_ADMIN.value,
    Role.BRANCH_ADMIN.value,
    Role.HOSPITAL_ADMIN.value,
    Role.DEPARTMENT_ADMIN.value,
    Role.SUB_DEPARTMENT_ADMIN.value,
)


class UsersService:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _normalize_email(email: str | None) -> str | None:
        if email is None:
            return None
        normalized = email.strip()
        return normalized or None

    def _find_duplicate_user(
        self, phone: str, email: str | None, *, exclude_user_id: str | None = None
    ) -> User | None:
        q = self.db.query(User).filter(User.phone == phone)
        if exclude_user_id:
            q = q.filter(User.id != exclude_user_id)
        by_phone = q.first()
        if by_phone:
            return by_phone

        normalized_email = self._normalize_email(email)
        if not normalized_email:
            return None

        email_q = self.db.query(User).filter(User.email == normalized_email)
        if exclude_user_id:
            email_q = email_q.filter(User.id != exclude_user_id)
        return email_q.first()

    def find_staff_by_branch(self, branch_id: str) -> list[dict]:
        if not branch_id or not branch_id.strip():
            raise HTTPException(status_code=400, detail="Branch ID is required.")
        staff = (
            self.db.query(User)
            .filter(User.branchId == branch_id, User.role == Role.STAFF.value)
            .all()
        )
        return [
            {
                "id": s.id,
                "name": s.name,
                "phone": s.phone,
                "userType": s.userType,
                "department": s.department,
                "departmentId": s.departmentId,
                "subDepartmentId": s.subDepartmentId,
            }
            for s in staff
        ]

    def get_departments_by_branch(self, branch_id: str) -> list[str | None]:
        rows = (
            self.db.query(User.department)
            .filter(User.branchId == branch_id, User.department.isnot(None))
            .distinct()
            .all()
        )
        return [r[0] for r in rows]

    def find_staff_by_department(self, branch_id: str, department: str) -> dict:
        staff = (
            self.db.query(User)
            .filter(
                User.branchId == branch_id,
                User.department == department,
                User.role == Role.STAFF.value,
            )
            .all()
        )
        return {
            "staff": [
                {"id": s.id, "name": s.name, "phone": s.phone, "userType": s.userType}
                for s in staff
            ]
        }

    def search_staff(self, branch_id: str, query: str, department: str | None = None) -> dict:
        if not branch_id or not branch_id.strip():
            raise HTTPException(status_code=400, detail="Branch ID is required.")
        q = self.db.query(User).filter(User.branchId == branch_id, User.role == Role.STAFF.value)
        if query and len(query.strip()) >= 2:
            q = q.filter(User.name.contains(query.strip()))
        if department and department != "all":
            q = q.filter(User.department == department)
        staff = q.order_by(User.name).limit(50).all()
        return {
            "staff": [
                {
                    "id": s.id,
                    "name": s.name,
                    "email": s.email,
                    "phone": s.phone,
                    "department": s.department,
                    "departmentId": s.departmentId,
                    "subDepartmentId": s.subDepartmentId,
                }
                for s in staff
            ],
            "total": len(staff),
        }

    def _check_scope(self, req_user: dict, target: User) -> None:
        role = req_user["role"]
        if role == Role.CHAIN_ADMIN.value and target.hospitalChainId != req_user.get("hospitalChainId"):
            raise HTTPException(status_code=403, detail="You can only operate within your own chain.")
        if role in (Role.BRANCH_ADMIN.value, Role.HOSPITAL_ADMIN.value) and target.branchId != req_user.get("branchId"):
            raise HTTPException(status_code=403, detail="You can only operate within your own branch.")
        if role == Role.DEPARTMENT_ADMIN.value and target.departmentId != req_user.get("departmentId"):
            raise HTTPException(status_code=403, detail="You can only operate within your own department.")
        if role == Role.SUB_DEPARTMENT_ADMIN.value and target.subDepartmentId != req_user.get("subDepartmentId"):
            raise HTTPException(status_code=403, detail="You can only operate within your own sub-department.")

    def _validate_refs(self, data: dict) -> None:
        if data.get("hospitalChainId") and not self.db.get(HospitalChain, data["hospitalChainId"]):
            raise HTTPException(status_code=400, detail="Invalid hospitalChainId.")
        if data.get("branchId") and not self.db.get(Branch, data["branchId"]):
            raise HTTPException(status_code=400, detail="Invalid branchId.")
        if data.get("departmentId") and not self.db.get(Department, data["departmentId"]):
            raise HTTPException(status_code=400, detail="Invalid departmentId.")
        if data.get("subDepartmentId") and not self.db.get(SubDepartment, data["subDepartmentId"]):
            raise HTTPException(status_code=400, detail="Invalid subDepartmentId.")

    def _validate_create_permissions(self, role: str, data: dict, req_user: dict) -> None:
        creator = req_user["role"]
        if role == Role.CHAIN_ADMIN.value and creator != Role.SUPER_ADMIN.value:
            raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can create CHAIN_ADMIN.")
        if role == Role.BRANCH_ADMIN.value and creator not in (Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value):
            raise HTTPException(status_code=403, detail="Only SUPER_ADMIN or CHAIN_ADMIN can create BRANCH_ADMIN.")
        if role == Role.HOSPITAL_ADMIN.value and creator != Role.SUPER_ADMIN.value:
            raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can create HOSPITAL_ADMIN.")
        if role == Role.DEPARTMENT_ADMIN.value and creator not in (
            Role.SUPER_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
        ):
            raise HTTPException(
                status_code=403,
                detail="Only SUPER_ADMIN or HOSPITAL_ADMIN can create DEPARTMENT_ADMIN.",
            )
        if role == Role.SUB_DEPARTMENT_ADMIN.value and creator not in (
            Role.SUPER_ADMIN.value,
            Role.HOSPITAL_ADMIN.value,
            Role.DEPARTMENT_ADMIN.value,
        ):
            raise HTTPException(
                status_code=403,
                detail="Only SUPER_ADMIN, HOSPITAL_ADMIN, or DEPARTMENT_ADMIN can create SUB_DEPARTMENT_ADMIN.",
            )
        if role in (Role.STAFF.value, Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            if creator == Role.CHAIN_ADMIN.value and data.get("hospitalChainId") != req_user.get("hospitalChainId"):
                raise HTTPException(status_code=403, detail="You can only create users in your own chain.")
            if creator in (Role.BRANCH_ADMIN.value, Role.HOSPITAL_ADMIN.value) and data.get("branchId") != req_user.get("branchId"):
                raise HTTPException(status_code=403, detail="You can only create users in your own branch.")
            if creator == Role.DEPARTMENT_ADMIN.value and data.get("departmentId") != req_user.get("departmentId"):
                raise HTTPException(status_code=403, detail="You can only create users in your own department.")
            if creator == Role.SUB_DEPARTMENT_ADMIN.value and data.get("subDepartmentId") != req_user.get("subDepartmentId"):
                raise HTTPException(status_code=403, detail="You can only create users in your own sub-department.")

        if role == Role.HOSPITAL_ADMIN.value:
            if not data.get("hospitalChainId") or not data.get("branchId"):
                raise HTTPException(
                    status_code=400,
                    detail="HOSPITAL_ADMIN must have hospitalChainId and branchId.",
                )
            if data.get("departmentId") or data.get("subDepartmentId"):
                raise HTTPException(
                    status_code=400,
                    detail="HOSPITAL_ADMIN must not have departmentId or subDepartmentId.",
                )
        if role == Role.DEPARTMENT_ADMIN.value:
            if creator == Role.HOSPITAL_ADMIN.value and data.get("branchId") != req_user.get("branchId"):
                raise HTTPException(
                    status_code=403,
                    detail="You can only create department admins in your own branch.",
                )
            if not data.get("departmentId"):
                raise HTTPException(status_code=400, detail="DEPARTMENT_ADMIN must have departmentId.")
        if role == Role.SUB_DEPARTMENT_ADMIN.value and creator == Role.HOSPITAL_ADMIN.value:
            dept_id = data.get("departmentId")
            if dept_id:
                dept = self.db.get(Department, dept_id)
                if not dept or dept.branchId != req_user.get("branchId"):
                    raise HTTPException(
                        status_code=403,
                        detail="Sub-department must belong to your branch.",
                    )
        if role == Role.SUB_DEPARTMENT_ADMIN.value and not data.get("subDepartmentId"):
            raise HTTPException(status_code=400, detail="SUB_DEPARTMENT_ADMIN must have subDepartmentId.")
        if role in (Role.STAFF.value, Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value):
            if not data.get("departmentId") or not data.get("subDepartmentId"):
                raise HTTPException(status_code=400, detail="Staff/Security must have departmentId and subDepartmentId.")

    def create(self, data: dict, req_user: dict) -> dict:
        role = data["role"]
        self._validate_create_permissions(role, data, req_user)

        password = data.pop("password", None)
        payload = {**data, "email": self._normalize_email(data.get("email"))}

        if not payload.get("email"):
            raise HTTPException(
                status_code=400,
                detail="Email is required as the login ID.",
            )
        AuthService.validate_password_strength(password or "")

        existing = self._find_duplicate_user(payload["phone"], payload.get("email"))
        if existing:
            conflict_field = "phone" if existing.phone == payload["phone"] else "email"
            raise HTTPException(
                status_code=409,
                detail=f"A user with this {conflict_field} already exists.",
            )

        if payload.get("hospitalChainId"):
            self._validate_refs(payload)

        user = User(
            **payload,
            isActive=True,
            passwordHash=hash_password(password),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        result = model_to_dict(user)
        department_name = None
        if payload.get("departmentId"):
            dept = self.db.get(Department, payload["departmentId"])
            department_name = dept.name if dept else None

        try:
            EmailService().send_account_credentials(
                payload["email"],
                name=user.name,
                password=password,
                role=role,
                department_name=department_name,
            )
            result["credentialsEmailSent"] = True
        except Exception:
            result["credentialsEmailSent"] = False
            result["emailWarning"] = (
                "User was created but login credentials could not be emailed. "
                "Share the password manually or reset it later."
            )

        return result

    def find_all(self, filters: dict, req_user: dict) -> list[dict]:
        q = self.db.query(User)
        role = req_user["role"]
        if role == Role.CHAIN_ADMIN.value:
            q = q.filter(User.hospitalChainId == req_user.get("hospitalChainId"))
        elif role in (Role.BRANCH_ADMIN.value, Role.HOSPITAL_ADMIN.value):
            q = q.filter(User.branchId == req_user.get("branchId"))
        elif role == Role.DEPARTMENT_ADMIN.value:
            q = q.filter(User.departmentId == req_user.get("departmentId"))
        elif role == Role.SUB_DEPARTMENT_ADMIN.value:
            q = q.filter(User.subDepartmentId == req_user.get("subDepartmentId"))
        if filters.get("role"):
            q = q.filter(User.role == filters["role"])
        if filters.get("isActive") is not None:
            q = q.filter(User.isActive == filters["isActive"])
        else:
            q = q.filter(User.isActive == True)  # noqa: E712
        if filters.get("branchId"):
            q = q.filter(User.branchId == filters["branchId"])
        if filters.get("department"):
            q = q.filter(User.department == filters["department"])
        if filters.get("departmentId"):
            q = q.filter(User.departmentId == filters["departmentId"])
        if filters.get("subDepartmentId"):
            q = q.filter(User.subDepartmentId == filters["subDepartmentId"])
        if filters.get("chainId"):
            q = q.filter(User.hospitalChainId == filters["chainId"])
        return [model_to_dict(u) for u in q.all()]

    def find_one(self, user_id: str, req_user: dict) -> dict:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        self._check_scope(req_user, user)
        return model_to_dict(user)

    def update(self, user_id: str, data: dict, req_user: dict) -> dict:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        self._check_scope(req_user, user)

        next_phone = data.get("phone", user.phone)
        next_email = (
            self._normalize_email(data["email"])
            if "email" in data
            else user.email
        )
        existing = self._find_duplicate_user(
            next_phone, next_email, exclude_user_id=user_id
        )
        if existing:
            conflict_field = "phone" if existing.phone == next_phone else "email"
            raise HTTPException(
                status_code=409,
                detail=f"A user with this {conflict_field} already exists.",
            )

        for key, value in data.items():
            if key == "password":
                if value:
                    user.passwordHash = hash_password(value)
                continue
            if value is not None:
                if key == "email":
                    setattr(user, key, self._normalize_email(value))
                else:
                    setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return model_to_dict(user)

    def remove(self, user_id: str, req_user: dict) -> dict:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        self._check_scope(req_user, user)
        user.isActive = False
        self.db.commit()
        return model_to_dict(user)
