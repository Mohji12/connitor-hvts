"""Visitor slot requests: doctor confirms on WhatsApp, slot is created only for that visitor."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import (
    Branch,
    Department,
    DoctorAvailabilitySlot,
    HospitalChain,
    SubDepartment,
    User,
    VisitorAccount,
)
from app.models.slot_request_entities import SlotRequest
from app.services.appointments_service import AppointmentsService
from app.services.slot_request_service import SlotRequestService
from app.services.visit_approval_reply_service import VisitApprovalReplyService, parse_button_reply
from app.utils.timezone import now_ist

DOCTOR_PHONE = "9000000001"


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    _seed(session)
    try:
        yield session
    finally:
        session.close()


def _seed(db) -> None:
    db.add(
        HospitalChain(
            id="chain-1", name="Ovum Hospital", phone="1", email="c@x.com",
            street="s", city="Bengaluru", state="KA", pinCode="560001",
        )
    )
    db.add(
        Branch(
            id="branch-1", name="Ovum Hospital — Kalyan Nagar", phone="2", email="b@x.com",
            street="s", city="Bengaluru", state="KA", pinCode="560043", hospitalChainId="chain-1",
        )
    )
    db.add(Department(id="dept-1", name="Fertility & IVF", code="IVF", branchId="branch-1", hospitalChainId="chain-1"))
    db.add(
        SubDepartment(
            id="sub-1", name="OPD", code="OPD", departmentId="dept-1", branchId="branch-1", hospitalChainId="chain-1"
        )
    )
    db.add(
        User(
            id="doc-1", name="Dr. Mohan Gola", phone=DOCTOR_PHONE, role="STAFF", isActive=True,
            branchId="branch-1", departmentId="dept-1", subDepartmentId="sub-1",
        )
    )
    for account_id, phone in (("acct-1", "9876543210"), ("acct-2", "9876543211")):
        db.add(
            VisitorAccount(
                id=account_id, firstName="Asha", lastName=account_id, phone=phone,
                email=f"{account_id}@example.com", profileStatus="ACTIVE",
            )
        )
    db.commit()


def _request(db, account_id: str = "acct-1", days: int = 3) -> SlotRequest:
    start = (now_ist() + timedelta(days=days)).replace(hour=11, minute=0, second=0, microsecond=0)
    with patch.object(AppointmentsService, "_assert_not_during_live_visit", lambda self, d, s: None):
        return SlotRequestService(db).create(
            db.get(VisitorAccount, account_id),
            branch_id="branch-1",
            department_id="dept-1",
            sub_department_id="sub-1",
            doctor_id="doc-1",
            date_str=start.strftime("%Y-%m-%d"),
            time_str="11:00",
            purpose="Follow-up consultation",
        )


@pytest.fixture()
def wapblaster():
    with patch("app.services.slot_request_service._uses_wapblaster", return_value=True), patch(
        "app.services.slot_request_service.send_wapblaster_visit_slot_request"
    ) as to_doctor, patch(
        "app.services.slot_request_service.send_wapblaster_visit_slot_approved"
    ) as to_visitor:
        yield to_doctor, to_visitor


def test_new_request_sends_slot_request_template_to_doctor(db, wapblaster):
    to_doctor, _ = wapblaster
    request = _request(db)
    SlotRequestService(db).notify_doctor(request)

    kwargs = to_doctor.call_args.kwargs
    assert to_doctor.call_args.args[0] == DOCTOR_PHONE
    assert kwargs["template_name"] == "conninter_visit_slot_request"
    assert kwargs["hospital_name"] == "Ovum Hospital"
    assert kwargs["branch_name"] == "Kalyan Nagar"
    assert kwargs["department"] == "Fertility & IVF"
    assert kwargs["requested_time"] == "11:00 AM"
    assert kwargs["purpose"] == "Follow-up consultation"
    assert kwargs["approval_code"] == request.approvalCode


def test_duplicate_pending_request_is_reused(db):
    first = _request(db)
    second = _request(db)
    assert first.id == second.id
    assert db.query(SlotRequest).count() == 1


def test_past_time_is_rejected(db):
    with pytest.raises(HTTPException) as exc:
        SlotRequestService(db).create(
            db.get(VisitorAccount, "acct-1"),
            branch_id="branch-1", department_id="dept-1", sub_department_id="sub-1",
            doctor_id="doc-1", date_str="2020-01-01", time_str="10:00", purpose="Visit",
        )
    assert exc.value.status_code == 400


def test_doctor_confirm_button_creates_reserved_slot_and_notifies_visitor(db, wapblaster):
    _, to_visitor = wapblaster
    request = _request(db)

    reply = VisitApprovalReplyService(db).handle_button_reply(
        from_phone=DOCTOR_PHONE, button_id=f"slotok_{request.approvalCode}"
    )

    db.refresh(request)
    assert reply.startswith("Confirmed.")
    assert request.status == "APPROVED"
    slot = db.get(DoctorAvailabilitySlot, request.slotId)
    assert slot.slotStart == request.requestedStart
    assert slot.slotEnd - slot.slotStart == timedelta(minutes=30)
    kwargs = to_visitor.call_args.kwargs
    assert to_visitor.call_args.args[0] == "9876543210"
    assert kwargs["template_name"] == "conninter_visit_slot_approved"
    assert kwargs["book_path"] == f"book-appointment/?slotRequest={request.id}"

    date = request.requestedStart.strftime("%Y-%m-%d")
    appts = AppointmentsService(db)
    with patch.object(AppointmentsService, "_earliest_bookable_start", lambda self, d, now=None: now_ist()):
        mine = appts.list_doctor_slots("doc-1", date, viewer_account_id="acct-1")
        theirs = appts.list_doctor_slots("doc-1", date, viewer_account_id="acct-2")
        anonymous = appts.list_doctor_slots("doc-1", date)
        dates_for_other = appts.list_available_dates("doc-1", date, date, viewer_account_id="acct-2")
    assert [s["id"] for s in mine] == [slot.id]
    assert theirs == [] and anonymous == [] and dates_for_other == []

    with pytest.raises(HTTPException) as exc:
        appts._reserve_slot("doc-1", slot.id, None, viewer_account_id="acct-2")
    assert exc.value.status_code == 409


def test_plain_reject_label_rejects_newest_slot_request_and_sends_rejected_template(db, wapblaster):
    _, to_visitor = wapblaster
    request = _request(db)

    with patch("app.services.slot_request_service.send_wapblaster_visit_slot_rejected") as rejected:
        reply = VisitApprovalReplyService(db).handle_button_reply(from_phone=DOCTOR_PHONE, button_id="Reject")

    db.refresh(request)
    assert request.status == "REJECTED"
    assert request.slotId is None
    assert reply.startswith("Rejected.")
    to_visitor.assert_not_called()
    assert rejected.call_args.args[0] == "9876543210"
    kwargs = rejected.call_args.kwargs
    assert kwargs["template_name"] == "conninter_visit_slot_rejected"
    assert kwargs["doctor_name"] == "Mohan Gola"


def test_confirm_does_not_take_an_already_booked_time(db, wapblaster):
    request = _request(db)
    db.add(
        DoctorAvailabilitySlot(
            doctorId="doc-1",
            slotStart=request.requestedStart,
            slotEnd=request.requestedStart + timedelta(minutes=30),
            isBooked=True,
        )
    )
    db.commit()

    reply = SlotRequestService(db).approve(request)

    assert "already booked" in reply
    assert request.status == "PENDING"


def test_slot_button_payloads_parse():
    assert parse_button_reply("slotok_123456") == ("slot_approve", "123456")
    assert parse_button_reply("slotno_123456") == ("slot_reject", "123456")
