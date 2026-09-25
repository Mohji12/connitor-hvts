from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.visitors_service import VisitorsService

router = APIRouter()


@router.get("/{visit_id}/status")
def visit_status(visit_id: str, db: Session = Depends(get_db)):
    return VisitorsService(db).get_visit_status_public(visit_id)


@router.get("/{visit_id}/gate-pass")
def gate_pass(visit_id: str, db: Session = Depends(get_db)):
    return VisitorsService(db).get_gate_pass_public(visit_id)
