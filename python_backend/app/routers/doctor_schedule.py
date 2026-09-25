"""Staff routes for doctor availability schedule."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.doctor_schedule_service import DoctorScheduleService

router = APIRouter(
    dependencies=[
        Depends(get_current_user),
        Depends(
            require_roles(
                Role.STAFF.value,
                Role.HOSPITAL_ADMIN.value,
                Role.DEPARTMENT_ADMIN.value,
                Role.SUB_DEPARTMENT_ADMIN.value,
                Role.BRANCH_ADMIN.value,
            )
        ),
    ]
)


class CreateSlotsBody(BaseModel):
    date: str | None = None
    fromDate: str | None = None
    toDate: str | None = None
    startTime: str
    endTime: str
    slotMinutes: int = Field(default=30, ge=5, le=240)
    weekdays: list[int] | None = None


@router.get("/slots")
def list_schedule_slots(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    fromDate: str = Query(..., alias="from"),
    toDate: str = Query(..., alias="to"),
):
    return DoctorScheduleService(db).list_slots(user, fromDate, toDate)


@router.post("/slots", status_code=201)
def create_schedule_slots(
    body: CreateSlotsBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorScheduleService(db).create_slots(
        user,
        from_date=body.fromDate,
        to_date=body.toDate,
        date=body.date,
        start_time=body.startTime,
        end_time=body.endTime,
        slot_minutes=body.slotMinutes,
        weekdays=body.weekdays,
    )


@router.delete("/slots/{slot_id}")
def delete_schedule_slot(
    slot_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorScheduleService(db).delete_slot(user, slot_id)
