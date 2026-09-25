from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Branch, HospitalChain, User
from app.models.enums import Role
from app.utils.serializers import model_to_dict


class HospitalChainsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _ensure_unique(self, phone: str, email: str) -> None:
        existing = (
            self.db.query(HospitalChain)
            .filter((HospitalChain.phone == phone) | (HospitalChain.email == email))
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Hospital chain with this phone or email already exists.")

    def create(self, data: dict) -> dict:
        self._ensure_unique(data["phone"], data["email"])
        chain = HospitalChain(**data)
        self.db.add(chain)
        self.db.commit()
        self.db.refresh(chain)
        return model_to_dict(chain)

    def find_all_light(self) -> list[dict]:
        """List chains with branches — batched queries (no per-chain N+1)."""
        chains = self.db.query(HospitalChain).all()
        if not chains:
            return []

        chain_ids = [c.id for c in chains]
        branches_by_chain: dict[str, list[dict]] = defaultdict(list)
        for branch in self.db.query(Branch).filter(Branch.hospitalChainId.in_(chain_ids)).all():
            branches_by_chain[branch.hospitalChainId].append(model_to_dict(branch))

        admin_counts = dict(
            self.db.query(User.hospitalChainId, func.count(User.id))
            .filter(
                User.hospitalChainId.in_(chain_ids),
                User.role == Role.CHAIN_ADMIN.value,
            )
            .group_by(User.hospitalChainId)
            .all()
        )

        result = []
        for chain in chains:
            item = model_to_dict(chain)
            item["branches"] = branches_by_chain.get(chain.id, [])
            item["_count"] = {"users": admin_counts.get(chain.id, 0)}
            result.append(item)
        return result

    def find_all(self) -> list[dict]:
        return self.find_all_light()

    def find_one(self, chain_id: str) -> dict:
        chain = self.db.get(HospitalChain, chain_id)
        if not chain:
            raise HTTPException(status_code=404, detail="Hospital chain not found")
        data = model_to_dict(chain)
        data["branches"] = [model_to_dict(b) for b in self.db.query(Branch).filter(Branch.hospitalChainId == chain_id)]
        data["users"] = [
            model_to_dict(u)
            for u in self.db.query(User).filter(User.hospitalChainId == chain_id, User.role == Role.CHAIN_ADMIN.value)
        ]
        return data

    def update(self, chain_id: str, data: dict) -> dict:
        chain = self.db.get(HospitalChain, chain_id)
        if not chain:
            raise HTTPException(status_code=404, detail="Hospital chain not found")
        for key, value in data.items():
            if value is not None:
                setattr(chain, key, value)
        self.db.commit()
        self.db.refresh(chain)
        return model_to_dict(chain)

    def remove(self, chain_id: str) -> dict:
        chain = self.db.get(HospitalChain, chain_id)
        if not chain:
            raise HTTPException(status_code=404, detail="Hospital chain not found")
        branches = self.db.query(Branch).filter(Branch.hospitalChainId == chain_id).count()
        if branches > 0:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete a hospital chain with active branches. Please delete branches first.",
            )
        self.db.delete(chain)
        self.db.commit()
        return {"success": True, "message": "Hospital chain deleted successfully."}
