import io
from urllib.parse import urlencode

import qrcode
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Branch, HospitalChain, User
from app.models.enums import Role


class BranchesService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _ensure_chain(self, chain_id: str) -> HospitalChain:
        chain = self.db.get(HospitalChain, chain_id)
        if not chain:
            raise HTTPException(status_code=404, detail="Hospital chain not found")
        return chain

    def _ensure_access(self, user: dict, chain_id: str) -> None:
        if user["role"] == Role.CHAIN_ADMIN.value and user.get("hospitalChainId") != chain_id:
            raise HTTPException(status_code=403, detail="You can only access branches in your own chain")

    def _generate_qr(self, branch: Branch) -> str:
        settings = get_settings()
        params = urlencode({"branchId": branch.id, "name": branch.name})
        url = f"{settings.visitor_form_url}?{params}"
        img = qrcode.make(url)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        import base64

        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

    def create(self, chain_id: str, data: dict, user: dict) -> Branch:
        self._ensure_chain(chain_id)
        self._ensure_access(user, chain_id)
        existing = (
            self.db.query(Branch)
            .filter(
                Branch.hospitalChainId == chain_id,
                (Branch.phone == data["phone"]) | (Branch.email == data["email"]),
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="A branch with this phone or email already exists in this chain.")
        branch = Branch(**data, hospitalChainId=chain_id)
        self.db.add(branch)
        self.db.commit()
        self.db.refresh(branch)
        branch.qrCode = self._generate_qr(branch)
        self.db.commit()
        self.db.refresh(branch)
        return branch

    def find_all(self, chain_id: str, user: dict) -> list[Branch]:
        self._ensure_chain(chain_id)
        self._ensure_access(user, chain_id)
        return self.db.query(Branch).filter(Branch.hospitalChainId == chain_id).all()

    def find_one(self, chain_id: str, branch_id: str, user: dict) -> Branch:
        self._ensure_chain(chain_id)
        self._ensure_access(user, chain_id)
        branch = (
            self.db.query(Branch)
            .filter(Branch.id == branch_id, Branch.hospitalChainId == chain_id)
            .first()
        )
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found.")
        return branch

    def update(self, chain_id: str, branch_id: str, data: dict, user: dict) -> Branch:
        branch = self.find_one(chain_id, branch_id, user)
        for key, value in data.items():
            if value is not None:
                setattr(branch, key, value)
        self.db.commit()
        self.db.refresh(branch)
        return branch

    def remove(self, chain_id: str, branch_id: str, user: dict) -> dict:
        branch = self.find_one(chain_id, branch_id, user)
        self.db.delete(branch)
        self.db.commit()
        return {
            "success": True,
            "message": "Branch deleted successfully. Manage associated users separately.",
        }

    def generate_qr_code(self, chain_id: str, branch_id: str, user: dict) -> Branch:
        branch = self.find_one(chain_id, branch_id, user)
        branch.qrCode = self._generate_qr(branch)
        self.db.commit()
        self.db.refresh(branch)
        return branch
