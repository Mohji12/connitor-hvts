"""Hospital admin APIs for visit-slot allotment and routines."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.visit_slot_allotment_service import VisitSlotAllotmentService

router = APIRouter()

ADMIN_ROLES = (
    Role.SUPER_ADMIN.value,
    Role.HOSPITAL_ADMIN.value,
    Role.BRANCH_ADMIN.value,
)


class PolicyBody(BaseModel):
    dailyQuota: int = Field(ge=1, le=5000)


class AllotmentCreateBody(BaseModel):
    staffId: str
    date: str
    startTime: str
    endTime: str
    slotCount: int = Field(ge=1, le=500)


class AllotmentUpdateBody(BaseModel):
    startTime: str | None = None
    endTime: str | None = None
    slotCount: int | None = Field(default=None, ge=1, le=500)


class RoutineCreateBody(BaseModel):
    staffId: str
    weekdays: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    startTime: str
    endTime: str
    slotCount: int = Field(ge=1, le=500)


class RoutineUpdateBody(BaseModel):
    weekdays: list[int] | None = None
    startTime: str | None = None
    endTime: str | None = None
    slotCount: int | None = Field(default=None, ge=1, le=500)
    isActive: bool | None = None


class ApplyRoutinesBody(BaseModel):
    fromDate: str
    toDate: str


@router.get(
    "/branches/{branch_id}/visit-slot-policy",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def get_policy(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).get_policy(user, branch_id)


@router.put(
    "/branches/{branch_id}/visit-slot-policy",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def update_policy(
    branch_id: str,
    body: PolicyBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).update_policy(user, branch_id, body.dailyQuota)


@router.get(
    "/branches/{branch_id}/visit-slot-staff",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def list_staff(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).list_allotable_staff(user, branch_id)


@router.get(
    "/branches/{branch_id}/visit-slot-allotments",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def list_allotments(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    date: str | None = Query(default=None),
):
    return VisitSlotAllotmentService(db).list_allotments(user, branch_id, date)


@router.get(
    "/branches/{branch_id}/visit-slot-allotments/template",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def download_allotment_template(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    svc = VisitSlotAllotmentService(db)
    svc._assert_branch_access(user, branch_id)
    content = svc.build_template_xlsx()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="visit-slot-allotments-template.xlsx"',
        },
    )


@router.post(
    "/branches/{branch_id}/visit-slot-allotments/import",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
async def import_allotments(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
):
    filename = (file.filename or "").lower()
    if filename and not filename.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Upload an Excel .xlsx file.")
    raw = await file.read()
    return VisitSlotAllotmentService(db).import_allotments_from_xlsx(user, branch_id, raw)


@router.post(
    "/branches/{branch_id}/visit-slot-allotments",
    status_code=201,
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def create_allotment(
    branch_id: str,
    body: AllotmentCreateBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).create_allotment(
        user,
        branch_id,
        staff_id=body.staffId,
        allotment_date=body.date,
        window_start=body.startTime,
        window_end=body.endTime,
        slot_count=body.slotCount,
    )


@router.patch(
    "/branches/{branch_id}/visit-slot-allotments/{allotment_id}",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def update_allotment(
    branch_id: str,
    allotment_id: str,
    body: AllotmentUpdateBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).update_allotment(
        user,
        branch_id,
        allotment_id,
        window_start=body.startTime,
        window_end=body.endTime,
        slot_count=body.slotCount,
    )


@router.delete(
    "/branches/{branch_id}/visit-slot-allotments/{allotment_id}",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def delete_allotment(
    branch_id: str,
    allotment_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).delete_allotment(user, branch_id, allotment_id)


@router.get(
    "/branches/{branch_id}/visit-slot-routines",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def list_routines(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).list_routines(user, branch_id)


@router.post(
    "/branches/{branch_id}/visit-slot-routines",
    status_code=201,
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def create_routine(
    branch_id: str,
    body: RoutineCreateBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).create_routine(
        user,
        branch_id,
        staff_id=body.staffId,
        weekdays=body.weekdays,
        window_start=body.startTime,
        window_end=body.endTime,
        slot_count=body.slotCount,
    )


@router.patch(
    "/branches/{branch_id}/visit-slot-routines/{routine_id}",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def update_routine(
    branch_id: str,
    routine_id: str,
    body: RoutineUpdateBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).update_routine(
        user,
        branch_id,
        routine_id,
        weekdays=body.weekdays,
        window_start=body.startTime,
        window_end=body.endTime,
        slot_count=body.slotCount,
        is_active=body.isActive,
    )


@router.delete(
    "/branches/{branch_id}/visit-slot-routines/{routine_id}",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def delete_routine(
    branch_id: str,
    routine_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).delete_routine(user, branch_id, routine_id)


@router.post(
    "/branches/{branch_id}/visit-slot-routines/apply",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def apply_routines(
    branch_id: str,
    body: ApplyRoutinesBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotAllotmentService(db).apply_routines(
        user,
        branch_id,
        from_date=body.fromDate,
        to_date=body.toDate,
    )
