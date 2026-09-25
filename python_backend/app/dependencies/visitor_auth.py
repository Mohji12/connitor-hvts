from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import VisitorAccount
from app.models.enums import ProfileStatus

visitor_security = HTTPBearer(auto_error=False)


def _decode_visitor_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc


def get_current_visitor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)],
) -> dict:
    """Visitor JWT — legacy email OTP or pre-registered account."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in to view your appointments.")

    payload = _decode_visitor_token(credentials.credentials)
    if payload.get("role") != "VISITOR":
        raise HTTPException(status_code=401, detail="Invalid visitor session.")

    sub = payload.get("sub")
    email = payload.get("email")
    if sub and "@" not in str(sub):
        return {
            "accountId": str(sub),
            "email": email,
            "phone": payload.get("phone"),
            "name": payload.get("name"),
        }

    ident = email or sub
    if not ident:
        raise HTTPException(status_code=401, detail="Invalid visitor session.")

    return {
        "email": str(ident),
        "name": payload.get("name"),
        "accountId": None,
    }


def get_current_visitor_account(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in required.")

    payload = _decode_visitor_token(credentials.credentials)
    if payload.get("role") != "VISITOR":
        raise HTTPException(status_code=401, detail="Invalid visitor session.")

    account_id = payload.get("sub")
    if not account_id:
        raise HTTPException(status_code=401, detail="Invalid visitor session.")

    account = db.get(VisitorAccount, account_id)
    if not account:
        raise HTTPException(status_code=401, detail="Visitor account not found.")
    if account.profileStatus != ProfileStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Complete registration to access the dashboard.")

    return {
        "accountId": account.id,
        "email": account.email,
        "phone": account.phone,
        "name": f"{account.firstName} {account.lastName}".strip(),
    }
