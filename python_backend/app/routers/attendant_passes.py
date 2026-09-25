"""Attendant pass API routes (staff) — includes AMS endpoints."""

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.attendant.pass_service import AttendantPassService
from app.database import get_db
from app.dependencies.permissions import require_permission

router = APIRouter()


class PatientBody(BaseModel):
    branchId: str | None = None
    mrn: str
    firstName: str
    lastName: str
    phone: str | None = None


class AdmissionBody(BaseModel):
    patientId: str
    branchId: str | None = None
    wardName: str | None = None
    roomNumber: str | None = None
    bedNumber: str | None = None
    department: str | None = None


class AttendantBody(BaseModel):
    admissionId: str
    name: str
    email: EmailStr | None = None
    phone: str
    relationship: str | None = None
    photoUrl: str | None = None
    idProofType: str | None = None
    idProofUrl: str | None = None
    remarks: str | None = None
    specialPermissions: list[str] | str | None = None
    maxEntries: int | None = None
    isEmergency: bool = False


class IssuePassBody(BaseModel):
    revokeExisting: bool = False
    validFrom: datetime | None = None
    validTo: datetime | None = None
    maxEntries: int | None = None


class VisitSlotBody(BaseModel):
    admissionId: str
    startTime: str
    endTime: str
    visitDate: str | None = None
    label: str | None = None


class ExtendPassBody(BaseModel):
    validTo: datetime


class ShiftChangeBody(BaseModel):
    admissionId: str
    name: str
    phone: str
    email: str | None = None
    relationship: str | None = None
    remarks: str | None = None
    maxEntries: int | None = None
    validFrom: datetime | None = None
    validTo: datetime | None = None


class EmergencyPassBody(BaseModel):
    admissionId: str
    name: str
    phone: str
    email: str | None = None
    reason: str | None = None
    relationship: str | None = None
    validityHours: float = 2
    maxEntries: int | None = 1


class PolicyBody(BaseModel):
    maxPassesPerPatient: int | None = None
    maxIcuAttendants: int | None = None
    allowNightStay: bool | None = None
    qrValidityHours: int | None = None
    defaultVisitStart: str | None = None
    defaultVisitEnd: str | None = None
    smsEnabled: bool | None = None
    whatsappEnabled: bool | None = None
    approvalRequired: bool | None = None
    idProofMandatory: bool | None = None
    photoMandatory: bool | None = None
    emergencySkipId: bool | None = None


@router.get("/dashboard/summary")
def dashboard_summary(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    return AttendantPassService(db).dashboard_summary(branchId)


@router.get("/search")
def search_attendants(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    q: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    return AttendantPassService(db).search_attendants(branchId, q=q, status=status, limit=limit)


@router.get("/active")
def list_active_inside(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    ward: str | None = Query(None),
):
    return AttendantPassService(db).list_active_inside(branchId, ward=ward)


@router.get("/reports/summary")
def reports_summary(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    period: str = Query("daily"),
):
    return AttendantPassService(db).reports_summary(branchId, period=period)


@router.get("/policy")
def get_policy(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    return AttendantPassService(db).get_policy(branchId)


@router.put("/policy")
def update_policy(
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    body: PolicyBody = ...,
):
    return AttendantPassService(db).update_policy(user, branchId, body.model_dump(exclude_none=True))


@router.post("/shift-change", status_code=201)
def shift_change(
    body: ShiftChangeBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).shift_change(user, body.model_dump())


@router.post("/emergency", status_code=201)
def emergency_pass(
    body: EmergencyPassBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).emergency_pass(user, body.model_dump())


@router.post("/patients", status_code=201)
def create_patient(
    body: PatientBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).create_patient(user, body.model_dump())


@router.post("/admissions", status_code=201)
def create_admission(
    body: AdmissionBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).create_admission(user, body.model_dump())


@router.get("/admissions")
def list_admissions(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return AttendantPassService(db).list_admissions(branchId, skip, limit)


@router.post("/attendants", status_code=201)
def register_attendant(
    body: AttendantBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).register_attendant(user, body.model_dump())


@router.get("/attendants")
def list_attendants(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    admissionId: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return AttendantPassService(db).list_attendants(
        branchId, admission_id=admissionId, skip=skip, limit=limit
    )


@router.post("/attendants/{attendant_id}/approve")
def approve_attendant(
    attendant_id: str,
    user: Annotated[dict, Depends(require_permission("APPROVE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).approve_attendant(user, attendant_id)


@router.get("/passes")
def list_passes(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return AttendantPassService(db).list_passes(branchId, skip, limit)


@router.post("/passes/scan")
async def scan_pass(
    user: Annotated[dict, Depends(require_permission("SCAN_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    qrPayload: Annotated[str, Form(...)],
    signature: Annotated[str, Form(...)],
    govtIdImage: Annotated[UploadFile | None, File()] = None,
    scanType: Annotated[str, Form()] = "ENTRY",
    govtIdType: Annotated[str | None, Form()] = None,
):
    return await AttendantPassService(db).scan_pass(
        user,
        qr_payload=qrPayload,
        signature=signature,
        govt_id_file=govtIdImage,
        scan_type=scanType,
        govt_id_type=govtIdType,
    )


@router.post("/passes/{attendant_id}/issue", status_code=201)
def issue_pass(
    attendant_id: str,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    body: IssuePassBody | None = None,
):
    payload = body or IssuePassBody()
    return AttendantPassService(db).issue_pass(
        user,
        attendant_id,
        revoke_existing=payload.revokeExisting,
        valid_from=payload.validFrom,
        valid_to=payload.validTo,
        max_entries=payload.maxEntries,
    )


@router.post("/passes/{pass_id}/revoke")
def revoke_pass(
    pass_id: str,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).revoke_pass(user, pass_id)


@router.post("/passes/{pass_id}/extend")
def extend_pass(
    pass_id: str,
    body: ExtendPassBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).extend_pass(user, pass_id, valid_to=body.validTo)


@router.post("/passes/{pass_id}/suspend")
def suspend_pass(
    pass_id: str,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).suspend_pass(user, pass_id)


@router.post("/passes/{pass_id}/force-exit")
def force_exit(
    pass_id: str,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).force_exit(user, pass_id)


@router.get("/visit-slots")
def list_visit_slots(
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    admissionId: str | None = Query(None),
):
    return AttendantPassService(db).list_visit_slots(branchId, admission_id=admissionId)


@router.get("/admissions/{admission_id}/visiting-hours")
def get_visiting_hours(
    admission_id: str,
    user: Annotated[dict, Depends(require_permission("VIEW_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).get_visiting_hours(admission_id)


@router.post("/visit-slots", status_code=201)
def create_visit_slot(
    body: VisitSlotBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).create_visit_slot(user, body.model_dump())


@router.delete("/visit-slots/{slot_id}")
def delete_visit_slot(
    slot_id: str,
    user: Annotated[dict, Depends(require_permission("MANAGE_ATTENDANT_PASS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).delete_visit_slot(user, slot_id)
