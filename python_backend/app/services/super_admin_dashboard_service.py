import time

from sqlalchemy.orm import Session, joinedload

from app.cache import _store
from app.models import Branch, User
from app.models.enums import Role
from app.services.analytics_service import AnalyticsService
from app.services.hospital_chains_service import HospitalChainsService
from app.utils.serializers import model_to_dict


class SuperAdminDashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_dashboard(self, trend_period: str = "weekly") -> dict:
        cache_key = f"super_admin_dashboard:{trend_period}"
        now = time.monotonic()
        hit = _store.get(cache_key)
        if hit and now - hit[0] < 45:
            return hit[1]

        analytics = AnalyticsService(self.db)
        chains = HospitalChainsService(self.db).find_all_light()
        branches = self._all_branches()
        staff = self._staff_users()

        overview = analytics.get_system_overview()
        payload = {
            "chains": chains,
            "branches": branches,
            "staff": staff,
            "overview": overview,
            "visitorTrends": analytics.get_visitor_trends(trend_period),
            "visitStatusDistribution": analytics.get_visit_status_distribution(),
            "visitCategoryDistribution": analytics.get_visit_category_distribution(),
            "userRoleDistribution": analytics.get_user_role_distribution(),
            "chainStats": analytics.get_all_chains_with_stats(),
        }
        _store[cache_key] = (now, payload)
        return payload

    def _all_branches(self) -> list[dict]:
        branches = self.db.query(Branch).options(joinedload(Branch.hospitalChain)).all()
        result = []
        for branch in branches:
            item = model_to_dict(branch)
            item["hospitalChain"] = (
                {"id": branch.hospitalChain.id, "name": branch.hospitalChain.name}
                if branch.hospitalChain
                else None
            )
            result.append(item)
        return result

    def _staff_users(self) -> list[dict]:
        users = self.db.query(User).filter(User.role == Role.STAFF.value).all()
        return [model_to_dict(u) for u in users]
