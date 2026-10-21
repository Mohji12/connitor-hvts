import io

import qrcode
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_public_frontend_url
from app.models import Branch, HospitalChain
from app.models.enums import Role
from app.utils.slug import RESERVED_BRANCH_SLUGS, branch_slug_base, normalize_branch_slug

_OWN_BRANCH_ROLES = {
    Role.HOSPITAL_ADMIN.value,
    Role.BRANCH_ADMIN.value,
    Role.SECURITY.value,
    Role.SECURITY_SUPERVISOR.value,
}


def branch_gate_url(branch_id: str) -> str:
    return f"{get_public_frontend_url()}/gate/{branch_id}/"


def unique_branch_slug(db: Session, base: str, exclude_branch_id: str | None = None) -> str:
    """``base``, or ``base-2``, ``base-3``… when another branch already uses it."""
    candidate = base
    n = 2
    while True:
        q = db.query(Branch.id).filter(Branch.slug == candidate)
        if exclude_branch_id:
            q = q.filter(Branch.id != exclude_branch_id)
        if candidate not in RESERVED_BRANCH_SLUGS and q.first() is None:
            return candidate
        candidate = f"{base}-{n}"
        n += 1


def auto_branch_slug(db: Session, branch: Branch) -> str:
    chain = branch.hospitalChain or (
        db.get(HospitalChain, branch.hospitalChainId) if branch.hospitalChainId else None
    )
    base = branch_slug_base(branch.name, chain.name if chain else None)
    return unique_branch_slug(db, base, exclude_branch_id=branch.id)


class BranchesService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _ensure_chain(self, chain_id: str) -> HospitalChain:
        chain = self.db.get(HospitalChain, chain_id)
        if not chain:
            raise HTTPException(status_code=404, detail="Hospital chain not found")
        return chain

    def _ensure_access(self, user: dict, chain_id: str, branch_id: str | None = None) -> None:
        role = user.get("role")
        if role == Role.SUPER_ADMIN.value:
            return
        if role == Role.CHAIN_ADMIN.value:
            if user.get("hospitalChainId") != chain_id:
                raise HTTPException(status_code=403, detail="You can only access branches in your own chain")
            return
        if role in _OWN_BRANCH_ROLES:
            if user.get("hospitalChainId") and user.get("hospitalChainId") != chain_id:
                raise HTTPException(status_code=403, detail="You can only access your own hospital")
            if branch_id and user.get("branchId") != branch_id:
                raise HTTPException(status_code=403, detail="You can only access your own branch")
            return
        raise HTTPException(status_code=403, detail="Not allowed")

    def _validated_slug(self, value: str, branch_id: str | None) -> str:
        try:
            slug = normalize_branch_slug(value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        taken = self.db.query(Branch.id).filter(Branch.slug == slug)
        if branch_id:
            taken = taken.filter(Branch.id != branch_id)
        if taken.first() is not None:
            raise HTTPException(status_code=409, detail=f'The link name "{slug}" is already used by another hospital.')
        return slug

    def _generate_qr(self, branch: Branch) -> str:
        img = qrcode.make(branch_gate_url(branch.id))
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
        requested_slug = data.pop("slug", None)
        branch = Branch(**data, hospitalChainId=chain_id)
        if requested_slug:
            branch.slug = self._validated_slug(requested_slug, None)
        self.db.add(branch)
        self.db.commit()
        self.db.refresh(branch)
        if not branch.slug:
            branch.slug = auto_branch_slug(self.db, branch)
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
        self._ensure_access(user, chain_id, branch_id)
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
        data = dict(data)
        if "slug" in data:
            requested = data.pop("slug")
            branch.slug = (
                self._validated_slug(requested, branch.id)
                if isinstance(requested, str) and requested.strip()
                else auto_branch_slug(self.db, branch)
            )
        for key, value in data.items():
            if value is not None and key in Branch.__table__.columns and key not in ("id", "hospitalChainId"):
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
