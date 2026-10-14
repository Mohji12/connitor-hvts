"""Visitor wallet ledger. Balance drops only when a held visit is confirmed."""

from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Visit
from app.models.enums import VisitStatus
from app.models.visitor_wallet_entities import VisitorWallet, VisitorWalletTransaction
from app.services.razorpay_service import RazorpayService

CONFIRMED_VISIT_STATUSES = {
    VisitStatus.APPROVED.value,
    VisitStatus.CHECKED_IN.value,
    VisitStatus.CHECKED_OUT.value,
}

MIN_RECHARGE_INR = Decimal("100")


class VisitorWalletService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def visit_fee(self) -> Decimal:
        return Decimal(str(get_settings().visitor_visit_fee_inr))

    def ensure_wallet(self, account_id: str, *, lock: bool = False) -> VisitorWallet:
        query = self.db.query(VisitorWallet).filter(VisitorWallet.visitorAccountId == account_id)
        wallet = query.with_for_update().first() if lock else query.first()
        if wallet:
            return wallet
        wallet = VisitorWallet(visitorAccountId=account_id, balance=Decimal("0"))
        self.db.add(wallet)
        self.db.flush()
        if lock:
            locked = (
                self.db.query(VisitorWallet)
                .filter(VisitorWallet.id == wallet.id)
                .with_for_update()
                .first()
            )
            if locked:
                return locked
        return wallet

    def _reserved(self, wallet_id: str) -> Decimal:
        total = (
            self.db.query(func.coalesce(func.sum(VisitorWalletTransaction.amount), 0))
            .filter(
                VisitorWalletTransaction.walletId == wallet_id,
                VisitorWalletTransaction.transactionType == "HOLD",
                VisitorWalletTransaction.status == "OPEN",
            )
            .scalar()
        )
        return Decimal(str(total or 0))

    def summary(self, account_id: str) -> dict:
        self.capture_confirmed_holds(account_id)
        wallet = self.ensure_wallet(account_id)
        self.db.flush()
        reserved = self._reserved(wallet.id)
        balance = Decimal(wallet.balance or 0)
        available = balance - reserved
        fee = self.visit_fee()
        return {
            "balance": float(balance),
            "reserved": float(reserved),
            "available": float(available),
            "fee": float(fee),
            "currency": "INR",
        }

    def list_transactions(self, account_id: str, limit: int = 50) -> list[dict]:
        wallet = self.ensure_wallet(account_id)
        self.db.flush()
        rows = (
            self.db.query(VisitorWalletTransaction)
            .filter(VisitorWalletTransaction.walletId == wallet.id)
            .order_by(VisitorWalletTransaction.createdAt.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": row.id,
                "amount": float(row.amount),
                "transactionType": row.transactionType,
                "status": row.status,
                "referenceType": row.referenceType,
                "referenceId": row.referenceId,
                "createdAt": row.createdAt.isoformat() if row.createdAt else None,
            }
            for row in rows
        ]

    def credit_recharge(
        self,
        account_id: str,
        amount: Decimal,
        *,
        razorpay_order_id: str,
        razorpay_payment_id: str,
    ) -> dict:
        amount = Decimal(amount)
        if amount < MIN_RECHARGE_INR:
            raise HTTPException(status_code=400, detail="Minimum recharge is ₹100.")
        existing = (
            self.db.query(VisitorWalletTransaction)
            .filter(
                VisitorWalletTransaction.razorpayPaymentId == razorpay_payment_id,
                VisitorWalletTransaction.transactionType == "CREDIT",
            )
            .first()
        )
        if existing:
            return self.summary(account_id)
        wallet = self.ensure_wallet(account_id, lock=True)
        wallet.balance = Decimal(wallet.balance or 0) + amount
        self.db.add(
            VisitorWalletTransaction(
                walletId=wallet.id,
                amount=amount,
                transactionType="CREDIT",
                status="SETTLED",
                referenceType="DUMMY_RECHARGE" if str(razorpay_order_id).startswith("dummy-order-") else "RECHARGE",
                razorpayOrderId=razorpay_order_id,
                razorpayPaymentId=razorpay_payment_id,
            )
        )
        self.db.flush()
        return self.summary(account_id)

    def credit_dummy_recharge(self, account_id: str, amount: Decimal) -> dict:
        """Demo recharge: add the amount with no payment gateway."""
        amount = Decimal(amount)
        token = uuid.uuid4().hex
        return self.credit_recharge(
            account_id,
            amount,
            razorpay_order_id=f"dummy-order-{token}",
            razorpay_payment_id=f"dummy-pay-{token}"[:64],
        )

    def credit_verified_recharge(
        self,
        account_id: str,
        *,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> dict:
        RazorpayService().verify_checkout(razorpay_order_id, razorpay_payment_id, razorpay_signature)
        order = RazorpayService().fetch_order(razorpay_order_id)
        notes = order.get("notes") or {}
        if str(notes.get("purpose") or "") != "recharge":
            raise HTTPException(status_code=400, detail="This payment is not a wallet recharge.")
        if str(notes.get("visitorAccountId") or "") != account_id:
            raise HTTPException(status_code=403, detail="This payment belongs to another visitor.")
        amount = Decimal(str(order.get("amount") or 0)) / Decimal("100")
        return self.credit_recharge(
            account_id,
            amount,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
        )

    def hold_for_visit(self, account_id: str, visit_id: str, amount: Decimal) -> None:
        amount = Decimal(amount)
        wallet = self.ensure_wallet(account_id, lock=True)
        available = Decimal(wallet.balance or 0) - self._reserved(wallet.id)
        if available < amount:
            raise HTTPException(
                status_code=400,
                detail="Insufficient wallet balance. Recharge your wallet or pay online.",
            )
        self.db.add(
            VisitorWalletTransaction(
                walletId=wallet.id,
                amount=amount,
                transactionType="HOLD",
                status="OPEN",
                referenceType="VISIT",
                referenceId=visit_id,
            )
        )
        self.db.flush()

    def debit_immediately(self, account_id: str, visit_id: str, amount: Decimal) -> None:
        """Urgent visits are already confirmed, so the fee leaves the balance now."""
        amount = Decimal(amount)
        wallet = self.ensure_wallet(account_id, lock=True)
        available = Decimal(wallet.balance or 0) - self._reserved(wallet.id)
        if available < amount:
            raise HTTPException(
                status_code=400,
                detail="Insufficient wallet balance. Recharge your wallet or pay online.",
            )
        wallet.balance = Decimal(wallet.balance or 0) - amount
        self.db.add(
            VisitorWalletTransaction(
                walletId=wallet.id,
                amount=amount,
                transactionType="DEBIT",
                status="SETTLED",
                referenceType="VISIT",
                referenceId=visit_id,
            )
        )
        self.db.flush()

    def _open_hold(self, visit_id: str) -> VisitorWalletTransaction | None:
        return (
            self.db.query(VisitorWalletTransaction)
            .filter(
                VisitorWalletTransaction.referenceId == visit_id,
                VisitorWalletTransaction.transactionType == "HOLD",
                VisitorWalletTransaction.status == "OPEN",
            )
            .first()
        )

    def capture_hold(self, visit: Visit) -> None:
        if visit.paymentStatus == "CAPTURED":
            return
        hold = self._open_hold(visit.id)
        if not hold:
            return
        wallet = (
            self.db.query(VisitorWallet)
            .filter(VisitorWallet.id == hold.walletId)
            .with_for_update()
            .first()
        )
        if not wallet:
            raise HTTPException(status_code=409, detail="Wallet hold could not be settled.")
        amount = Decimal(hold.amount)
        if Decimal(wallet.balance or 0) < amount:
            raise HTTPException(status_code=409, detail="Wallet hold could not be settled.")
        wallet.balance = Decimal(wallet.balance or 0) - amount
        hold.status = "SETTLED"
        self.db.add(
            VisitorWalletTransaction(
                walletId=wallet.id,
                amount=amount,
                transactionType="DEBIT",
                status="SETTLED",
                referenceType="VISIT",
                referenceId=visit.id,
            )
        )
        visit.paymentStatus = "CAPTURED"
        self.db.flush()

    def release_hold(self, visit: Visit) -> None:
        hold = self._open_hold(visit.id)
        if not hold:
            return
        hold.status = "RELEASED"
        self.db.add(
            VisitorWalletTransaction(
                walletId=hold.walletId,
                amount=Decimal(hold.amount),
                transactionType="RELEASE",
                status="SETTLED",
                referenceType="VISIT",
                referenceId=visit.id,
            )
        )
        visit.paymentStatus = "REFUNDED"
        self.db.flush()

    def refund_debit(self, visit: Visit) -> None:
        debit = (
            self.db.query(VisitorWalletTransaction)
            .filter(
                VisitorWalletTransaction.referenceId == visit.id,
                VisitorWalletTransaction.transactionType == "DEBIT",
                VisitorWalletTransaction.status == "SETTLED",
            )
            .first()
        )
        if not debit:
            visit.paymentStatus = "REFUNDED"
            return
        already = (
            self.db.query(VisitorWalletTransaction)
            .filter(
                VisitorWalletTransaction.referenceId == visit.id,
                VisitorWalletTransaction.transactionType == "REFUND",
            )
            .first()
        )
        if already:
            visit.paymentStatus = "REFUNDED"
            return
        wallet = (
            self.db.query(VisitorWallet)
            .filter(VisitorWallet.id == debit.walletId)
            .with_for_update()
            .first()
        )
        if not wallet:
            raise HTTPException(status_code=409, detail="Wallet refund could not be applied.")
        amount = Decimal(debit.amount)
        wallet.balance = Decimal(wallet.balance or 0) + amount
        self.db.add(
            VisitorWalletTransaction(
                walletId=wallet.id,
                amount=amount,
                transactionType="REFUND",
                status="SETTLED",
                referenceType="VISIT",
                referenceId=visit.id,
            )
        )
        visit.paymentStatus = "REFUNDED"
        self.db.flush()

    def apply_booking_payment(
        self,
        *,
        account_id: str,
        visit: Visit,
        payment_method: str,
        razorpay_order_id: str | None = None,
        razorpay_payment_id: str | None = None,
        razorpay_signature: str | None = None,
        immediate_debit: bool = False,
    ) -> None:
        if not account_id:
            raise HTTPException(status_code=401, detail="Sign in to pay for this visit.")
        fee = self.visit_fee()
        visit.feeAmount = fee
        visit.paymentMethod = payment_method
        if payment_method == "WALLET":
            if immediate_debit:
                self.debit_immediately(account_id, visit.id, fee)
                visit.paymentStatus = "CAPTURED"
            else:
                self.hold_for_visit(account_id, visit.id, fee)
                visit.paymentStatus = "HELD"
            return
        if payment_method == "RAZORPAY":
            if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
                raise HTTPException(status_code=400, detail="Online payment was not completed.")
            RazorpayService().verify_checkout(
                razorpay_order_id, razorpay_payment_id, razorpay_signature
            )
            used = (
                self.db.query(Visit)
                .filter(Visit.razorpayPaymentId == razorpay_payment_id, Visit.id != visit.id)
                .first()
            )
            if used:
                raise HTTPException(status_code=409, detail="This payment was already used.")
            visit.paymentStatus = "CAPTURED"
            visit.razorpayOrderId = razorpay_order_id
            visit.razorpayPaymentId = razorpay_payment_id
            return
        raise HTTPException(status_code=400, detail="Choose wallet or online payment.")

    def settle_on_approve(self, visit: Visit) -> None:
        if visit.paymentMethod == "WALLET" and visit.paymentStatus == "HELD":
            self.capture_hold(visit)

    def capture_confirmed_holds(self, account_id: str) -> None:
        """Debit holds whose visit is already approved, in case approval did not settle them."""
        wallet = self.ensure_wallet(account_id)
        holds = (
            self.db.query(VisitorWalletTransaction)
            .filter(
                VisitorWalletTransaction.walletId == wallet.id,
                VisitorWalletTransaction.transactionType == "HOLD",
                VisitorWalletTransaction.status == "OPEN",
                VisitorWalletTransaction.referenceType == "VISIT",
            )
            .all()
        )
        for hold in holds:
            if not hold.referenceId:
                continue
            visit = self.db.get(Visit, hold.referenceId)
            if not visit or visit.status not in CONFIRMED_VISIT_STATUSES:
                continue
            if visit.paymentMethod != "WALLET":
                visit.paymentMethod = "WALLET"
            if visit.paymentStatus != "CAPTURED":
                visit.paymentStatus = "HELD"
            self.capture_hold(visit)

    def release_on_reject(self, visit: Visit) -> None:
        if not visit.paymentMethod or visit.paymentStatus == "REFUNDED":
            return
        if visit.paymentMethod == "WALLET" and visit.paymentStatus == "HELD":
            self.release_hold(visit)
            return
        if visit.paymentMethod == "WALLET" and visit.paymentStatus == "CAPTURED":
            self.refund_debit(visit)
            return
        if visit.paymentMethod == "RAZORPAY" and visit.paymentStatus == "CAPTURED":
            if not visit.razorpayPaymentId or visit.feeAmount is None:
                visit.paymentStatus = "REFUNDED"
                return
            RazorpayService().refund(visit.razorpayPaymentId, Decimal(visit.feeAmount))
            visit.paymentStatus = "REFUNDED"
