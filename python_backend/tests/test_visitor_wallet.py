"""Visitor wallet: hold until the doctor confirms, then debit. Recharge credits once."""

import uuid
from decimal import Decimal
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Visit
import app.models.visitor_wallet_entities  # noqa: F401
from app.services.visitor_wallet_service import VisitorWalletService


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _visit(db, **kwargs) -> Visit:
    visit = Visit(
        id=str(uuid.uuid4()),
        visitorId="visitor-1",
        branchId="branch-1",
        status=kwargs.pop("status", "REQUEST_SENT"),
        **kwargs,
    )
    db.add(visit)
    db.flush()
    return visit


def test_recharge_credits_once(db):
    svc = VisitorWalletService(db)
    first = svc.credit_recharge(
        "acct-1",
        Decimal("500"),
        razorpay_order_id="order_1",
        razorpay_payment_id="pay_1",
    )
    second = svc.credit_recharge(
        "acct-1",
        Decimal("500"),
        razorpay_order_id="order_1",
        razorpay_payment_id="pay_1",
    )
    assert first["balance"] == 500
    assert second["balance"] == 500
    assert len(svc.list_transactions("acct-1")) == 1


def test_approved_hold_is_debited_when_wallet_is_read(db):
    svc = VisitorWalletService(db)
    svc.credit_recharge(
        "acct-1",
        Decimal("500"),
        razorpay_order_id="order_approved",
        razorpay_payment_id="pay_approved",
    )
    visit = _visit(db, status="APPROVED")
    svc.hold_for_visit("acct-1", visit.id, Decimal("200"))
    visit.paymentMethod = "WALLET"
    visit.paymentStatus = "HELD"
    visit.feeAmount = Decimal("200")
    summary = svc.summary("acct-1")
    assert summary["balance"] == 300
    assert summary["reserved"] == 0
    assert summary["available"] == 300
    assert visit.paymentStatus == "CAPTURED"


def test_dummy_recharge_adds_each_time(db):
    svc = VisitorWalletService(db)
    first = svc.credit_dummy_recharge("acct-1", Decimal("100"))
    second = svc.credit_dummy_recharge("acct-1", Decimal("250"))
    assert first["balance"] == 100
    assert second["balance"] == 350
    txs = svc.list_transactions("acct-1")
    assert len(txs) == 2
    assert {row["referenceType"] for row in txs} == {"DUMMY_RECHARGE"}
    with pytest.raises(HTTPException) as exc:
        svc.credit_dummy_recharge("acct-1", Decimal("50"))
    assert exc.value.status_code == 400


def test_hold_is_not_a_debit_until_confirm_and_reject_releases(db):
    svc = VisitorWalletService(db)
    svc.credit_recharge(
        "acct-1",
        Decimal("500"),
        razorpay_order_id="order_2",
        razorpay_payment_id="pay_2",
    )
    visit = _visit(db)
    svc.apply_booking_payment(account_id="acct-1", visit=visit, payment_method="WALLET")
    summary = svc.summary("acct-1")
    assert summary["balance"] == 500
    assert summary["reserved"] == 200
    assert summary["available"] == 300
    assert visit.paymentStatus == "HELD"

    other = _visit(db)
    with pytest.raises(HTTPException):
        svc.hold_for_visit("acct-1", other.id, Decimal("500"))

    svc.settle_on_approve(visit)
    assert visit.paymentStatus == "CAPTURED"
    assert svc.summary("acct-1")["balance"] == 300
    assert svc.summary("acct-1")["reserved"] == 0

    svc.release_on_reject(visit)
    assert visit.paymentStatus == "REFUNDED"
    assert svc.summary("acct-1")["balance"] == 500


def test_reject_before_confirm_releases_hold_without_debit(db):
    svc = VisitorWalletService(db)
    svc.credit_recharge(
        "acct-1",
        Decimal("100"),
        razorpay_order_id="order_3",
        razorpay_payment_id="pay_3",
    )
    visit = _visit(db)
    svc.hold_for_visit("acct-1", visit.id, Decimal("100"))
    visit.paymentMethod = "WALLET"
    visit.paymentStatus = "HELD"
    visit.feeAmount = Decimal("100")
    svc.release_on_reject(visit)
    summary = svc.summary("acct-1")
    assert summary["balance"] == 100
    assert summary["reserved"] == 0
    assert visit.paymentStatus == "REFUNDED"


def test_online_reject_refunds_razorpay(db):
    svc = VisitorWalletService(db)
    visit = _visit(
        db,
        paymentMethod="RAZORPAY",
        paymentStatus="CAPTURED",
        feeAmount=Decimal("100"),
        razorpayPaymentId="pay_online",
    )
    with patch("app.services.visitor_wallet_service.RazorpayService.refund") as refund:
        svc.release_on_reject(visit)
    refund.assert_called_once()
    assert visit.paymentStatus == "REFUNDED"
