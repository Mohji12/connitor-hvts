import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Branch, HospitalChain
from app.services.branches_service import BranchesService
from app.utils.slug import branch_slug_base, normalize_branch_slug, slugify

CHAIN = "Ovum Woman & Child Speciality Hospital"


@pytest.mark.parametrize(
    ("branch", "expected"),
    [
        ("Ovum Hospital — Kalyan Nagar", "ovum-kalyan-nagar"),
        ("Ovum Hospital – HSR Layout", "ovum-hsr-layout"),
        ("Ovum Hospital - Budigere Cross", "ovum-budigere-cross"),
        ("Electronic City", "ovum-electronic-city"),
    ],
)
def test_branch_slug_base(branch: str, expected: str) -> None:
    assert branch_slug_base(branch, CHAIN) == expected


def test_slugify_strips_symbols_and_accents() -> None:
    assert slugify("  Café  &  Co. ") == "cafe-co"


@pytest.mark.parametrize("value", ["", "a", "apply", "--"])
def test_normalize_rejects_short_or_reserved(value: str) -> None:
    with pytest.raises(ValueError):
        normalize_branch_slug(value)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    session.add(
        HospitalChain(
            id="chain-1", name=CHAIN, phone="9000000000", email="c@t.com",
            street="S", city="C", state="ST", pinCode="000000",
        )
    )
    session.commit()
    yield session
    session.close()


def _create(db, name: str, **extra) -> Branch:
    data = {
        "name": name,
        "email": f"{uuid.uuid4().hex[:8]}@t.com",
        "phone": uuid.uuid4().hex[:10],
        "street": "S",
        "city": "Bengaluru",
        "state": "KA",
        "pinCode": "560001",
        **extra,
    }
    return BranchesService(db).create("chain-1", data, {"role": "SUPER_ADMIN"})


def test_create_assigns_unique_slugs(db) -> None:
    first = _create(db, "Ovum Hospital — Kalyan Nagar")
    second = _create(db, "Ovum Kalyan Nagar")
    assert first.slug == "ovum-kalyan-nagar"
    assert second.slug == "ovum-kalyan-nagar-2"


def test_admin_can_rename_slug_but_not_to_a_taken_one(db) -> None:
    first = _create(db, "Ovum Hospital — Kalyan Nagar")
    second = _create(db, "Ovum Hospital — Hennur")
    svc = BranchesService(db)
    renamed = svc.update("chain-1", second.id, {"slug": "Ovum Hennur Road"}, {"role": "SUPER_ADMIN"})
    assert renamed.slug == "ovum-hennur-road"
    with pytest.raises(HTTPException) as exc:
        svc.update("chain-1", second.id, {"slug": first.slug}, {"role": "SUPER_ADMIN"})
    assert exc.value.status_code == 409
