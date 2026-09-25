from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import Branch
from app.models.enums import Role
from app.utils.serializers import model_to_dict


class AllBranchesService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_all_branches(self, user: dict) -> list[dict]:
        if user["role"] != Role.SUPER_ADMIN.value:
            raise HTTPException(status_code=403, detail="Access denied")
        branches = self.db.query(Branch).options(joinedload(Branch.hospitalChain)).all()
        result = []
        for branch in branches:
            item = model_to_dict(branch)
            item["hospitalChain"] = model_to_dict(branch.hospitalChain) if branch.hospitalChain else None
            result.append(item)
        return result
