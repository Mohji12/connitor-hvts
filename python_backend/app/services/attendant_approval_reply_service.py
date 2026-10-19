"""WhatsApp Confirm/Reject replies from the FIXED primary attendant for secondary visitor passes."""

from __future__ import annotations

import logging
import re

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.attendant.pass_service import AttendantPassService
from app.models.attendant_entities import Attendant
from app.utils.phone import normalize_phone, phones_match, strip_channel_prefix

logger = logging.getLogger(__name__)

ATT_BUTTON_PATTERN = re.compile(r"^att(ok|no)_(\d{6})$", re.IGNORECASE)
ATT_TEXT_PATTERN = re.compile(r"^(CONFIRM|REJECT|YES|NO|Y|N)\s*(\d{6})$", re.IGNORECASE)
ATT_LABEL_PATTERN = re.compile(r"^(confirm|reject|yes|no|y|n)$", re.IGNORECASE)


def parse_attendant_button_reply(button_id: str) -> tuple[str, str | None] | None:
    stripped = (button_id or "").strip()
    match = ATT_BUTTON_PATTERN.match(stripped)
    if match:
        action = "approve" if match.group(1).lower() == "ok" else "reject"
        return action, match.group(2)
    label = ATT_LABEL_PATTERN.match(stripped)
    if not label:
        return None
    keyword = label.group(1).lower()
    if keyword in ("no", "n", "reject"):
        return "reject", None
    return "approve", None


def parse_attendant_text_reply(body: str) -> tuple[str, str | None] | None:
    match = ATT_TEXT_PATTERN.match((body or "").strip())
    if not match:
        return None
    keyword = match.group(1).upper()
    action = "approve" if keyword in ("CONFIRM", "YES", "Y") else "reject"
    return action, match.group(2)


def is_attendant_approval_button(button_id: str) -> bool:
    return bool(ATT_BUTTON_PATTERN.match((button_id or "").strip()))


class AttendantApprovalReplyService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.passes = AttendantPassService(db)

    def _find_pending_visitor(self, *, code: str | None, primary_phone: str) -> Attendant | None:
        if code:
            row = (
                self.db.query(Attendant)
                .options(joinedload(Attendant.admission))
                .filter(
                    Attendant.smsApprovalCode == code,
                    Attendant.attendantKind == "VISITOR",
                    Attendant.status == "PENDING",
                )
                .first()
            )
            return row

        # Bare Confirm/Reject: newest PENDING visitor under admissions where this phone is FIXED primary.
        pending = (
            self.db.query(Attendant)
            .filter(
                Attendant.attendantKind == "VISITOR",
                Attendant.status == "PENDING",
            )
            .order_by(Attendant.createdAt.desc())
            .all()
        )
        for visitor in pending:
            primary = self.passes._fixed_primary_for_admission(visitor.admissionId)
            if primary and phones_match(primary.phone, primary_phone):
                return visitor
        return None

    def _is_fixed_primary_phone(self, from_phone: str) -> bool:
        normalized = normalize_phone(strip_channel_prefix(from_phone))
        rows = (
            self.db.query(Attendant)
            .filter(Attendant.attendantKind == "FIXED")
            .all()
        )
        for row in rows:
            if row.phone and phones_match(row.phone, normalized):
                return True
        return False

    def _process_action(self, *, from_phone: str, action: str, code: str | None) -> str:
        visitor = self._find_pending_visitor(code=code, primary_phone=from_phone)
        if not visitor:
            if code:
                return (
                    f"No pending attendant request found for code {code}. "
                    "It may already have been processed."
                )
            return "No attendant pass request is waiting for your approval."

        try:
            if action == "approve":
                issued = self.passes.approve_visitor_by_primary(
                    secondary_id=visitor.id, primary_phone=from_phone
                )
                name = visitor.name or "the visitor"
                pass_no = issued.get("passNumber") or ""
                return (
                    f"Approved. {name} will receive their attendant pass"
                    + (f" ({pass_no})" if pass_no else "")
                    + " on WhatsApp."
                )
            self.passes.reject_visitor_by_primary(
                secondary_id=visitor.id, primary_phone=from_phone
            )
            return f"Rejected. {visitor.name or 'The visitor'} will not receive a pass."
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else ""
            if exc.status_code in (400, 409):
                return detail or "This request was already processed."
            if exc.status_code == 404:
                return "Request not found."
            logger.exception("Attendant approval reply failed for %s: %s", visitor.id, detail)
            return "Could not process your reply. Please try again or ask reception."
        except Exception:
            logger.exception("Attendant approval unexpected error for %s", visitor.id)
            return "Something went wrong. Please try again or ask reception."

    def handle_button_reply(self, *, from_phone: str, button_id: str) -> str:
        parsed = parse_attendant_button_reply(button_id)
        if not parsed:
            return "Unrecognized button. Use Confirm or Reject on the attendant request message."
        action, code = parsed
        return self._process_action(from_phone=from_phone, action=action, code=code)

    def handle_reply(self, *, from_phone: str, body: str) -> str:
        parsed = parse_attendant_text_reply(body) or parse_attendant_button_reply(body)
        if not parsed:
            return (
                "Unrecognized reply. Tap Confirm or Reject on the attendant request, "
                "or send CONFIRM {code} / REJECT {code}."
            )
        action, code = parsed
        return self._process_action(from_phone=from_phone, action=action, code=code)

    def try_handle(
        self, *, from_phone: str, button_id: str | None = None, body: str | None = None
    ) -> str | None:
        """Return a reply string if this inbound is an attendant approval action; else None."""
        if button_id and is_attendant_approval_button(button_id):
            return self.handle_button_reply(from_phone=from_phone, button_id=button_id)
        if button_id and ATT_LABEL_PATTERN.match(button_id.strip()) and self._is_fixed_primary_phone(
            from_phone
        ):
            return self.handle_button_reply(from_phone=from_phone, button_id=button_id)
        if body and parse_attendant_text_reply(body):
            # Prefer attendant when the code matches a PENDING visitor, or sender is FIXED primary.
            code = parse_attendant_text_reply(body)[1]
            if code:
                pending = (
                    self.db.query(Attendant)
                    .filter(
                        Attendant.smsApprovalCode == code,
                        Attendant.attendantKind == "VISITOR",
                        Attendant.status == "PENDING",
                    )
                    .first()
                )
                if pending:
                    return self.handle_reply(from_phone=from_phone, body=body)
            if self._is_fixed_primary_phone(from_phone):
                return self.handle_reply(from_phone=from_phone, body=body)
        return None
