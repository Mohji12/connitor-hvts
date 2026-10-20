"""GET /visitors/summary returns paginated summary rows the admin UI expects."""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.database import Base
from app.models import Branch, HospitalChain, User, Visit, Visitor
from app.models.enums import AppointmentMode, Role, VisitStatus
from app.services.visitors_service import VisitorsService
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
    doctor = User(
        id=str(uuid.uuid4()),
        name="AI Doctor Priya",
        email="priya@test.com",
        phone="9100100004",
        role=Role.STAFF.value,
        userType="DOCTOR",
        hospitalChainId=chain.id,
        branchId=branch.id,
        isActive=True,
    )
    admin = User(
        id=str(uuid.uuid4()),
        name="Hospital Admin",
        email="admin@test.com",
        phone="9100100099",
        role=Role.HOSPITAL_ADMIN.value,
        hospitalChainId=chain.id,
        branchId=branch.id,
        isActive=True,
    )
    visitor = Visitor(
        id=str(uuid.uuid4()),
        firstName="Rahul",
        lastName="Mehta",
        phone="9123456701",
        branchId=branch.id,
    )
    visit = Visit(
        id=str(uuid.uuid4()),
        visitorId=visitor.id,
        staffId=doctor.id,
        staffName=doctor.name,
        branchId=branch.id,
        purpose="Consultation",
        status=VisitStatus.APPROVED.value,
        appointmentMode=AppointmentMode.IN_PERSON.value,
        appointmentDate=now_ist(),
        createdAt=now_ist(),
    )
    session.add_all([chain, branch, doctor, admin, visitor, visit])
    session.commit()
    yield session
    session.close()


def _admin(db) -> dict:
    user = db.query(User).filter(User.role == Role.HOSPITAL_ADMIN.value).one()
    return {"id": user.id, "role": user.role, "branchId": user.branchId}


def test_summary_includes_page_limit_and_data_rows(db) -> None:
    result = VisitorsService(db).summary({"date": now_ist().strftime("%Y-%m-%d")}, _admin(db))
    assert result["page"] == 1
    assert result["limit"] == 500
    assert result["total"] == 1
    assert len(result["data"]) == 1
    row = result["data"][0]
    assert row["visitorName"] == "Rahul Mehta"
    assert row["personToMeet"] == "AI Doctor Priya"
    assert row["purpose"] == "Consultation"
    assert row["status"] == VisitStatus.APPROVED.value
    assert "visits" not in result


def test_summary_filters_inclusive_custom_datetime_range(db) -> None:
    visit = db.query(Visit).one()
    visit.appointmentDate = now_ist().replace(hour=10, minute=0, second=0, microsecond=0)
    db.commit()
    day = visit.appointmentDate.strftime("%Y-%m-%d")
    inside = VisitorsService(db).summary(
        {"startDate": f"{day}T09:00", "endDate": f"{day}T11:00"},
        _admin(db),
    )
    outside = VisitorsService(db).summary(
        {"fromTime": f"{day}T11:30", "toTime": f"{day}T12:00"},
        _admin(db),
    )
    assert inside["total"] == 1
    assert outside["total"] == 0


def test_summary_custom_range_includes_end_datetime(db) -> None:
    visit = db.query(Visit).one()
    visit.appointmentDate = now_ist().replace(hour=15, minute=0, second=0, microsecond=0)
    db.commit()
    earlier = visit.appointmentDate - timedelta(hours=2)
    end = visit.appointmentDate
    result = VisitorsService(db).summary(
        {
            "startDate": earlier.strftime("%Y-%m-%dT%H:%M"),
            "endDate": end.strftime("%Y-%m-%dT%H:%M"),
        },
        _admin(db),
    )
    assert result["total"] == 1
