"""Vendor wallet operations."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.delivery.utils import bad_request, not_found
from app.models.delivery_entities import VendorWallet, WalletTransaction


class WalletService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_wallet(self, vendor_id: str) -> dict:
        wallet = self.db.query(VendorWallet).filter(VendorWallet.vendorId == vendor_id).first()
        if not wallet:
            wallet = VendorWallet(vendorId=vendor_id, balance=Decimal("0"))
            self.db.add(wallet)
            self.db.commit()
            self.db.refresh(wallet)
        return {"vendorId": vendor_id, "balance": float(wallet.balance)}

    def recharge(self, user: dict, vendor_id: str, amount: float) -> dict:
        if amount <= 0:
            raise bad_request("Amount must be positive")
        wallet = self.db.query(VendorWallet).filter(VendorWallet.vendorId == vendor_id).first()
        if not wallet:
            raise not_found("Wallet")
        wallet.balance += Decimal(str(amount))
        self.db.add(
            WalletTransaction(
                walletId=wallet.id,
                amount=Decimal(str(amount)),
                transactionType="CREDIT",
                referenceType="RECHARGE",
            )
        )
        self.db.commit()
        return {"vendorId": vendor_id, "balance": float(wallet.balance)}

    def list_transactions(self, vendor_id: str, limit: int = 50) -> list[dict]:
        wallet = self.db.query(VendorWallet).filter(VendorWallet.vendorId == vendor_id).first()
        if not wallet:
            return []
        rows = (
            self.db.query(WalletTransaction)
            .filter(WalletTransaction.walletId == wallet.id)
            .order_by(WalletTransaction.createdAt.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": t.id,
                "amount": float(t.amount),
                "transactionType": t.transactionType,
                "referenceType": t.referenceType,
                "createdAt": t.createdAt.isoformat() if t.createdAt else None,
            }
            for t in rows
        ]
