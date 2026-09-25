"""Visit slot allotment: even-split, quota, booked-safe regenerate, routine apply."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.database import Base
from app.models import (
    Branch,
    Department,
    DoctorAvailabilitySlot,
    HospitalChain,
    SubDepartment,
    User,
    VisitSlotAllotment,
    VisitSlotAllotmentSource,
    VisitSlotRoutine,
)
from app.models.enums import Role
from app.services.visit_slot_allotment_service import (
    VisitSlotAllotmentService,
    even_split_slots,
)
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist


def test_even_split_three_slots_in_one_hour():
    day = date(2026, 8, 25)
    slots = even_split_slots(day, "09:00", "10:00", 3)
    assert len(slots) == 3
    assert slots[0][0] == datetime(2026, 8, 25, 9, 0)
    assert slots[1][0] == datetime(2026, 8, 25, 9, 20)
    assert slots[2][0] == datetime(2026, 8, 25, 9, 40)
    assert slots[2][1] == datetime(2026, 8, 25, 10, 0)


def test_even_split_rejects_inverted_window():
    with pytest.raises(ValueError):
        even_split_slots(date(2026, 8, 25), "12:00", "09:00", 2)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    chain = HospitalChain(
        id=str(uuid.uuid4()),
        name="El City",
        phone="9000000000",
        email="c@t.com",
        street="S",
        city="C",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="El City Main",
        email="b@t.com",
        phone="9000000001",
        street="S",
        city="C",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    dept = Department(
        id=str(uuid.uuid4()),
        name="General Medicine",
        code="GEN",
        branchId=branch.id,
        hospitalChainId=chain.id,
        isActive=True,
    )
    sub = SubDepartment(
        id=str(uuid.uuid4()),
        name="OPD",
        code="OPD",
        departmentId=dept.id,
        branchId=branch.id,
        hospitalChainId=chain.id,
        isActive=True,
    )
    doctor = User(
        id=str(uuid.uuid4()),
        name="AI Doctor Priya",
        email="priya@test.com",
        phone="9100100004",
        role=Role.STAFF.value,
        userType="DOCTOR",
        isActive=True,
        passwordHash=hash_password("Connitor@123"),
        hospitalChainId=chain.id,
        branchId=branch.id,
        departmentId=dept.id,
        subDepartmentId=sub.id,
    )
    nurse = User(
        id=str(uuid.uuid4()),
        name="AI Nurse",
        email="nurse@test.com",
        phone="9100100005",
        role=Role.STAFF.value,
        userType="NURSE",
        isActive=True,
        passwordHash=hash_password("Connitor@123"),
        hospitalChainId=chain.id,
        branchId=branch.id,
        departmentId=dept.id,
        subDepartmentId=sub.id,
    )
    admin = User(
        id=str(uuid.uuid4()),
        name="Hospital Admin",
        email="admin@test.com",
        phone="9100100001",
        role=Role.HOSPITAL_ADMIN.value,
        isActive=True,
        passwordHash=hash_password("Connitor@123"),
        hospitalChainId=chain.id,
        branchId=branch.id,
    )
    session.add_all([chain, branch, dept, sub, doctor, nurse, admin])
    session.commit()

    yield session, branch, doctor, nurse, admin
    session.close()


def _admin_user(admin: User) -> dict:
    return {"id": admin.id, "role": admin.role, "branchId": admin.branchId}


def test_quota_enforced(db):
    session, branch, doctor, nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    user = _admin_user(admin)
    svc.update_policy(user, branch.id, 5)
    tomorrow = (now_ist() + timedelta(days=1)).date().isoformat()

    svc.create_allotment(
        user,
        branch.id,
        staff_id=doctor.id,
        allotment_date=tomorrow,
        window_start="09:00",
        window_end="10:00",
        slot_count=3,
    )
    with pytest.raises(HTTPException) as exc:
        svc.create_allotment(
            user,
            branch.id,
            staff_id=nurse.id,
            allotment_date=tomorrow,
            window_start="10:00",
            window_end="11:00",
            slot_count=3,
        )
    assert exc.value.status_code == 409


def test_materialize_keeps_booked(db):
    session, branch, doctor, _nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    user = _admin_user(admin)
    tomorrow = (now_ist() + timedelta(days=1)).date()
    day_iso = tomorrow.isoformat()

    row = svc.create_allotment(
        user,
        branch.id,
        staff_id=doctor.id,
        allotment_date=day_iso,
        window_start="09:00",
        window_end="10:00",
        slot_count=3,
    )
    slots = (
        session.query(DoctorAvailabilitySlot)
        .filter(DoctorAvailabilitySlot.doctorId == doctor.id)
        .order_by(DoctorAvailabilitySlot.slotStart)
        .all()
    )
    assert len(slots) == 3
    slots[0].isBooked = True
    session.commit()

    updated = svc.update_allotment(user, branch.id, row["id"], slot_count=2)
    assert updated["slotCount"] == 2
    assert updated["booked"] == 1
    remaining = (
        session.query(DoctorAvailabilitySlot)
        .filter(DoctorAvailabilitySlot.doctorId == doctor.id)
        .all()
    )
    assert any(s.isBooked for s in remaining)


def test_cannot_reduce_below_booked(db):
    session, branch, doctor, _nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    user = _admin_user(admin)
    tomorrow = (now_ist() + timedelta(days=1)).date().isoformat()
    row = svc.create_allotment(
        user,
        branch.id,
        staff_id=doctor.id,
        allotment_date=tomorrow,
        window_start="09:00",
        window_end="10:00",
        slot_count=3,
    )
    for slot in session.query(DoctorAvailabilitySlot).filter(
        DoctorAvailabilitySlot.doctorId == doctor.id
    ):
        slot.isBooked = True
    session.commit()

    with pytest.raises(HTTPException) as exc:
        svc.update_allotment(user, branch.id, row["id"], slot_count=1)
    assert exc.value.status_code == 409


def test_routine_apply_skips_override(db):
    session, branch, doctor, _nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    user = _admin_user(admin)
    svc.create_routine(
        user,
        branch.id,
        staff_id=doctor.id,
        weekdays=[0, 1, 2, 3, 4, 5, 6],
        window_start="09:00",
        window_end="10:00",
        slot_count=2,
    )
    tomorrow = (now_ist() + timedelta(days=1)).date()
    day_iso = tomorrow.isoformat()
    manual = svc.create_allotment(
        user,
        branch.id,
        staff_id=doctor.id,
        allotment_date=day_iso,
        window_start="09:00",
        window_end="10:00",
        slot_count=1,
    )
    assert manual["source"] == VisitSlotAllotmentSource.MANUAL.value

    result = svc.apply_routines(
        user,
        branch.id,
        from_date=day_iso,
        to_date=day_iso,
    )
    assert result["skipped"] >= 1
    allot = session.get(VisitSlotAllotment, manual["id"])
    assert allot is not None
    assert allot.slotCount == 1
    assert allot.source == VisitSlotAllotmentSource.MANUAL.value


def test_list_allotable_staff_includes_nurse(db):
    session, branch, doctor, nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    items = svc.list_allotable_staff(_admin_user(admin), branch.id)["items"]
    ids = {i["id"] for i in items}
    assert doctor.id in ids
    assert nurse.id in ids


def _xlsx_bytes(rows: list[list]) -> bytes:
    from io import BytesIO

    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_build_template_xlsx(db):
    session, branch, _doctor, _nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    raw = svc.build_template_xlsx()
    assert raw[:2] == b"PK"
    assert len(raw) > 100


def test_import_xlsx_by_email_and_name_notifies(db):
    session, branch, doctor, nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    user = _admin_user(admin)
    tomorrow = (now_ist() + timedelta(days=2)).date().isoformat()
    payload = _xlsx_bytes(
        [
            ["Date", "StartTime", "EndTime", "SlotCount", "StaffName", "StaffEmail"],
            [tomorrow, "09:00", "10:00", 3, "", doctor.email],
            [tomorrow, "10:00", "11:00", 2, nurse.name, ""],
        ]
    )
    with patch(
        "app.services.visit_slot_allotment_service.EmailService.send_notification"
    ) as notify:
        result = svc.import_allotments_from_xlsx(user, branch.id, payload)
    assert result["created"] == 2
    assert result["failed"] == 0
    assert notify.call_count == 2
    emails = {c.args[0] for c in notify.call_args_list}
    assert doctor.email in emails
    assert nurse.email in emails


def test_import_xlsx_quota_failure_partial(db):
    session, branch, doctor, nurse, admin = db
    svc = VisitSlotAllotmentService(session)
    user = _admin_user(admin)
    svc.update_policy(user, branch.id, 3)
    tomorrow = (now_ist() + timedelta(days=3)).date().isoformat()
    payload = _xlsx_bytes(
        [
            ["Date", "StartTime", "EndTime", "SlotCount", "StaffName", "StaffEmail"],
            [tomorrow, "09:00", "10:00", 3, doctor.name, ""],
            [tomorrow, "10:00", "11:00", 2, nurse.name, ""],
        ]
    )
    with patch(
        "app.services.visit_slot_allotment_service.EmailService.send_notification"
    ):
        result = svc.import_allotments_from_xlsx(user, branch.id, payload)
    assert result["created"] == 1
    assert result["failed"] == 1
    assert any(not r["ok"] for r in result["rows"])


def test_resolve_staff_ambiguous_name(db):
    session, branch, doctor, _nurse, admin = db
    twin = User(
        id=str(uuid.uuid4()),
        name=doctor.name,
        email="twin@test.com",
        phone="9100199999",
        role=Role.STAFF.value,
        userType="DOCTOR",
        isActive=True,
        passwordHash=hash_password("Connitor@123"),
        hospitalChainId=doctor.hospitalChainId,
        branchId=branch.id,
        departmentId=doctor.departmentId,
        subDepartmentId=doctor.subDepartmentId,
    )
    session.add(twin)
    session.commit()
    svc = VisitSlotAllotmentService(session)
    with pytest.raises(ValueError, match="Multiple staff"):
        svc._resolve_staff(branch.id, staff_name=doctor.name or "", staff_email="")
    matched = svc._resolve_staff(branch.id, staff_name="", staff_email=doctor.email or "")
    assert matched.id == doctor.id
