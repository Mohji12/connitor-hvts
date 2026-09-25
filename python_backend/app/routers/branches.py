from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.branches_service import BranchesService
from app.utils.serializers import model_to_dict

router = APIRouter(dependencies=[Depends(get_current_user)])


class BranchBody(BaseModel):
    name: str
    email: EmailStr
    phone: str
    street: str
    city: str
    state: str
    pinCode: str
    country: str = "India"


@router.post("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value))])
def create_branch(
    chain_id: str, body: BranchBody, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    branch = BranchesService(db).create(chain_id, body.model_dump(), user)
    return model_to_dict(branch)


@router.get("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value))])
def list_branches(chain_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return [model_to_dict(b) for b in BranchesService(db).find_all(chain_id, user)]


@router.get(
    "/{branch_id}",
    dependencies=[
        Depends(
            require_roles(
                Role.SUPER_ADMIN.value,
                Role.CHAIN_ADMIN.value,
                Role.BRANCH_ADMIN.value,
                Role.SECURITY.value,
                Role.SECURITY_SUPERVISOR.value,
            )
        )
    ],
)
def get_branch(
    chain_id: str, branch_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return model_to_dict(BranchesService(db).find_one(chain_id, branch_id, user))


@router.patch("/{branch_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value))])
def update_branch(
    chain_id: str,
    branch_id: str,
    body: dict[str, Any],
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return model_to_dict(BranchesService(db).update(chain_id, branch_id, body, user))


@router.delete("/{branch_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value))])
def delete_branch(
    chain_id: str, branch_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return BranchesService(db).remove(chain_id, branch_id, user)


@router.post("/{branch_id}/generate-qr", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value))])
def generate_qr(
    chain_id: str, branch_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return model_to_dict(BranchesService(db).generate_qr_code(chain_id, branch_id, user))
