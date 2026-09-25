from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.departments_service import DepartmentsService

router = APIRouter()


class DepartmentBody(BaseModel):
    name: str
    code: str
    description: str | None = None
    branchId: str
    hospitalChainId: str


class DepartmentUpdateBody(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    isActive: bool | None = None


_HOSPITAL_ADMIN_ROLES = (
    Role.SUPER_ADMIN.value,
    Role.HOSPITAL_ADMIN.value,
    Role.DEPARTMENT_ADMIN.value,
    Role.SUB_DEPARTMENT_ADMIN.value,
)

@router.get(
    "",
    dependencies=[Depends(require_roles(*_HOSPITAL_ADMIN_ROLES))],
)
def list_departments(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    branchId: str | None = None,
    chainId: str | None = None,
):
    return DepartmentsService(db).find_all({"branchId": branchId, "chainId": chainId}, user)


@router.post("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value))])
def create_department(
    body: DepartmentBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DepartmentsService(db).create(body.model_dump(), user)


@router.get(
    "/{dept_id}",
    dependencies=[Depends(require_roles(*_HOSPITAL_ADMIN_ROLES))],
)
def get_department(
    dept_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DepartmentsService(db).find_one(dept_id, user)


@router.patch(
    "/{dept_id}",
    dependencies=[
        Depends(require_roles(Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value, Role.DEPARTMENT_ADMIN.value))
    ],
)
def update_department(
    dept_id: str,
    body: DepartmentUpdateBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DepartmentsService(db).update(
        dept_id, body.model_dump(exclude_unset=True), user
    )


@router.delete(
    "/{dept_id}",
    dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value))],
)
def delete_department(
    dept_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DepartmentsService(db).remove(dept_id, user)
