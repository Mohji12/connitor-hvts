import base64

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Visit
from app.services.visitors_service import VisitorsService

router = APIRouter()


@router.get("/{visit_id}/status")
def visit_status(visit_id: str, db: Session = Depends(get_db)):
    return VisitorsService(db).get_visit_status_public(visit_id)


@router.get("/{visit_id}/gate-pass")
def gate_pass(visit_id: str, db: Session = Depends(get_db)):
    return VisitorsService(db).get_gate_pass_public(visit_id)


@router.get("/{visit_id}/gate-pass.png")
def gate_pass_png(visit_id: str, db: Session = Depends(get_db)) -> Response:
    """Public check-in QR image so WhatsApp can fetch it after doctor approval."""
    visit = db.get(Visit, visit_id)
    raw = visit.visitQRCode if visit else None
    if not raw:
        raise HTTPException(status_code=404, detail="Gate pass not found.")
    if "," in raw:
        raw = raw.split(",", 1)[1]
    try:
        content = base64.b64decode(raw)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Gate pass not found.") from exc
    return Response(content=content, media_type="image/png")
