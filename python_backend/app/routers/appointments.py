from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.appointments_service import AppointmentsService

router = APIRouter(
    dependencies=[
        Depends(get_current_user),
        Depends(
            require_roles(
                Role.SUPER_ADMIN.value,
                Role.HOSPITAL_ADMIN.value,
                Role.DEPARTMENT_ADMIN.value,
                Role.SUB_DEPARTMENT_ADMIN.value,
                Role.STAFF.value,
                Role.SECURITY.value,
                Role.SECURITY_SUPERVISOR.value,
            )
        ),
    ],
)


@router.get("")
def list_appointments(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = None,
    branchId: str | None = None,
):
    return AppointmentsService(db).list_appointments({"status": status, "branchId": branchId}, user)
