"""Public urgent-passcode gate session + auto-approved booking."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.visitor_auth import get_current_visitor_account
from app.services.doctor_urgent_passcode_service import DoctorUrgentPasscodeService

router = APIRouter()


class UrgentBookBody(BaseModel):
    token: str = Field(..., min_length=10)
    slotId: str | None = None
    appointmentDate: str | None = None
    purpose: str | None = Field(None, max_length=500)
    paymentMethod: Literal["WALLET", "RAZORPAY"]
    razorpayOrderId: str | None = None
    razorpayPaymentId: str | None = None
    razorpaySignature: str | None = None

    @model_validator(mode="after")
    def online_payment_fields(self) -> "UrgentBookBody":
        if self.paymentMethod == "RAZORPAY" and not (
            self.razorpayOrderId and self.razorpayPaymentId and self.razorpaySignature
        ):
            raise ValueError("Online payment was not completed.")
        return self


@router.get("/session")
def urgent_gate_session(
    token: Annotated[str, Query(min_length=10)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).get_gate_session(token)


@router.post("/book")
def urgent_gate_book(
    body: UrgentBookBody,
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).book_with_gate_token(
        visitor,
        token=body.token,
        slot_id=body.slotId,
        appointment_date=body.appointmentDate,
        purpose=body.purpose,
        payment_method=body.paymentMethod,
        razorpay_order_id=body.razorpayOrderId,
        razorpay_payment_id=body.razorpayPaymentId,
        razorpay_signature=body.razorpaySignature,
    )
