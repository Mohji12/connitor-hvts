"""Public profile share token and vCard."""

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.database import Base
from app.models.delivery_entities import Distributor
from app.models.entities import User
from app.models.enums import ProfileStatus, Role
from app.models.visitor_account_entities import VisitorAccount
from app.services.auth_service import AuthService
from app.services.profile_share_service import ProfileShareService
from app.services.visitor_account_service import VisitorAccountService
from app.utils.passwords import hash_password


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
    yield session
    session.close()


def _staff(db, **overrides) -> User:
    payload = {
        "name": "Dr Priya",
        "phone": "9123456780",
        "email": "priya@hospital.com",
        "role": Role.STAFF.value,
        "userType": "Doctor",
        "passwordHash": hash_password("Conninter123@"),
        "isActive": True,
    }
    payload.update(overrides)
    row = User(**payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _visitor(db, **overrides) -> VisitorAccount:
    payload = {
        "firstName": "Riya",
        "lastName": "Shah",
        "phone": "9876500001",
        "email": "riya@example.com",
        "companyName": "Helix Labs",
        "jobTitle": "Sales",
        "profileStatus": ProfileStatus.ACTIVE.value,
    }
    payload.update(overrides)
    row = VisitorAccount(**payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_staff_profile_issues_token_and_vcard(db):
    user = _staff(db)
    profile = AuthService(db).get_profile(user.id)
    assert profile["profileShareToken"]
    assert "/card/" in profile["profileCardUrl"]

    svc = ProfileShareService(db)
    card = svc.get_card(profile["profileShareToken"])
    assert card["kind"] == "STAFF"
    assert card["name"] == "Dr Priya"
    assert card["phone"] == "9123456780"

    vcard = svc.get_vcard(profile["profileShareToken"])
    body = vcard.body.decode()
    assert "BEGIN:VCARD" in body
    assert "FN:Dr Priya" in body
    assert "TEL;TYPE=CELL:9123456780" in body
    assert "EMAIL:priya@hospital.com" in body


def test_inactive_staff_card_hidden(db):
    user = _staff(db, isActive=False, phone="9123456781", email="off@hospital.com")
    token = ProfileShareService(db).ensure_user_token(user)
    with pytest.raises(HTTPException) as ctx:
        ProfileShareService(db).get_card(token)
    assert ctx.value.status_code == 404


def test_visitor_card_kind_and_company(db):
    account = _visitor(db)
    preview = VisitorAccountService(db).get_preview(account.id)
    assert preview["profileShareToken"]
    card = ProfileShareService(db).get_card(preview["profileShareToken"])
    assert card["kind"] == "VISITOR"
    assert card["name"] == "Riya Shah"
    assert card["organization"] == "Helix Labs"
    assert card["title"] == "Sales"


def test_distributor_card_includes_vendor(db):
    dist = Distributor(
        vendorCode=f"V{uuid.uuid4().hex[:8]}",
        vendorName="Acme Pharma",
        vendorType="GENERAL_STORES",
        city="Bengaluru",
        goodsDescription="Hospital consumables",
        isActive=True,
        verificationStatus="APPROVED",
    )
    db.add(dist)
    db.commit()
    db.refresh(dist)
    user = _staff(
        db,
        name="Kiran Vendor",
        phone="9123456790",
        email="kiran@acme.com",
        role=Role.DISTRIBUTOR.value,
        userType=None,
        distributorId=dist.id,
    )
    token = ProfileShareService(db).ensure_user_token(user)
    card = ProfileShareService(db).get_card(token)
    assert card["kind"] == "DISTRIBUTOR"
    assert card["organization"] == "Acme Pharma"
    vcard = ProfileShareService(db).get_vcard(token).body.decode()
    assert "ORG:Acme Pharma" in vcard


def test_suspended_visitor_card_hidden(db):
    account = _visitor(db, phone="9876500002", email="off@example.com", profileStatus=ProfileStatus.SUSPENDED.value)
    token = ProfileShareService(db).ensure_visitor_token(account)
    with pytest.raises(HTTPException) as ctx:
        ProfileShareService(db).get_card(token)
    assert ctx.value.status_code == 404


def test_unknown_token_404(db):
    with pytest.raises(HTTPException) as ctx:
        ProfileShareService(db).get_card(str(uuid.uuid4()))
    assert ctx.value.status_code == 404
