"""Public profile card JSON and vCard download."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import public_route
from app.services.profile_share_service import ProfileShareService

router = APIRouter()


@router.get("/{token}")
@public_route
def get_profile_card(token: str, db: Annotated[Session, Depends(get_db)]):
    return ProfileShareService(db).get_card(token)


@router.get("/{token}/vcard")
@public_route
def download_profile_vcard(token: str, db: Annotated[Session, Depends(get_db)]):
    return ProfileShareService(db).get_vcard(token)
