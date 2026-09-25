from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.sub_departments_service import SubDepartmentsService

router = APIRouter()


class SubDepartmentBody(BaseModel):
    name: str
    code: str
    description: str | None = None
    departmentId: str
    branchId: str
    hospitalChainId: str


class SubDepartmentUpdateBody(BaseModel):
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
def list_sub_departments(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    departmentId: str | None = None,
    branchId: str | None = None,
):
    return SubDepartmentsService(db).find_all(
        {"departmentId": departmentId, "branchId": branchId}, user
    )


@router.post(
    "",
    dependencies=[
        Depends(require_roles(Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value, Role.DEPARTMENT_ADMIN.value))
    ],
)
def create_sub_department(
    body: SubDepartmentBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SubDepartmentsService(db).create(body.model_dump(), user)


@router.get(
    "/{sub_id}",
    dependencies=[Depends(require_roles(*_HOSPITAL_ADMIN_ROLES))],
)
def get_sub_department(
    sub_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SubDepartmentsService(db).find_one(sub_id, user)


@router.patch(
    "/{sub_id}",
    dependencies=[
        Depends(
            require_roles(
                Role.SUPER_ADMIN.value,
                Role.HOSPITAL_ADMIN.value,
                Role.DEPARTMENT_ADMIN.value,
                Role.SUB_DEPARTMENT_ADMIN.value,
            )
        )
    ],
)
def update_sub_department(
    sub_id: str,
    body: SubDepartmentUpdateBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SubDepartmentsService(db).update(
        sub_id, body.model_dump(exclude_unset=True), user
    )


@router.delete(
    "/{sub_id}",
    dependencies=[
        Depends(require_roles(Role.SUPER_ADMIN.value, Role.HOSPITAL_ADMIN.value, Role.DEPARTMENT_ADMIN.value))
    ],
)
def delete_sub_department(
    sub_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SubDepartmentsService(db).remove(sub_id, user)
