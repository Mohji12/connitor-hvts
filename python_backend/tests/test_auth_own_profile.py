import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import User
from app.models.enums import Role
from app.services.auth_service import AuthService
from app.utils.passwords import hash_password, verify_password
import app.models.delivery_entities  # noqa: F401
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
import app.models.visitor_account_entities  # noqa: F401


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


def _user(db, **overrides) -> User:
    payload = {
        "name": "Dr Test",
        "phone": "9123456780",
        "email": "doctor@hospital.com",
        "role": Role.STAFF.value,
        "passwordHash": hash_password("Conninter123@"),
        "isActive": True,
    }
    payload.update(overrides)
    row = User(**payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_staff_can_update_own_profile(db):
    user = _user(db)
    svc = AuthService(db)
    result = svc.update_own_profile(
        user.id,
        {
            "name": "Dr Priya",
            "email": "priya@hospital.com",
            "phone": "9000000111",
        },
    )
    assert result["name"] == "Dr Priya"
    assert result["email"] == "priya@hospital.com"
    assert result["phone"] == "9000000111"
    assert result["access_token"]


def test_staff_can_change_password(db):
    user = _user(db)
    svc = AuthService(db)
    svc.update_own_profile(
        user.id,
        {
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "currentPassword": "Conninter123@",
            "newPassword": "NewPass123@",
        },
    )
    fresh = db.get(User, user.id)
    assert verify_password("NewPass123@", fresh.passwordHash)


def test_wrong_current_password_is_rejected(db):
    user = _user(db)
    svc = AuthService(db)
    with pytest.raises(HTTPException) as ctx:
        svc.update_own_profile(
            user.id,
            {
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "currentPassword": "nope",
                "newPassword": "NewPass123@",
            },
        )
    assert ctx.value.status_code == 400


def test_duplicate_email_is_rejected(db):
    _user(db, email="taken@hospital.com", phone="9111111111")
    user = _user(db, email="mine@hospital.com", phone="9222222222")
    svc = AuthService(db)
    with pytest.raises(HTTPException) as ctx:
        svc.update_own_profile(
            user.id,
            {"name": "Mine", "email": "taken@hospital.com", "phone": "9222222222"},
        )
    assert ctx.value.status_code == 409
