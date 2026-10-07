"""Razorpay payment.captured webhook. Credits a recharge if checkout verify never ran."""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.razorpay_service import RazorpayService
from app.services.visitor_wallet_service import VisitorWalletService

router = APIRouter()


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    body = await request.body()
    RazorpayService().verify_webhook(body, request.headers.get("X-Razorpay-Signature"))
    try:
        payload = json.loads(body.decode() or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook body.") from exc
    if payload.get("event") != "payment.captured":
        return {"ok": True}
    payment = ((payload.get("payload") or {}).get("payment") or {}).get("entity") or {}
    notes = payment.get("notes") or {}
    if str(notes.get("purpose") or "") != "recharge":
        return {"ok": True}
    account_id = str(notes.get("visitorAccountId") or "")
    payment_id = str(payment.get("id") or "")
    order_id = str(payment.get("order_id") or "")
    if not account_id or not payment_id or not order_id:
        return {"ok": True}
    amount = Decimal(str(payment.get("amount") or 0)) / Decimal("100")
    VisitorWalletService(db).credit_recharge(
        account_id,
        amount,
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
    )
    db.commit()
    return {"ok": True}
