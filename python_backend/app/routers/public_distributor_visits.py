"""Public distributor office-visit listing and booking."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.delivery.distributor_visit_service import DistributorVisitService
from app.dependencies.auth import public_route
from app.dependencies.visitor_auth import get_current_visitor_account

router = APIRouter()


class BookDistributorVisitBody(BaseModel):
    distributorId: str = Field(min_length=1)
    slotId: str = Field(min_length=1)
    purpose: str = Field(min_length=3, max_length=500)


@router.get("/distributors")
@public_route
def list_public_distributors(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None),
):
    return {"items": DistributorVisitService(db).list_public_distributors(q)}


@router.get("/{distributor_id}/available-dates")
@public_route
def list_available_dates(
    distributor_id: str,
    db: Annotated[Session, Depends(get_db)],
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
):
    return DistributorVisitService(db).list_public_available_dates(distributor_id, from_date, to_date)


@router.get("/{distributor_id}/slots")
@public_route
def list_public_slots(
    distributor_id: str,
    db: Annotated[Session, Depends(get_db)],
    date: str = Query(...),
):
    return DistributorVisitService(db).list_public_slots(distributor_id, date)


@router.post("", status_code=201)
def book_distributor_visit(
    body: BookDistributorVisitBody,
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).book(visitor["accountId"], body.model_dump())
