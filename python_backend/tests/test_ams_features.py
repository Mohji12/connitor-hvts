"""AMS dashboard, emergency, and shift-change coverage."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.attendant.pass_service import AttendantPassService
from app.models import Branch, HospitalChain, User
from app.models.attendant_entities import Admission, Attendant, Patient
import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist


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
        name="Chain",
        phone="9000000000",
        email="c@test.com",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Branch",
        email="b@test.com",
        phone="9000000001",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    admin = User(
        id=str(uuid.uuid4()),
        name="Ward Admin",
        phone="9111111111",
        email="ward@test.com",
        role="WARD_ADMIN",
        branchId=branch.id,
        passwordHash=hash_password("Password1!"),
        isActive=True,
    )
    session.add_all([chain, branch, admin])
    session.commit()
    yield session
    session.close()


def _seed_admission(db, branch_id: str) -> Admission:
    patient = Patient(
        branchId=branch_id,
        mrn="MRN-AMS-1",
        firstName="Pat",
        lastName="One",
    )
    db.add(patient)
    db.flush()
    admission = Admission(
        patientId=patient.id,
        branchId=branch_id,
        wardName="ICU",
        bedNumber="12",
        department="Critical Care",
        status="ACTIVE",
    )
    db.add(admission)
    db.commit()
    db.refresh(admission)
    return admission


def test_dashboard_summary(db):
    branch = db.query(Branch).first()
    admission = _seed_admission(db, branch.id)
    db.add(
        Attendant(
            admissionId=admission.id,
            branchId=branch.id,
            name="Pending Person",
            email="p@test.com",
            phone="9876543210",
            status="PENDING",
        )
    )
    db.commit()
    summary = AttendantPassService(db).dashboard_summary(branch.id)
    assert summary["stats"]["patientsAdmitted"] == 1
    assert summary["stats"]["pendingApproval"] == 1
    assert summary["stats"]["attendantsRegistered"] == 1


def test_emergency_pass(db):
    branch = db.query(Branch).first()
    admin = db.query(User).first()
    admission = _seed_admission(db, branch.id)
    user = {"id": admin.id, "role": "WARD_ADMIN", "branchId": branch.id}
    svc = AttendantPassService(db)
    with patch.object(svc, "_email_pass", return_value=True):
        result = svc.emergency_pass(
            user,
            {
                "admissionId": admission.id,
                "name": "Emergency Contact",
                "phone": "9876543211",
                "reason": "Critical visit",
                "validityHours": 2,
            },
        )
    assert result["pass"]["status"] == "ACTIVE"
    assert result["attendant"]["isEmergency"] is True


def test_shift_change_force_exits_inside(db):
    from app.models.attendant_entities import AttendantPass

    branch = db.query(Branch).first()
    admin = db.query(User).first()
    admission = _seed_admission(db, branch.id)
    user = {"id": admin.id, "role": "WARD_ADMIN", "branchId": branch.id}
    svc = AttendantPassService(db)
    with patch.object(svc, "_email_pass", return_value=True), patch.object(
        svc, "_notify_visit_exit", return_value={}
    ):
        first = svc.emergency_pass(
            user,
            {
                "admissionId": admission.id,
                "name": "Old Attendant",
                "phone": "9876543212",
                "reason": "First",
            },
        )
        pass_row = db.get(AttendantPass, first["pass"]["id"])
        assert pass_row is not None
        pass_row.enteredAt = now_ist() - timedelta(hours=1)
        db.commit()

        second = svc.shift_change(
            user,
            {
                "admissionId": admission.id,
                "name": "New Attendant",
                "phone": "9876543213",
                "relationship": "Spouse",
            },
        )
    assert second["pass"]["status"] == "ACTIVE"
    db.refresh(pass_row)
    assert pass_row.exitedAt is not None
