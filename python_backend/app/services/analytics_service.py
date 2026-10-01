import time
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import TypeVar

from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist

from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session, joinedload

from app.models import Branch, Department, HospitalChain, SubDepartment, User, Visit, Visitor
from app.models.enums import Role, VisitStatus

OPERATIONAL_STAFF_ROLES = (
    Role.STAFF.value,
    Role.SECURITY.value,
    Role.SECURITY_SUPERVISOR.value,
)

_ANALYTICS_CACHE_TTL_SEC = 45
_analytics_cache: dict[str, tuple[float, object]] = {}
_T = TypeVar("_T")


def _analytics_cached(key: str, factory: Callable[[], _T]) -> _T:
    now = time.time()
    hit = _analytics_cache.get(key)
    if hit and now - hit[0] < _ANALYTICS_CACHE_TTL_SEC:
        return hit[1]  # type: ignore[return-value]
    value = factory()
    _analytics_cache[key] = (now, value)
    return value


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_system_overview(self) -> dict:
        today = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
        visit_row = (
            self.db.query(
                func.sum(case((Visit.status == VisitStatus.CHECKED_IN.value, 1), else_=0)),
                func.sum(case((Visit.createdAt >= today, 1), else_=0)),
            )
            .select_from(Visit)
            .one()
        )
        return {
            "totalChains": self.db.query(func.count(HospitalChain.id)).scalar() or 0,
            "totalBranches": self.db.query(func.count(Branch.id)).scalar() or 0,
            "totalDepartments": self.db.query(func.count(Department.id))
            .filter(Department.isActive == True)  # noqa: E712
            .scalar()
            or 0,
            "totalSubDepartments": self.db.query(func.count(SubDepartment.id))
            .filter(SubDepartment.isActive == True)  # noqa: E712
            .scalar()
            or 0,
            "totalStaff": self.db.query(func.count(User.id))
            .filter(User.role == Role.STAFF.value)
            .scalar()
            or 0,
            "totalVisitors": self.db.query(func.count(Visitor.id)).scalar() or 0,
            "activeVisits": int(visit_row[0] or 0),
            "todayVisits": int(visit_row[1] or 0),
        }

    def _count_visits_range(self, start: datetime, end: datetime, branch_ids: list[str] | None = None) -> dict:
        filters = []
        if branch_ids is not None:
            filters.append(Visit.branchId.in_(branch_ids))

        visits_expr = func.sum(
            case((and_(Visit.createdAt >= start, Visit.createdAt <= end), 1), else_=0)
        )
        check_in_expr = func.sum(
            case(
                (
                    and_(
                        Visit.checkInTime.isnot(None),
                        Visit.checkInTime >= start,
                        Visit.checkInTime <= end,
                    ),
                    1,
                ),
                else_=0,
            )
        )
        check_out_expr = func.sum(
            case(
                (
                    and_(
                        Visit.checkOutTime.isnot(None),
                        Visit.checkOutTime >= start,
                        Visit.checkOutTime <= end,
                    ),
                    1,
                ),
                else_=0,
            )
        )
        q = self.db.query(visits_expr, check_in_expr, check_out_expr).select_from(Visit)
        if filters:
            q = q.filter(*filters)
        visits, check_ins, check_outs = q.one()
        return {
            "visits": int(visits or 0),
            "checkIns": int(check_ins or 0),
            "checkOuts": int(check_outs or 0),
        }

    def get_visitor_trends(self, period: str = "weekly", branch_ids: list[str] | None = None) -> dict:
        now = now_ist()
        data = []
        if period == "daily":
            for i in range(6, -1, -1):
                start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1) - timedelta(seconds=1)
                point = self._count_visits_range(start, end, branch_ids)
                point["label"] = start.strftime("%a %d")
                data.append(point)
        elif period == "weekly":
            for i in range(3, -1, -1):
                end = now - timedelta(days=i * 7)
                start = (end - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
                point = self._count_visits_range(start, end, branch_ids)
                point["label"] = f"Week {4 - i}"
                data.append(point)
        elif period == "monthly":
            for i in range(5, -1, -1):
                month = now.month - i
                year = now.year
                while month <= 0:
                    month += 12
                    year -= 1
                start = datetime(year, month, 1)
                if month == 12:
                    end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                else:
                    end = datetime(year, month + 1, 1) - timedelta(seconds=1)
                point = self._count_visits_range(start, end, branch_ids)
                point["label"] = start.strftime("%b")
                data.append(point)
        else:
            for i in range(4, -1, -1):
                year = now.year - i
                start = datetime(year, 1, 1)
                end = datetime(year, 12, 31, 23, 59, 59)
                point = self._count_visits_range(start, end, branch_ids)
                point["label"] = str(year)
                data.append(point)
        return {"period": period, "data": data}

    def get_visit_status_distribution(self) -> list[dict]:
        rows = (
            self.db.query(Visit.status, func.count(Visit.id))
            .group_by(Visit.status)
            .all()
        )
        counts = {status: count for status, count in rows}
        return [{"status": s.value, "count": counts.get(s.value, 0)} for s in VisitStatus]

    def get_visit_category_distribution(self) -> list[dict]:
        rows = (
            self.db.query(Visit.visitCategory, func.count(Visit.id))
            .group_by(Visit.visitCategory)
            .all()
        )
        counts = {cat: count for cat, count in rows if cat}
        return [
            {"category": "Meeting", "count": counts.get("MEETING", 0)},
            {"category": "Delivery", "count": counts.get("DELIVERY", 0)},
        ]

    def get_user_role_distribution(self) -> list[dict]:
        rows = self.db.query(User.role, func.count(User.id)).group_by(User.role).all()
        counts = {role: count for role, count in rows}
        return [{"role": r.value, "count": counts.get(r.value, 0)} for r in Role]

    def get_all_chains_with_stats(self) -> list[dict]:
        today = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
        chains = self.db.query(HospitalChain).all()
        if not chains:
            return []

        chain_ids = [c.id for c in chains]
        branch_counts = dict(
            self.db.query(Branch.hospitalChainId, func.count(Branch.id))
            .filter(Branch.hospitalChainId.in_(chain_ids))
            .group_by(Branch.hospitalChainId)
            .all()
        )
        staff_counts = dict(
            self.db.query(User.hospitalChainId, func.count(User.id))
            .filter(User.hospitalChainId.in_(chain_ids), User.role == Role.STAFF.value)
            .group_by(User.hospitalChainId)
            .all()
        )
        visitor_counts = dict(
            self.db.query(Branch.hospitalChainId, func.count(Visitor.id))
            .join(Visitor, Visitor.branchId == Branch.id)
            .filter(Branch.hospitalChainId.in_(chain_ids))
            .group_by(Branch.hospitalChainId)
            .all()
        )
        active_visits = dict(
            self.db.query(Branch.hospitalChainId, func.count(Visit.id))
            .join(Visit, Visit.branchId == Branch.id)
            .filter(
                Branch.hospitalChainId.in_(chain_ids),
                Visit.status == VisitStatus.CHECKED_IN.value,
            )
            .group_by(Branch.hospitalChainId)
            .all()
        )
        today_visits = dict(
            self.db.query(Branch.hospitalChainId, func.count(Visit.id))
            .join(Visit, Visit.branchId == Branch.id)
            .filter(Branch.hospitalChainId.in_(chain_ids), Visit.createdAt >= today)
            .group_by(Branch.hospitalChainId)
            .all()
        )

        return [
            {
                "chainId": chain.id,
                "chainName": chain.name,
                "totalBranches": branch_counts.get(chain.id, 0),
                "totalStaff": staff_counts.get(chain.id, 0),
                "totalVisitors": visitor_counts.get(chain.id, 0),
                "activeVisits": active_visits.get(chain.id, 0),
                "todayVisits": today_visits.get(chain.id, 0),
            }
            for chain in chains
        ]

    def get_chain_stats(self, chain_id: str) -> dict:
        stats = self.get_all_chains_with_stats()
        for item in stats:
            if item["chainId"] == chain_id:
                return item
        raise ValueError("Chain not found")

    def get_branch_stats(self, branch_id: str) -> dict:
        return _analytics_cached(
            f"branch_stats:{branch_id}",
            lambda: self._compute_branch_stats(branch_id),
        )

    def _compute_branch_stats(self, branch_id: str) -> dict:
        today = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
        branch = self.db.get(Branch, branch_id)
        if not branch:
            raise ValueError("Branch not found")
        return {
            "branchId": branch_id,
            "branchName": branch.name,
            "totalStaff": self.db.query(User)
            .filter(User.branchId == branch_id, User.role == Role.STAFF.value)
            .count(),
            "totalVisitors": self.db.query(Visitor).filter(Visitor.branchId == branch_id).count(),
            "activeVisits": self.db.query(Visit)
            .filter(Visit.branchId == branch_id, Visit.status == VisitStatus.CHECKED_IN.value)
            .count(),
            "todayVisits": self.db.query(Visit)
            .filter(Visit.branchId == branch_id, Visit.createdAt >= today)
            .count(),
        }

    def get_all_branches_with_stats(self) -> list[dict]:
        return _analytics_cached(
            "all_branches_with_stats",
            self._compute_all_branches_with_stats,
        )

    def _compute_all_branches_with_stats(self) -> list[dict]:
        branches = self.db.query(Branch).all()
        if not branches:
            return []
        branch_ids = [b.id for b in branches]
        today = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)

        staff_counts = dict(
            self.db.query(User.branchId, func.count(User.id))
            .filter(User.branchId.in_(branch_ids), User.role == Role.STAFF.value)
            .group_by(User.branchId)
            .all()
        )
        visitor_counts = dict(
            self.db.query(Visitor.branchId, func.count(Visitor.id))
            .filter(Visitor.branchId.in_(branch_ids))
            .group_by(Visitor.branchId)
            .all()
        )
        active_visits = dict(
            self.db.query(Visit.branchId, func.count(Visit.id))
            .filter(
                Visit.branchId.in_(branch_ids),
                Visit.status == VisitStatus.CHECKED_IN.value,
            )
            .group_by(Visit.branchId)
            .all()
        )
        today_visits = dict(
            self.db.query(Visit.branchId, func.count(Visit.id))
            .filter(Visit.branchId.in_(branch_ids), Visit.createdAt >= today)
            .group_by(Visit.branchId)
            .all()
        )

        return [
            {
                "branchId": branch.id,
                "branchName": branch.name,
                "totalStaff": staff_counts.get(branch.id, 0),
                "totalVisitors": visitor_counts.get(branch.id, 0),
                "activeVisits": active_visits.get(branch.id, 0),
                "todayVisits": today_visits.get(branch.id, 0),
            }
            for branch in branches
        ]

    def get_chain_growth(self) -> dict:
        now = now_ist()
        data = []
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            start = datetime(year, month, 1)
            if month == 12:
                end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
            else:
                end = datetime(year, month + 1, 1) - timedelta(seconds=1)
            count = (
                self.db.query(HospitalChain)
                .filter(HospitalChain.createdAt >= start, HospitalChain.createdAt <= end)
                .count()
            )
            data.append({"label": start.strftime("%b"), "count": count})
        return {"period": "monthly", "data": data}

    def get_branch_growth(self) -> dict:
        now = now_ist()
        data = []
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            start = datetime(year, month, 1)
            if month == 12:
                end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
            else:
                end = datetime(year, month + 1, 1) - timedelta(seconds=1)
            count = (
                self.db.query(Branch)
                .filter(Branch.createdAt >= start, Branch.createdAt <= end)
                .count()
            )
            data.append({"label": start.strftime("%b"), "count": count})
        return {"period": "monthly", "data": data}

    def get_chain_visitor_trends(self, chain_id: str, period: str = "weekly") -> dict:
        branch_ids = [
            b.id
            for b in self.db.query(Branch).filter(Branch.hospitalChainId == chain_id).all()
        ]
        return self.get_visitor_trends(period, branch_ids or None)

    def get_chain_branches_with_stats(self, chain_id: str) -> list[dict]:
        branches = self.db.query(Branch).filter(Branch.hospitalChainId == chain_id).all()
        return [self.get_branch_stats(b.id) for b in branches]

    def get_branch_visitor_trends(self, branch_id: str, period: str = "hourly") -> dict:
        return _analytics_cached(
            f"branch_trends:{branch_id}:{period}",
            lambda: self.get_visitor_trends(period, [branch_id]),
        )

    def get_department_stats_for_branch(self, branch_id: str) -> list[dict]:
        return _analytics_cached(
            f"dept_stats:{branch_id}",
            lambda: self._compute_department_stats_for_branch(branch_id),
        )

    def _compute_department_stats_for_branch(self, branch_id: str) -> list[dict]:
        departments = (
            self.db.query(Department)
            .filter(Department.branchId == branch_id, Department.isActive == True)  # noqa: E712
            .order_by(Department.name)
            .all()
        )
        return [self.get_department_overview(dept.id) for dept in departments]

    def _today_bounds(self) -> tuple[datetime, datetime]:
        today_start = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start.replace(hour=23, minute=59, second=59)
        return today_start, today_end

    def _appointment_status_breakdown(self, base_query) -> dict[str, int]:
        rows = base_query.with_entities(Visit.status, func.count(Visit.id)).group_by(Visit.status).all()
        counts = {status: count for status, count in rows}
        return {
            status.value: counts.get(status.value, 0)
            for status in (
                VisitStatus.REQUEST_SENT,
                VisitStatus.APPROVED,
                VisitStatus.CHECKED_IN,
                VisitStatus.CHECKED_OUT,
                VisitStatus.REJECTED,
            )
        }

    def _duration_summary(self, base_query) -> dict:
        visits = base_query.filter(
            Visit.status == VisitStatus.CHECKED_OUT.value,
            Visit.totalDurationMinutes.isnot(None),
        ).all()
        if not visits:
            return {"avgMinutes": 0, "minMinutes": 0, "maxMinutes": 0, "count": 0}
        durations = [v.totalDurationMinutes for v in visits if v.totalDurationMinutes is not None]
        return {
            "avgMinutes": round(sum(durations) / len(durations), 1),
            "minMinutes": min(durations),
            "maxMinutes": max(durations),
            "count": len(durations),
        }

    def get_department_overview(self, department_id: str) -> dict:
        today_start, today_end = self._today_bounds()
        dept = self.db.get(Department, department_id)
        if not dept:
            raise ValueError("Department not found")
        sub_count = (
            self.db.query(SubDepartment)
            .filter(SubDepartment.departmentId == department_id, SubDepartment.isActive == True)  # noqa: E712
            .count()
        )
        staff_count = (
            self.db.query(User)
            .filter(User.departmentId == department_id, User.role == Role.STAFF.value, User.isActive == True)  # noqa: E712
            .count()
        )
        appt_q = self.db.query(Visit).filter(Visit.departmentId == department_id, Visit.appointmentDate.isnot(None))
        today_appt_q = appt_q.filter(
            Visit.appointmentDate >= today_start,
            Visit.appointmentDate <= today_end,
        )
        return {
            "departmentId": department_id,
            "departmentName": dept.name,
            "subDepartmentCount": sub_count,
            "staffCount": staff_count,
            "todayAppointments": today_appt_q.count(),
            "pendingAppointments": appt_q.filter(Visit.status == VisitStatus.REQUEST_SENT.value).count(),
            "activeVisits": appt_q.filter(Visit.status == VisitStatus.CHECKED_IN.value).count(),
            "completedAppointments": appt_q.filter(Visit.status == VisitStatus.CHECKED_OUT.value).count(),
            "statusBreakdown": self._appointment_status_breakdown(appt_q),
            "visitDuration": self._duration_summary(appt_q),
        }

    def get_sub_department_overview(self, sub_department_id: str) -> dict:
        today_start, today_end = self._today_bounds()
        sub = self.db.get(SubDepartment, sub_department_id)
        if not sub:
            raise ValueError("Sub-department not found")
        staff_count = (
            self.db.query(User)
            .filter(
                User.subDepartmentId == sub_department_id,
                User.role.in_(OPERATIONAL_STAFF_ROLES),
                User.isActive == True,  # noqa: E712
            )
            .count()
        )
        doctor_count = (
            self.db.query(User)
            .filter(
                User.subDepartmentId == sub_department_id,
                User.role == Role.STAFF.value,
                User.userType == "DOCTOR",
                User.isActive == True,  # noqa: E712
            )
            .count()
        )
        appt_q = self.db.query(Visit).filter(
            Visit.subDepartmentId == sub_department_id, Visit.appointmentDate.isnot(None)
        )
        today_appt_q = appt_q.filter(
            Visit.appointmentDate >= today_start,
            Visit.appointmentDate <= today_end,
        )
        return {
            "subDepartmentId": sub_department_id,
            "subDepartmentName": sub.name,
            "staffCount": staff_count,
            "doctorCount": doctor_count,
            "todayAppointments": today_appt_q.count(),
            "pendingAppointments": appt_q.filter(Visit.status == VisitStatus.REQUEST_SENT.value).count(),
            "activeVisits": appt_q.filter(Visit.status == VisitStatus.CHECKED_IN.value).count(),
            "completedAppointments": appt_q.filter(Visit.status == VisitStatus.CHECKED_OUT.value).count(),
            "statusBreakdown": self._appointment_status_breakdown(appt_q),
            "visitDuration": self._duration_summary(appt_q),
        }

    def get_department_visitor_trends(self, department_id: str, period: str = "weekly") -> dict:
        visit_ids = [
            v.id
            for v in self.db.query(Visit.id)
            .filter(Visit.departmentId == department_id, Visit.appointmentDate.isnot(None))
            .all()
        ]
        if not visit_ids:
            return {"period": period, "data": []}
        branch_ids = [
            b.id
            for b in self.db.query(Branch.id)
            .join(Visit, Visit.branchId == Branch.id)
            .filter(Visit.departmentId == department_id)
            .distinct()
            .all()
        ]
        trends = self.get_visitor_trends(period, branch_ids or None)
        return trends

    def get_sub_department_visitor_trends(self, sub_department_id: str, period: str = "weekly") -> dict:
        branch_ids = [
            b[0]
            for b in self.db.query(Visit.branchId)
            .filter(Visit.subDepartmentId == sub_department_id)
            .distinct()
            .all()
        ]
        return self.get_visitor_trends(period, branch_ids or None)

    def get_visit_duration_stats(self, req_user: dict) -> dict:
        q = self.db.query(Visit).filter(
            Visit.status == VisitStatus.CHECKED_OUT.value,
            Visit.totalDurationMinutes.isnot(None),
        )
        role = req_user["role"]
        if role == Role.DEPARTMENT_ADMIN.value:
            q = q.filter(Visit.departmentId == req_user.get("departmentId"))
        elif role == Role.SUB_DEPARTMENT_ADMIN.value:
            q = q.filter(Visit.subDepartmentId == req_user.get("subDepartmentId"))
        visits = q.all()
        if not visits:
            return {"avgMinutes": 0, "minMinutes": 0, "maxMinutes": 0, "count": 0}
        durations = [v.totalDurationMinutes for v in visits if v.totalDurationMinutes is not None]
        return {
            "avgMinutes": round(sum(durations) / len(durations), 1),
            "minMinutes": min(durations),
            "maxMinutes": max(durations),
            "count": len(durations),
        }
