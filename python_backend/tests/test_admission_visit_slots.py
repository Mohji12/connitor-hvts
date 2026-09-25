"""Tests for default + per-patient visiting hours."""

import uuid
from datetime import datetime
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.attendant.pass_service import AttendantPassService, DEFAULT_VISIT_END, DEFAULT_VISIT_START
from app.models import Branch, HospitalChain
from app.models.attendant_entities import Admission, Patient
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401


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
        name="Test Chain",
        phone="9000000000",
        email="chain@test.com",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Test Branch",
        email="branch@test.com",
        phone="9000000001",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    session.add_all([chain, branch])
    session.commit()
    yield session
    session.close()


def _admission(db, branch_id: str) -> Admission:
    patient = Patient(
        id=str(uuid.uuid4()),
        branchId=branch_id,
        mrn="MRN-VS-1",
        firstName="Visit",
        lastName="Patient",
        isActive=True,
    )
    db.add(patient)
    db.flush()
    admission = Admission(
        id=str(uuid.uuid4()),
        patientId=patient.id,
        branchId=branch_id,
        wardName="ICU",
        roomNumber="101",
        status="ACTIVE",
    )
    db.add(admission)
    db.commit()
    return admission


def test_default_visiting_hours_11_to_16(db):
    branch = db.query(Branch).first()
    admission = _admission(db, branch.id)
    svc = AttendantPassService(db)
    hours = svc.get_visiting_hours(admission.id)
    assert hours["defaultWindow"]["startTime"] == DEFAULT_VISIT_START
    assert hours["defaultWindow"]["endTime"] == DEFAULT_VISIT_END
    assert hours["extraSlots"] == []


def test_within_default_window(db):
    branch = db.query(Branch).first()
    admission = _admission(db, branch.id)
    svc = AttendantPassService(db)
    noon = datetime(2026, 7, 22, 12, 0, 0)
    assert svc.is_within_visiting_hours(admission.id, when=noon) is True
    evening = datetime(2026, 7, 22, 18, 30, 0)
    assert svc.is_within_visiting_hours(admission.id, when=evening) is False


def test_ward_extra_slot_allows_evening(db):
    branch = db.query(Branch).first()
    admission = _admission(db, branch.id)
    svc = AttendantPassService(db)
    user = {"id": str(uuid.uuid4()), "branchId": branch.id, "role": "WARD_ADMIN"}
    slot = svc.create_visit_slot(
        user,
        {
            "admissionId": admission.id,
            "startTime": "17:00",
            "endTime": "19:00",
            "label": "Evening",
        },
    )
    assert slot["startTime"] == "17:00"
    assert slot["everyDay"] is True

    evening = datetime(2026, 7, 22, 18, 0, 0)
    assert svc.is_within_visiting_hours(admission.id, when=evening) is True

    with patch("app.attendant.pass_service.now_ist", return_value=evening):
        svc.assert_within_visiting_hours(admission.id)
