"""Public profile cards: share token, JSON, and vCard."""

from __future__ import annotations

import re
import uuid

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.config import get_public_frontend_url
from app.models.delivery_entities import Distributor
from app.models.entities import User
from app.models.enums import ProfileStatus
from app.models.visitor_account_entities import VisitorAccount
from app.utils.timezone import now_ist


class ProfileShareService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def card_url(self, token: str) -> str:
        return f"{get_public_frontend_url()}/card/{token}/"

    def ensure_user_token(self, user: User) -> str:
        if user.profileShareToken:
            return user.profileShareToken
        user.profileShareToken = str(uuid.uuid4())
        user.updatedAt = now_ist()
        self.db.commit()
        self.db.refresh(user)
        return user.profileShareToken

    def ensure_visitor_token(self, account: VisitorAccount) -> str:
        if account.profileShareToken:
            return account.profileShareToken
        account.profileShareToken = str(uuid.uuid4())
        account.updatedAt = now_ist()
        self.db.commit()
        self.db.refresh(account)
        return account.profileShareToken

    def share_fields_for_user(self, user: User) -> dict:
        token = self.ensure_user_token(user)
        return {
            "profileShareToken": token,
            "profileCardUrl": self.card_url(token),
        }

    def share_fields_for_visitor(self, account: VisitorAccount) -> dict:
        token = self.ensure_visitor_token(account)
        return {
            "profileShareToken": token,
            "profileCardUrl": self.card_url(token),
        }

    def get_card(self, token: str) -> dict:
        return self._resolve(token)

    def get_vcard(self, token: str) -> Response:
        card = self._resolve(token)
        body = self._build_vcard(card)
        filename = re.sub(r"[^A-Za-z0-9._-]+", "_", card["name"] or "contact").strip("_") or "contact"
        return Response(
            content=body,
            media_type="text/vcard; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}.vcf"'},
        )

    def _resolve(self, token: str) -> dict:
        value = (token or "").strip()
        if not value:
            raise HTTPException(status_code=404, detail="Profile card not found")
        user = (
            self.db.query(User)
            .options(joinedload(User.hospitalChain))
            .filter(User.profileShareToken == value)
            .first()
        )
        if user:
            if not user.isActive:
                raise HTTPException(status_code=404, detail="Profile card not found")
            return self._from_user(user)
        account = self.db.query(VisitorAccount).filter(VisitorAccount.profileShareToken == value).first()
        if account:
            if account.profileStatus == ProfileStatus.SUSPENDED.value:
                raise HTTPException(status_code=404, detail="Profile card not found")
            return self._from_visitor(account)
        raise HTTPException(status_code=404, detail="Profile card not found")

    def _from_user(self, user: User) -> dict:
        org = None
        title = None
        kind = "STAFF"
        if user.distributorId:
            kind = "DISTRIBUTOR"
            dist = self.db.get(Distributor, user.distributorId)
            org = dist.vendorName if dist else None
            title = "Desk security" if user.role == "DISTRIBUTOR_SECURITY" else "Distributor"
        elif user.role == "SECURITY" or user.role == "SECURITY_SUPERVISOR":
            title = "Security"
            org = user.hospitalChain.name if user.hospitalChain else None
        elif user.role == "STAFF":
            title = user.userType or "Staff"
            org = user.hospitalChain.name if user.hospitalChain else None
        else:
            title = user.role.replace("_", " ").title()
            org = user.hospitalChain.name if user.hospitalChain else None
        return {
            "name": (user.name or "").strip() or "Conninter contact",
            "phone": user.phone,
            "email": user.email,
            "title": title,
            "organization": org,
            "kind": kind,
        }

    def _from_visitor(self, account: VisitorAccount) -> dict:
        return {
            "name": f"{account.firstName} {account.lastName}".strip(),
            "phone": account.phone,
            "email": account.email,
            "title": account.jobTitle,
            "organization": account.companyName,
            "kind": "VISITOR",
        }

    @staticmethod
    def _escape(value: str) -> str:
        return (
            value.replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\n", "\\n")
        )

    def _build_vcard(self, card: dict) -> str:
        lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            f"FN:{self._escape(card['name'])}",
        ]
        if card.get("title"):
            lines.append(f"TITLE:{self._escape(str(card['title']))}")
        if card.get("organization"):
            lines.append(f"ORG:{self._escape(str(card['organization']))}")
        if card.get("phone"):
            lines.append(f"TEL;TYPE=CELL:{self._escape(str(card['phone']))}")
        if card.get("email"):
            lines.append(f"EMAIL:{self._escape(str(card['email']))}")
        lines.append("END:VCARD")
        return "\r\n".join(lines) + "\r\n"
