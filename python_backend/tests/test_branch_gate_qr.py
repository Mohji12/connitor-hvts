"""Hospital branch gate QR encodes /gate/{id}/ and is scoped to the admin's branch."""

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Branch, HospitalChain
from app.models.enums import Role
from app.services.branches_service import BranchesService, branch_gate_url


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    session.add(
        HospitalChain(
            id="chain-1",
            name="Ovum Woman & Child Speciality Hospital",
            phone="9000000000",
            email="c@t.com",
            street="S",
            city="C",
            state="ST",
            pinCode="000000",
        )
    )
    session.commit()
    yield session
    session.close()


def _create(db, name: str = "Kalyan Nagar") -> Branch:
    data = {
        "name": name,
        "email": f"{uuid.uuid4().hex[:8]}@t.com",
        "phone": uuid.uuid4().hex[:10],
        "street": "S",
        "city": "Bengaluru",
        "state": "KA",
        "pinCode": "560001",
    }
    return BranchesService(db).create("chain-1", data, {"role": Role.SUPER_ADMIN.value})


def test_create_qr_encodes_gate_url(db) -> None:
    branch = _create(db)
    assert f"/gate/{branch.id}/" in branch_gate_url(branch.id)
    assert branch.qrCode and branch.qrCode.startswith("data:image/png;base64,")


def test_hospital_admin_can_generate_own_branch(db) -> None:
    own = _create(db, "Own")
    other = _create(db, "Other")
    admin = {
        "role": Role.HOSPITAL_ADMIN.value,
        "hospitalChainId": "chain-1",
        "branchId": own.id,
    }
    updated = BranchesService(db).generate_qr_code("chain-1", own.id, admin)
    assert updated.qrCode
    assert f"/gate/{own.id}/" in branch_gate_url(own.id)

    with pytest.raises(HTTPException) as ctx:
        BranchesService(db).generate_qr_code("chain-1", other.id, admin)
    assert ctx.value.status_code == 403


def test_hospital_admin_cannot_read_other_branch(db) -> None:
    own = _create(db, "Own")
    other = _create(db, "Other")
    admin = {
        "role": Role.HOSPITAL_ADMIN.value,
        "hospitalChainId": "chain-1",
        "branchId": own.id,
    }
    BranchesService(db).find_one("chain-1", own.id, admin)
    with pytest.raises(HTTPException) as ctx:
        BranchesService(db).find_one("chain-1", other.id, admin)
    assert ctx.value.status_code == 403
