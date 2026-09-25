from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.gate_pass_service import GatePassService
from app.services.visitor_search_service import VisitorSearchService
from app.services.visitors_service import VisitorsService

router = APIRouter()


class VerifyCodeBody(BaseModel):
    visitCode: str


class ScanCheckInQrBody(BaseModel):
    qrPayload: str


class VerifyCheckInOtpBody(BaseModel):
    otp: str
    branchId: str
    visitId: str | None = None


@router.get("/check-by-phone")
def check_by_phone(phone: str = Query(...), branchId: str = Query(...), db: Session = Depends(get_db)):
    visitor = VisitorsService(db).find_visitor_by_phone_and_branch(phone, branchId)
    return visitor and {
        "id": visitor.id,
        "firstName": visitor.firstName,
        "lastName": visitor.lastName,
        "phone": visitor.phone,
        "email": visitor.email,
    }


@router.post(
    "/register",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
async def register_visitor(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Form(...),
    phone: str = Form(...),
    firstName: str = Form(...),
    lastName: str = Form(...),
    photo: UploadFile | None = File(None),
    governmentIdDocument: UploadFile | None = File(None),
    officeIdDocument: UploadFile | None = File(None),
    **extra: Any,
):
    data = {"branchId": branchId, "phone": phone, "firstName": firstName, "lastName": lastName, **extra}
    files = {"photo": photo, "governmentIdDocument": governmentIdDocument, "officeIdDocument": officeIdDocument}
    return await VisitorsService(db).register_visitor(data, user, files)


@router.post(
    "/request-visit",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def request_visit(body: dict[str, Any], user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return VisitorsService(db).create_visit_request(body, user)


@router.post(
    "/verify-code",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def verify_code(
    body: VerifyCodeBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
):
    return VisitorsService(db).verify_code(body.visitCode, user, background_tasks)


@router.post(
    "/verify-checkin-otp",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def verify_checkin_otp(
    body: VerifyCheckInOtpBody, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return GatePassService(db).verify_check_in_otp(body.otp, body.branchId, user, body.visitId)


@router.post(
    "/checkin/{visit_id}",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def checkin(
    visit_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
):
    return VisitorsService(db).check_in_visitor(visit_id, user, background_tasks)


@router.get(
    "/search",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def search(phone: str = Query(...), branchId: str = Query(...), db: Session = Depends(get_db)):
    return VisitorSearchService(db).search_visitors(phone, branchId)


@router.post(
    "/scan-qr",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def scan_qr(
    body: ScanCheckInQrBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return GatePassService(db).scan_check_in_qr(body.qrPayload, user)


@router.patch(
    "/checkout/{visit_id}",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def checkout(visit_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return VisitorsService(db).checkout(visit_id, user)


@router.get(
    "/active",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
def active(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return VisitorsService(db).list_active(user)


@router.get(
    "/summary",
    dependencies=[
        Depends(
            require_roles(
                Role.SECURITY_SUPERVISOR.value,
                Role.BRANCH_ADMIN.value,
                Role.HOSPITAL_ADMIN.value,
                Role.SECURITY.value,
            )
        )
    ],
)
def summary(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    skip: int | None = None,
    take: int | None = Query(default=None),
    page: int | None = Query(default=None),
    limit: int | None = Query(default=None),
    status: str | None = None,
    date: str | None = None,
    search: str | None = None,
    personToMeet: str | None = None,
):
    return VisitorsService(db).summary(
        {
            "skip": skip,
            "take": take,
            "page": page,
            "limit": limit,
            "status": status,
            "date": date,
            "search": search,
            "personToMeet": personToMeet,
        },
        user,
    )


@router.patch(
    "/update/{visitor_id}",
    dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))],
)
async def update_visitor(
    visitor_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    body: dict[str, Any] | None = None,
    photo: UploadFile | None = File(None),
    governmentIdDocument: UploadFile | None = File(None),
    officeIdDocument: UploadFile | None = File(None),
):
    files = {"photo": photo, "governmentIdDocument": governmentIdDocument, "officeIdDocument": officeIdDocument}
    return await VisitorsService(db).update_visitor(visitor_id, body or {}, user, files)


@router.get(
    "/download/{visitor_id}/{document_type}",
    dependencies=[
        Depends(
            require_roles(
                Role.SECURITY.value,
                Role.SECURITY_SUPERVISOR.value,
                Role.BRANCH_ADMIN.value,
                Role.HOSPITAL_ADMIN.value,
                Role.CHAIN_ADMIN.value,
                Role.SUPER_ADMIN.value,
            )
        )
    ],
)
def download_document(
    visitor_id: str, document_type: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return VisitorsService(db).download_visitor_document(visitor_id, document_type, user)
