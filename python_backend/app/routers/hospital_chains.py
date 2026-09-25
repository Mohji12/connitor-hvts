from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.hospital_chains_service import HospitalChainsService

router = APIRouter(dependencies=[Depends(get_current_user), Depends(require_roles(Role.SUPER_ADMIN.value))])


class ChainBody(BaseModel):
    name: str
    phone: str
    email: EmailStr
    street: str
    city: str
    state: str
    pinCode: str
    country: str = "India"


@router.post("")
def create_chain(body: ChainBody, db: Annotated[Session, Depends(get_db)]):
    return HospitalChainsService(db).create(body.model_dump())


@router.get("")
def list_chains(db: Annotated[Session, Depends(get_db)]):
    return HospitalChainsService(db).find_all()


@router.get("/{chain_id}")
def get_chain(chain_id: str, db: Annotated[Session, Depends(get_db)]):
    return HospitalChainsService(db).find_one(chain_id)


@router.patch("/{chain_id}")
def update_chain(chain_id: str, body: dict[str, Any], db: Annotated[Session, Depends(get_db)]):
    return HospitalChainsService(db).update(chain_id, body)


@router.delete("/{chain_id}")
def delete_chain(chain_id: str, db: Annotated[Session, Depends(get_db)]):
    return HospitalChainsService(db).remove(chain_id)
