"""Razorpay orders, checkout signature checks, refunds, and webhook checks."""

from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal

import razorpay
from fastapi import HTTPException

from app.config import get_settings


class RazorpayService:
    def _settings(self):
        settings = get_settings()
        if not settings.razorpay_key_id or not settings.razorpay_key_secret:
            raise HTTPException(status_code=503, detail="Razorpay is not configured.")
        return settings

    def _client(self) -> razorpay.Client:
        settings = self._settings()
        return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

    def create_order(self, amount_rupees: Decimal, receipt: str, notes: dict[str, str]) -> dict:
        settings = self._settings()
        paise = int(amount_rupees * 100)
        if paise <= 0:
            raise HTTPException(status_code=400, detail="Amount must be at least ₹1.")
        order = self._client().order.create(
            {
                "amount": paise,
                "currency": "INR",
                "receipt": receipt[:40],
                "notes": notes,
            }
        )
        return {
            "orderId": order["id"],
            "amount": paise,
            "currency": "INR",
            "keyId": settings.razorpay_key_id,
            "feeRupees": float(amount_rupees),
        }

    def fetch_order(self, order_id: str) -> dict:
        return self._client().order.fetch(order_id)

    def verify_checkout(self, order_id: str, payment_id: str, signature: str) -> None:
        settings = self._settings()
        body = f"{order_id}|{payment_id}".encode()
        expected = hmac.new(
            (settings.razorpay_key_secret or "").encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Payment could not be verified.")

    def refund(self, payment_id: str, amount_rupees: Decimal) -> None:
        paise = int(Decimal(amount_rupees) * 100)
        self._client().payment.refund(payment_id, {"amount": paise})

    def verify_webhook(self, body: bytes, signature: str | None) -> None:
        settings = get_settings()
        secret = (settings.razorpay_webhook_secret or "").strip()
        if not secret:
            raise HTTPException(status_code=503, detail="Razorpay webhook is not configured.")
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")
