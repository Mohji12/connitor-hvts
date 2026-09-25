from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.users_service import UsersService

router = APIRouter()


class UserBody(BaseModel):
    name: str | None = None
    phone: str
    email: str | None = None
    password: str | None = None
    role: str
    userType: str | None = None
    department: str | None = None
    location: str | None = None
    hospitalChainId: str
    branchId: str | None = None
    departmentId: str | None = None
    subDepartmentId: str | None = None


@router.get("/staff/by-branch/{branch_id}")
def staff_by_branch(branch_id: str, db: Annotated[Session, Depends(get_db)]):
    return UsersService(db).find_staff_by_branch(branch_id)


@router.get("/departments/by-branch/{branch_id}")
def departments_by_branch(branch_id: str, db: Annotated[Session, Depends(get_db)]):
    return UsersService(db).get_departments_by_branch(branch_id)


@router.get("/staff/by-department/{branch_id}/{department}")
def staff_by_department(branch_id: str, department: str, db: Annotated[Session, Depends(get_db)]):
    return UsersService(db).find_staff_by_department(branch_id, department)


@router.get("/staff/search")
def search_staff(
    branchId: str = Query(...),
    query: str = Query(""),
    department: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return UsersService(db).search_staff(branchId, query, department)


@router.post(
    "",
    dependencies=[
        Depends(
            require_roles(
                Role.SUPER_ADMIN.value,
                Role.CHAIN_ADMIN.value,
                Role.BRANCH_ADMIN.value,
                Role.HOSPITAL_ADMIN.value,
                Role.DEPARTMENT_ADMIN.value,
                Role.SUB_DEPARTMENT_ADMIN.value,
            )
        )
    ],
)
def create_user(
    body: UserBody, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return UsersService(db).create(body.model_dump(), user)


@router.get(
    "",
    dependencies=[
        Depends(
            require_roles(
                Role.SUPER_ADMIN.value,
                Role.CHAIN_ADMIN.value,
                Role.BRANCH_ADMIN.value,
                Role.HOSPITAL_ADMIN.value,
                Role.DEPARTMENT_ADMIN.value,
                Role.SUB_DEPARTMENT_ADMIN.value,
                Role.SECURITY.value,
                Role.SECURITY_SUPERVISOR.value,
            )
        )
    ],
)
def list_users(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    role: str | None = None,
    isActive: bool | None = None,
    branchId: str | None = None,
    department: str | None = None,
    departmentId: str | None = None,
    subDepartmentId: str | None = None,
    chainId: str | None = None,
):
    filters = {
        "role": role,
        "isActive": isActive,
        "branchId": branchId,
        "department": department,
        "departmentId": departmentId,
        "subDepartmentId": subDepartmentId,
        "chainId": chainId,
    }
    return UsersService(db).find_all(filters, user)


@router.get("/{user_id}", dependencies=[Depends(get_current_user)])
def get_user(user_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return UsersService(db).find_one(user_id, user)


@router.put("/{user_id}", dependencies=[Depends(get_current_user)])
def update_user(
    user_id: str, body: dict[str, Any], user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return UsersService(db).update(user_id, body, user)


@router.delete("/{user_id}", dependencies=[Depends(get_current_user)])
def delete_user(user_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return UsersService(db).remove(user_id, user)
