"""Public distributor onboarding endpoints."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.delivery.onboarding_service import DistributorOnboardingService
from app.delivery.utils import bad_request

router = APIRouter()


@router.get("/branches")
def list_onboarding_branches(db: Annotated[Session, Depends(get_db)]):
    return {"items": DistributorOnboardingService(db).list_public_branches()}


@router.post("/apply", status_code=201)
async def apply_distributor_onboarding(
    db: Annotated[Session, Depends(get_db)],
    payload: str = Form(..., description="JSON string of onboarding fields"),
    gstCertificate: UploadFile | None = File(None),
    panCard: UploadFile | None = File(None),
    bankProof: UploadFile | None = File(None),
    drugLicense: UploadFile | None = File(None),
    deviceCertificate: UploadFile | None = File(None),
    fssaiLicense: UploadFile | None = File(None),
    signatoryId: UploadFile | None = File(None),
):
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise bad_request("Invalid payload JSON") from exc
    if not isinstance(data, dict):
        raise bad_request("Payload must be a JSON object")

    files: dict[str, UploadFile] = {}
    for key, upload in (
        ("gstCertificate", gstCertificate),
        ("panCard", panCard),
        ("bankProof", bankProof),
        ("drugLicense", drugLicense),
        ("deviceCertificate", deviceCertificate),
        ("fssaiLicense", fssaiLicense),
        ("signatoryId", signatoryId),
    ):
        if upload is not None and upload.filename:
            files[key] = upload

    return await DistributorOnboardingService(db).apply(data, files)
