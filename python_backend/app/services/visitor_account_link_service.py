"""Link global VisitorAccount to branch-scoped Visitor records."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Visitor, VisitorAccount
from app.models.enums import ProfileStatus


class VisitorAccountLinkService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_branch_visitor(self, account_id: str, branch_id: str) -> Visitor:
        account = self.db.get(VisitorAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Visitor account not found")
        if account.profileStatus != ProfileStatus.ACTIVE.value:
            raise HTTPException(status_code=403, detail="Visitor account is not active")

        existing = (
            self.db.query(Visitor)
            .filter(Visitor.visitorAccountId == account_id, Visitor.branchId == branch_id)
            .first()
        )
        if existing:
            self._sync_fields(existing, account)
            self.db.commit()
            return existing

        by_phone = (
            self.db.query(Visitor)
            .filter(Visitor.phone == account.phone, Visitor.branchId == branch_id)
            .first()
        )
        if by_phone:
            by_phone.visitorAccountId = account_id
            self._sync_fields(by_phone, account)
            self.db.commit()
            return by_phone

        visitor = Visitor(
            firstName=account.firstName,
            lastName=account.lastName,
            phone=account.phone,
            email=account.email,
            company=account.companyName,
            designation=account.jobTitle,
            photo=account.photoStorageKey,
            branchId=branch_id,
            visitorAccountId=account_id,
            phoneVerified=account.phoneVerified,
        )
        self.db.add(visitor)
        self.db.commit()
        self.db.refresh(visitor)
        return visitor

    @staticmethod
    def _sync_fields(visitor: Visitor, account: VisitorAccount) -> None:
        visitor.firstName = account.firstName
        visitor.lastName = account.lastName
        visitor.email = account.email
        visitor.company = account.companyName
        visitor.designation = account.jobTitle
        if account.photoStorageKey:
            visitor.photo = account.photoStorageKey
        visitor.phoneVerified = account.phoneVerified
