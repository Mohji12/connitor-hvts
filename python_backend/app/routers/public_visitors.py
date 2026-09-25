from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_public_frontend_url, get_settings
from app.dependencies.auth import public_route
from app.services.phone_verification_service import PhoneVerificationService
from app.services.rate_limit_service import RateLimitService
from app.services.visitors_service import VisitorsService

router = APIRouter()


class OtpBody(BaseModel):
    phone: str
    branchId: str


class VerifyPhoneBody(BaseModel):
    phone: str
    branchId: str
    otp: str


@router.get("/check-by-phone")
def check_by_phone(phone: str = Query(...), branchId: str = Query(...), db: Session = Depends(get_db)):
    visitor = VisitorsService(db).find_visitor_by_phone_and_branch(phone, branchId)
    if not visitor:
        return None
    return {
        "visitor": {
            "id": visitor.id,
            "firstName": visitor.firstName,
            "lastName": visitor.lastName,
            "phone": visitor.phone,
            "email": visitor.email,
            "company": visitor.company,
            "designation": visitor.designation,
        },
        "isProfileCompleteForMeeting": VisitorsService(db).is_profile_complete_for_meeting(visitor),
    }


@router.get("/branch-info")
def branch_info(branchId: str = Query(...), db: Session = Depends(get_db)):
    return VisitorsService(db).get_branch_info(branchId)


@router.get("/onsite-entry")
@public_route
def onsite_entry(branchId: str = Query(...), db: Session = Depends(get_db)):
    info = VisitorsService(db).get_branch_info(branchId)
    settings = get_settings()
    base = (get_public_frontend_url(settings) or settings.frontend_url).rstrip("/")
    from urllib.parse import urlencode

    params = urlencode({"branchId": branchId, "name": info.get("name") or ""})
    return {
        "branchId": branchId,
        "name": info.get("name"),
        "city": info.get("city"),
        "onsiteUrl": f"{base}/visit/on-spot?{params}",
    }


@router.post("/register")
async def register(
    branchId: str = Query(...),
    db: Session = Depends(get_db),
    body: dict[str, Any] | None = None,
    photo: UploadFile | None = File(None),
    governmentIdDocument: UploadFile | None = File(None),
    officeIdDocument: UploadFile | None = File(None),
):
    data = {**(body or {}), "branchId": branchId}
    files = {"photo": photo, "governmentIdDocument": governmentIdDocument, "officeIdDocument": officeIdDocument}
    return await VisitorsService(db).public_register_visitor(branchId, data, files)


@router.post("/quick-register")
def quick_register(branchId: str = Query(...), body: dict[str, Any] = None, db: Session = Depends(get_db)):
    return VisitorsService(db).quick_register_visitor(branchId, body or {})


@router.patch("/complete-profile/{visitor_id}")
async def complete_profile(
    visitor_id: str,
    branchId: str = Query(...),
    db: Session = Depends(get_db),
    body: dict[str, Any] | None = None,
    photo: UploadFile | None = File(None),
    governmentIdDocument: UploadFile | None = File(None),
    officeIdDocument: UploadFile | None = File(None),
):
    files = {"photo": photo, "governmentIdDocument": governmentIdDocument, "officeIdDocument": officeIdDocument}
    return await VisitorsService(db).complete_profile(visitor_id, branchId, body or {}, files)


@router.post("/delivery-visit")
def delivery_visit(branchId: str = Query(...), body: dict[str, Any] = None, db: Session = Depends(get_db)):
    return VisitorsService(db).create_delivery_visit(branchId, body or {})


@router.post("/meeting-visit")
def meeting_visit(branchId: str = Query(...), body: dict[str, Any] = None, db: Session = Depends(get_db)):
    return VisitorsService(db).create_meeting_visit_request(branchId, body or {})


@router.post("/request-visit")
def request_visit(branchId: str = Query(...), body: dict[str, Any] = None, db: Session = Depends(get_db)):
    return VisitorsService(db).public_create_visit_request(branchId, body or {})


@router.patch("/update/{visitor_id}")
async def update_public_visitor(
    visitor_id: str,
    branchId: str = Query(...),
    db: Session = Depends(get_db),
    body: dict[str, Any] | None = None,
    photo: UploadFile | None = File(None),
    governmentIdDocument: UploadFile | None = File(None),
    officeIdDocument: UploadFile | None = File(None),
):
    files = {"photo": photo, "governmentIdDocument": governmentIdDocument, "officeIdDocument": officeIdDocument}
    return await VisitorsService(db).public_update_visitor(visitor_id, branchId, body or {}, files)


@router.post("/send-otp")
def send_otp(request: Request, body: OtpBody, db: Annotated[Session, Depends(get_db)]):
    RateLimitService().check_otp_rate_limit(request)
    return PhoneVerificationService(db).generate_otp(body.phone, body.branchId)


@router.post("/verify-phone")
def verify_phone(body: VerifyPhoneBody, db: Annotated[Session, Depends(get_db)]):
    result = PhoneVerificationService(db).verify_otp(body.phone, body.branchId, body.otp)
    visitor = VisitorsService(db).get_visitor_for_phone_verification(result["visitorId"])
    return {**result, "visitor": visitor}


@router.post("")
async def register_public(request: Request, db: Session = Depends(get_db)):
    content_type = (request.headers.get("content-type") or "").lower()
    files: dict[str, UploadFile | None] = {
        "photo": None,
        "governmentIdDocument": None,
        "officeIdDocument": None,
    }
    if "application/json" in content_type:
        data = await request.json() or {}
    else:
        form = await request.form()
        data: dict[str, Any] = {}
        for key, value in form.multi_items():
            if hasattr(value, "filename"):
                if key in files:
                    files[key] = value  # type: ignore[assignment]
            else:
                data[key] = str(value)
    return await VisitorsService(db).register_public_visitor(data, files)
