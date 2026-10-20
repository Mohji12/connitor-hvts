from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.schemas.gate_offline import (
    GateDeviceRegisterRequest,
    GateSyncRequest,
    GateVerifyRequest,
)
from app.services.gate_offline_service import GateOfflineService

router = APIRouter()


def _device(
    db: Annotated[Session, Depends(get_db)],
    x_gate_device_id: Annotated[str | None, Header()] = None,
    x_gate_device_secret: Annotated[str | None, Header()] = None,
):
    return GateOfflineService(db).authenticate_device(x_gate_device_id, x_gate_device_secret)


@router.post("/devices/register")
def register_device(
    body: GateDeviceRegisterRequest,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return GateOfflineService(db).register_device(
        user,
        label=body.label,
        branch_id=body.branchId,
        gate_id=body.gateId,
        offline_enabled=body.offlineEnabled,
    )


@router.post("/devices/{device_id}/revoke")
def revoke_device(
    device_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return GateOfflineService(db).revoke_device(user, device_id)


@router.post("/devices/{device_id}/offline")
def set_device_offline(
    device_id: str,
    body: dict,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return GateOfflineService(db).set_offline_enabled(user, device_id, bool(body.get("offlineEnabled")))


@router.get("/offline/manifest")
def download_manifest(
    device=Depends(_device),
    db: Annotated[Session, Depends(get_db)] = None,
) -> dict:
    return GateOfflineService(db).build_manifest(device)


@router.post("/offline/sync")
def sync_events(
    body: GateSyncRequest,
    device=Depends(_device),
    db: Annotated[Session, Depends(get_db)] = None,
) -> dict:
    return GateOfflineService(db).sync_events(device, body.events, body.manifestId)


@router.post("/verify")
def verify_online(
    body: GateVerifyRequest,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return GateOfflineService(db).verify_online(user, body.rawValue)


@router.get("/offline/ops")
def ops_summary(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return GateOfflineService(db).ops_summary(user)
