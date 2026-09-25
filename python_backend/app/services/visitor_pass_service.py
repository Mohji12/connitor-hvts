"""Per-branch daily visitor pass pool — issue, assign, recycle."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import Branch, User, Visit, Visitor, VisitorPass
from app.models.entities import BranchVisitorPassPolicy
from app.models.enums import (
    AppointmentMode,
    Role,
    VisitCategory,
    VisitStatus,
    VisitorPassSource,
    VisitorPassStatus,
)
from app.utils.timezone import now_ist

DEFAULT_DAILY_QUOTA = 50
MANAGE_ROLES = {
    Role.SUPER_ADMIN.value,
    Role.HOSPITAL_ADMIN.value,
    Role.BRANCH_ADMIN.value,
}
ASSIGN_ROLES = MANAGE_ROLES | {
    Role.SECURITY.value,
    Role.SECURITY_SUPERVISOR.value,
}


def branch_prefix(name: str | None) -> str:
    letters = re.sub(r"[^A-Za-z0-9]", "", name or "")
    return (letters[:3] or "BRN").upper()


def _parse_date(value: str | date | datetime | None) -> date:
    if value is None:
        return now_ist().date()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value).strip()[:10], "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.") from exc


class VisitorPassService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _assert_branch_access(self, user: dict, branch_id: str) -> None:
        role = user.get("role")
        if role == Role.SUPER_ADMIN.value:
            return
        if user.get("branchId") != branch_id:
            raise HTTPException(status_code=403, detail="You do not have access to this branch.")

    def _require_manage(self, user: dict) -> None:
        if user.get("role") not in MANAGE_ROLES:
            raise HTTPException(status_code=403, detail="Not allowed to manage visitor passes.")

    def _require_assign(self, user: dict) -> None:
        if user.get("role") not in ASSIGN_ROLES:
            raise HTTPException(status_code=403, detail="Not allowed to assign visitor passes.")

    def get_or_create_policy(self, branch_id: str) -> BranchVisitorPassPolicy:
        policy = (
            self.db.query(BranchVisitorPassPolicy)
            .filter(BranchVisitorPassPolicy.branchId == branch_id)
            .first()
        )
        if policy:
            return policy
        policy = BranchVisitorPassPolicy(branchId=branch_id, dailyQuota=DEFAULT_DAILY_QUOTA)
        self.db.add(policy)
        self.db.flush()
        return policy

    def get_policy(self, user: dict, branch_id: str) -> dict:
        self._assert_branch_access(user, branch_id)
        policy = self.get_or_create_policy(branch_id)
        self.db.commit()
        return {"branchId": branch_id, "dailyQuota": policy.dailyQuota}

    def update_policy(self, user: dict, branch_id: str, daily_quota: int) -> dict:
        self._require_manage(user)
        self._assert_branch_access(user, branch_id)
        if daily_quota < 1 or daily_quota > 5000:
            raise HTTPException(status_code=400, detail="dailyQuota must be between 1 and 5000.")
        policy = self.get_or_create_policy(branch_id)
        policy.dailyQuota = daily_quota
        self.db.commit()
        return {"branchId": branch_id, "dailyQuota": policy.dailyQuota}

    def _counts(self, branch_id: str, pass_date: date) -> tuple[int, int, int]:
        rows = (
            self.db.query(VisitorPass.status, func.count(VisitorPass.id))
            .filter(
                VisitorPass.branchId == branch_id,
                VisitorPass.passDate == pass_date,
                VisitorPass.status != VisitorPassStatus.VOID.value,
            )
            .group_by(VisitorPass.status)
            .all()
        )
        unused = 0
        assigned = 0
        for status, count in rows:
            if status == VisitorPassStatus.UNASSIGNED.value:
                unused = count
            elif status == VisitorPassStatus.ASSIGNED.value:
                assigned = count
        allotted = unused + assigned
        return allotted, unused, assigned

    def _max_sequence(self, branch_id: str, pass_date: date) -> int:
        value = (
            self.db.query(func.max(VisitorPass.sequence))
            .filter(VisitorPass.branchId == branch_id, VisitorPass.passDate == pass_date)
            .scalar()
        )
        return int(value or 0)

    def issue_pool(
        self,
        user: dict,
        branch_id: str,
        *,
        pass_date: str | date | None = None,
        count: int | None = None,
    ) -> dict:
        self._require_manage(user)
        self._assert_branch_access(user, branch_id)
        branch = self.db.get(Branch, branch_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Hospital location not found.")
        day = _parse_date(pass_date)
        policy = self.get_or_create_policy(branch_id)
        allotted, unused, assigned = self._counts(branch_id, day)
        remaining_quota = max(policy.dailyQuota - allotted, 0)
        to_create = remaining_quota if count is None else min(count, remaining_quota)
        if to_create < 1:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Daily visitor pass quota already fully issued for this date. "
                    "Raise the quota first if you need more passes."
                ),
            )
        prefix = branch_prefix(branch.name)
        date_token = day.strftime("%y%m%d")
        start_seq = self._max_sequence(branch_id, day)
        created: list[VisitorPass] = []
        for i in range(1, to_create + 1):
            seq = start_seq + i
            row = VisitorPass(
                passId=f"{prefix}-{date_token}-{seq:04d}",
                branchId=branch_id,
                passDate=day,
                sequence=seq,
                status=VisitorPassStatus.UNASSIGNED.value,
                source=VisitorPassSource.HOSPITAL_POOL.value,
                createdById=user.get("id"),
            )
            self.db.add(row)
            created.append(row)
        self.db.commit()
        allotted, unused, assigned = self._counts(branch_id, day)
        return {
            "created": len(created),
            "date": day.isoformat(),
            "allotted": allotted,
            "unused": unused,
            "assigned": assigned,
            "dailyQuota": policy.dailyQuota,
            "items": [self._serialize(p) for p in created],
        }

    def list_passes(
        self,
        user: dict,
        branch_id: str,
        *,
        pass_date: str | date | None = None,
        query: str | None = None,
    ) -> dict:
        self._assert_branch_access(user, branch_id)
        if user.get("role") not in ASSIGN_ROLES:
            raise HTTPException(status_code=403, detail="Not allowed to view visitor passes.")
        day = _parse_date(pass_date)
        policy = self.get_or_create_policy(branch_id)
        self.attach_missing_passes(branch_id, day)
        q = (
            self.db.query(VisitorPass)
            .options(
                joinedload(VisitorPass.visit).joinedload(Visit.visitor),
                joinedload(VisitorPass.visit).joinedload(Visit.staff),
            )
            .filter(VisitorPass.branchId == branch_id, VisitorPass.passDate == day)
            .order_by(VisitorPass.sequence.asc())
        )
        needle = (query or "").strip()
        if needle:
            like = f"%{needle}%"
            q = q.outerjoin(Visit, VisitorPass.visitId == Visit.id).outerjoin(Visitor, Visit.visitorId == Visitor.id)
            q = q.filter(
                (VisitorPass.passId.ilike(like))
                | (Visitor.firstName.ilike(like))
                | (Visitor.lastName.ilike(like))
                | (Visitor.phone.ilike(like))
            )
        raw_items = q.all()
        seen: set[str] = set()
        items = []
        for row in raw_items:
            if row.id in seen:
                continue
            seen.add(row.id)
            items.append(row)
        allotted, unused, assigned = self._counts(branch_id, day)
        return {
            "date": day.isoformat(),
            "dailyQuota": policy.dailyQuota,
            "allotted": allotted,
            "unused": unused,
            "assigned": assigned,
            "items": [self._serialize(p) for p in items],
        }

    def allocate_for_visit(self, visit: Visit, *, assigned_by_id: str | None) -> VisitorPass | None:
        """Consume the next unused pass for the visit date. Caller must commit."""
        if visit.appointmentMode == AppointmentMode.ONLINE.value:
            return None
        if visit.visitorPassId:
            existing = (
                self.db.query(VisitorPass).filter(VisitorPass.passId == visit.visitorPassId).first()
            )
            if existing:
                if existing.status == VisitorPassStatus.UNASSIGNED.value:
                    self._bind_pass(existing, visit, assigned_by_id)
                return existing
        day = visit.appointmentDate.date() if visit.appointmentDate else now_ist().date()
        q = (
            self.db.query(VisitorPass)
            .filter(
                VisitorPass.branchId == visit.branchId,
                VisitorPass.passDate == day,
                VisitorPass.status == VisitorPassStatus.UNASSIGNED.value,
            )
            .order_by(VisitorPass.sequence.asc())
        )
        bind = self.db.get_bind()
        dialect = bind.dialect.name if bind is not None else ""
        if dialect in ("mysql", "postgresql"):
            q = q.with_for_update(skip_locked=True)
        row = q.first()
        if not row:
            allotted, _unused, _assigned = self._counts(visit.branchId, day)
            if allotted == 0:
                raise HTTPException(
                    status_code=409,
                    detail="Today's visitor pass pool has not been issued by hospital management.",
                )
            raise HTTPException(
                status_code=409,
                detail="Daily visitor pass quota exhausted for this date.",
            )
        self._bind_pass(row, visit, assigned_by_id)
        return row

    def attach_missing_passes(self, branch_id: str, pass_date: date) -> int:
        """Assign unused IDs to in-person visits already approved that day without a pass."""
        start = datetime.combine(pass_date, datetime.min.time())
        end = start + timedelta(days=1)
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(
                Visit.branchId == branch_id,
                Visit.visitorPassId.is_(None),
                Visit.appointmentMode != AppointmentMode.ONLINE.value,
                Visit.status.in_(
                    [
                        VisitStatus.APPROVED.value,
                        VisitStatus.CHECKED_IN.value,
                        VisitStatus.CHECKED_OUT.value,
                    ]
                ),
                Visit.appointmentDate.isnot(None),
                Visit.appointmentDate >= start,
                Visit.appointmentDate < end,
            )
            .order_by(Visit.appointmentDate.asc())
            .all()
        )
        attached = 0
        for visit in visits:
            try:
                self.allocate_for_visit(visit, assigned_by_id=None)
                attached += 1
            except HTTPException:
                break
        if attached:
            self.db.commit()
        return attached

    def assign_specific(
        self,
        user: dict,
        pass_id: str,
        *,
        first_name: str,
        last_name: str,
        phone: str,
        purpose: str,
        doctor_id: str | None = None,
        appointment_date: str | None = None,
    ) -> dict:
        """Attach an unused hospital-issued pass to a named visitor (creates APPROVED visit)."""
        self._require_assign(user)
        row = self.db.query(VisitorPass).filter(VisitorPass.passId == pass_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Pass ID not found.")
        self._assert_branch_access(user, row.branchId)
        if row.status != VisitorPassStatus.UNASSIGNED.value:
            raise HTTPException(status_code=409, detail="This pass is already assigned.")
        if not phone.isdigit() or len(phone) != 10:
            raise HTTPException(status_code=400, detail="Phone must be a 10-digit number.")
        if len(purpose.strip()) < 3:
            raise HTTPException(status_code=400, detail="Purpose is required.")

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.phone == phone, Visitor.branchId == row.branchId)
            .first()
        )
        if visitor:
            visitor.firstName = first_name.strip()
            visitor.lastName = last_name.strip()
        else:
            visitor = Visitor(
                firstName=first_name.strip(),
                lastName=last_name.strip(),
                phone=phone,
                branchId=row.branchId,
            )
            self.db.add(visitor)
            self.db.flush()

        doctor = self.db.get(User, doctor_id) if doctor_id else None
        appt = parse_appointment(appointment_date, row.passDate)
        visit = Visit(
            visitorId=visitor.id,
            staffId=doctor.id if doctor else None,
            staffName=doctor.name if doctor else None,
            staffPhone=doctor.phone if doctor else None,
            branchId=row.branchId,
            purpose=purpose.strip(),
            appointmentDate=appt,
            appointmentMode=AppointmentMode.IN_PERSON.value,
            visitCategory=VisitCategory.MEETING.value,
            visitSubType="HOSPITAL_PASS",
            status=VisitStatus.APPROVED.value,
            isCodeUsed=True,
        )
        self.db.add(visit)
        self.db.flush()
        self._bind_pass(row, visit, user.get("id"))

        import random
        from datetime import timedelta

        from app.services.staff_service import StaffService

        staff = StaffService(self.db)
        visit_code = f"{random.randint(100000, 999999)}"
        visit.visitCode = visit_code
        visit.checkInOtp = visit_code
        visit.checkInOtpExpiry = now_ist() + timedelta(hours=8)
        visit.visitQRCode = staff._generate_qr_base64(visit, visit_code)
        self.db.commit()
        self.db.refresh(row)
        return {"message": "Pass assigned.", "pass": self._serialize(row)}

    def recycle_for_visit(self, visit: Visit) -> None:
        """Return the pass to UNASSIGNED if the visitor never checked in."""
        if visit.checkInTime is not None:
            return
        row = None
        if visit.visitorPassId:
            row = self.db.query(VisitorPass).filter(VisitorPass.passId == visit.visitorPassId).first()
        if row is None and visit.id:
            row = self.db.query(VisitorPass).filter(VisitorPass.visitId == visit.id).first()
        if not row:
            return
        row.status = VisitorPassStatus.UNASSIGNED.value
        row.visitId = None
        row.assignedAt = None
        row.assignedById = None
        visit.visitorPassId = None

    def _bind_pass(self, row: VisitorPass, visit: Visit, assigned_by_id: str | None) -> None:
        row.status = VisitorPassStatus.ASSIGNED.value
        row.visitId = visit.id
        row.assignedAt = now_ist()
        row.assignedById = assigned_by_id
        visit.visitorPassId = row.passId
        visit.issuedPass = row
        self.db.flush()

    def _serialize(self, row: VisitorPass) -> dict:
        visit = row.visit
        visitor = visit.visitor if visit else None
        return {
            "id": row.id,
            "passId": row.passId,
            "branchId": row.branchId,
            "date": row.passDate.isoformat() if row.passDate else None,
            "sequence": row.sequence,
            "status": row.status,
            "source": row.source,
            "createdByHospital": row.source == VisitorPassSource.HOSPITAL_POOL.value,
            "visitId": row.visitId,
            "visitorName": (
                f"{visitor.firstName} {visitor.lastName}".strip() if visitor else None
            ),
            "visitorPhone": visitor.phone if visitor else None,
            "doctorName": (visit.staff.name if visit and visit.staff else visit.staffName)
            if visit
            else None,
            "appointmentDate": visit.appointmentDate.isoformat() if visit and visit.appointmentDate else None,
            "purpose": visit.purpose if visit else None,
            "visitStatus": visit.status if visit else None,
            "assignedAt": row.assignedAt.isoformat() if row.assignedAt else None,
        }


def parse_appointment(value: str | None, fallback_date: date) -> datetime:
    if not value:
        return datetime.combine(fallback_date, datetime.min.time().replace(hour=10))
    try:
        from app.utils.timezone import parse_to_ist_naive

        return parse_to_ist_naive(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid appointmentDate format.") from exc
