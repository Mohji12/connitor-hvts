"""Logged-in visitor wallet: balance, recharge, and the visit-fee Razorpay order."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.visitor_auth import get_current_visitor_account
from app.services.razorpay_service import RazorpayService
from app.services.visitor_wallet_service import MIN_RECHARGE_INR, VisitorWalletService

router = APIRouter()


class RechargeOrderBody(BaseModel):
    amount: int = Field(ge=100, le=100000)


class RechargeVerifyBody(BaseModel):
    razorpayOrderId: str = Field(min_length=4)
    razorpayPaymentId: str = Field(min_length=4)
    razorpaySignature: str = Field(min_length=8)


@router.get("")
def get_wallet(
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    summary = VisitorWalletService(db).summary(visitor["accountId"])
    db.commit()
    return summary


@router.get("/transactions")
def list_transactions(
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = VisitorWalletService(db).list_transactions(visitor["accountId"])
    db.commit()
    return rows


@router.post("/recharge/dummy")
def recharge_dummy(
    body: RechargeOrderBody,
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    summary = VisitorWalletService(db).credit_dummy_recharge(
        visitor["accountId"],
        Decimal(body.amount),
    )
    db.commit()
    return summary


@router.post("/recharge/order")
def recharge_order(
    body: RechargeOrderBody,
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
):
    amount = Decimal(body.amount)
    if amount < MIN_RECHARGE_INR:
        amount = MIN_RECHARGE_INR
    return RazorpayService().create_order(
        amount,
        receipt=f"rw-{uuid.uuid4().hex[:12]}",
        notes={
            "purpose": "recharge",
            "visitorAccountId": visitor["accountId"],
        },
    )


@router.post("/recharge/verify")
def recharge_verify(
    body: RechargeVerifyBody,
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    summary = VisitorWalletService(db).credit_verified_recharge(
        visitor["accountId"],
        razorpay_order_id=body.razorpayOrderId,
        razorpay_payment_id=body.razorpayPaymentId,
        razorpay_signature=body.razorpaySignature,
    )
    db.commit()
    return summary


@router.post("/visit-order")
def visit_payment_order(
    visitor: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    fee = VisitorWalletService(db).visit_fee()
    return RazorpayService().create_order(
        fee,
        receipt=f"vf-{uuid.uuid4().hex[:12]}",
        notes={
            "purpose": "visit",
            "visitorAccountId": visitor["accountId"],
        },
    )
