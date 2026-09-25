from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.all_branches_service import AllBranchesService

router = APIRouter(dependencies=[Depends(get_current_user), Depends(require_roles(Role.SUPER_ADMIN.value))])


@router.get("/all-branches")
def get_all_branches(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return AllBranchesService(db).find_all_branches(user)
