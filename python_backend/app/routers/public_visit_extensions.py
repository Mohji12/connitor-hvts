from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import public_route
from app.services.visit_slot_extension_service import VisitSlotExtensionService

router = APIRouter()


class ConfirmExtendBody(BaseModel):
    visitId: str
    token: str = Field(min_length=16)
    minutes: int = Field(ge=1, le=60)


@router.get("/preview")
@public_route
def preview_extend(
    visitId: str = Query(...),
    token: str = Query(..., min_length=16),
    db: Session = Depends(get_db),
):
    return VisitSlotExtensionService(db).preview(visitId, token)


@router.post("/confirm")
@public_route
def confirm_extend(
    body: ConfirmExtendBody,
    db: Annotated[Session, Depends(get_db)],
):
    return VisitSlotExtensionService(db).confirm(body.visitId, body.token, body.minutes)
