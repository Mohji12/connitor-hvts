from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.analytics_service import AnalyticsService
from app.services.super_admin_dashboard_service import SuperAdminDashboardService

router = APIRouter(dependencies=[Depends(get_current_user)])


def _period(q: str | None = "weekly") -> str:
    return q or "weekly"


def _super_admin_dashboard(
    period: str = Query("weekly"),
    db: Session = Depends(get_db),
):
    """Single payload for Super Admin overview (1 HTTP round-trip, cached ~45s)."""
    return SuperAdminDashboardService(db).get_dashboard(period)


_super_admin_dashboard_deps = [Depends(require_roles(Role.SUPER_ADMIN.value))]
router.add_api_route(
    "/super-admin/dashboard",
    _super_admin_dashboard,
    methods=["GET"],
    dependencies=_super_admin_dashboard_deps,
    tags=["analytics"],
)
router.add_api_route(
    "/super-admin/dashboard/",
    _super_admin_dashboard,
    methods=["GET"],
    dependencies=_super_admin_dashboard_deps,
    include_in_schema=False,
    tags=["analytics"],
)


@router.get("/super-admin/overview", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_overview(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_system_overview()


@router.get("/super-admin/visitor-trends", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_trends(period: str = Query("weekly"), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_visitor_trends(period)


@router.get("/super-admin/visit-status-distribution", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_status_dist(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_visit_status_distribution()


@router.get("/super-admin/visit-category-distribution", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_category_dist(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_visit_category_distribution()


@router.get("/super-admin/user-role-distribution", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_role_dist(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_user_role_distribution()


@router.get("/super-admin/chains/stats", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_chains_stats(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_all_chains_with_stats()


@router.get("/super-admin/branches/stats", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_branches_stats(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_all_branches_with_stats()


@router.get("/super-admin/chain/{chain_id}/stats", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_chain_stats(chain_id: str, db: Session = Depends(get_db)):
    return AnalyticsService(db).get_chain_stats(chain_id)


@router.get("/super-admin/branch/{branch_id}/stats", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_branch_stats(branch_id: str, db: Session = Depends(get_db)):
    return AnalyticsService(db).get_branch_stats(branch_id)


@router.get("/super-admin/chains/growth", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_chain_growth(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_chain_growth()


@router.get("/super-admin/branches/growth", dependencies=[Depends(require_roles(Role.SUPER_ADMIN.value))])
def super_admin_branch_growth(db: Session = Depends(get_db)):
    return AnalyticsService(db).get_branch_growth()


@router.get("/chain-admin/overview", dependencies=[Depends(require_roles(Role.CHAIN_ADMIN.value))])
def chain_admin_overview(chainId: str = Query(...), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_chain_stats(chainId)


@router.get("/chain-admin/visitor-trends", dependencies=[Depends(require_roles(Role.CHAIN_ADMIN.value))])
def chain_admin_trends(chainId: str = Query(...), period: str = Query("weekly"), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_chain_visitor_trends(chainId, period)


@router.get("/chain-admin/branches/stats", dependencies=[Depends(require_roles(Role.CHAIN_ADMIN.value))])
def chain_admin_branches(chainId: str = Query(...), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_chain_branches_with_stats(chainId)


@router.get("/branch-admin/visitor-trends", dependencies=[Depends(require_roles(Role.BRANCH_ADMIN.value))])
def branch_admin_trends(branchId: str = Query(...), period: str = Query("hourly"), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_branch_visitor_trends(branchId, period)


@router.get(
    "/hospital-admin/overview",
    dependencies=[Depends(require_roles(Role.HOSPITAL_ADMIN.value))],
)
def hospital_admin_overview(
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    branch_id = user.get("branchId")
    if not branch_id:
        raise HTTPException(status_code=400, detail="Hospital admin must be assigned to a branch.")
    return AnalyticsService(db).get_branch_stats(branch_id)


@router.get(
    "/hospital-admin/visitor-trends",
    dependencies=[Depends(require_roles(Role.HOSPITAL_ADMIN.value))],
)
def hospital_admin_trends(
    user: Annotated[dict, Depends(get_current_user)],
    period: str = Query("weekly"),
    db: Session = Depends(get_db),
):
    branch_id = user.get("branchId")
    if not branch_id:
        raise HTTPException(status_code=400, detail="Hospital admin must be assigned to a branch.")
    return AnalyticsService(db).get_branch_visitor_trends(branch_id, period)


@router.get(
    "/hospital-admin/departments/stats",
    dependencies=[Depends(require_roles(Role.HOSPITAL_ADMIN.value))],
)
def hospital_admin_department_stats(
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    branch_id = user.get("branchId")
    if not branch_id:
        raise HTTPException(status_code=400, detail="Hospital admin must be assigned to a branch.")
    return AnalyticsService(db).get_department_stats_for_branch(branch_id)


@router.get("/security/visitor-trends", dependencies=[Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))])
def security_trends(branchId: str = Query(...), period: str = Query("hourly"), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_branch_visitor_trends(branchId, period)


@router.get("/staff/visitor-trends", dependencies=[Depends(require_roles(Role.STAFF.value))])
def staff_trends(branchId: str = Query(...), period: str = Query("hourly"), db: Session = Depends(get_db)):
    return AnalyticsService(db).get_branch_visitor_trends(branchId, period)


@router.get(
    "/department-admin/overview",
    dependencies=[Depends(require_roles(Role.DEPARTMENT_ADMIN.value))],
)
def department_admin_overview(
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    return AnalyticsService(db).get_department_overview(user["departmentId"])


@router.get(
    "/sub-department-admin/overview",
    dependencies=[Depends(require_roles(Role.SUB_DEPARTMENT_ADMIN.value))],
)
def sub_department_admin_overview(
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    return AnalyticsService(db).get_sub_department_overview(user["subDepartmentId"])


@router.get(
    "/department-admin/visitor-trends",
    dependencies=[Depends(require_roles(Role.DEPARTMENT_ADMIN.value))],
)
def department_admin_trends(
    user: Annotated[dict, Depends(get_current_user)],
    period: str = Query("weekly"),
    db: Session = Depends(get_db),
):
    return AnalyticsService(db).get_department_visitor_trends(user["departmentId"], period)


@router.get(
    "/sub-department-admin/visitor-trends",
    dependencies=[Depends(require_roles(Role.SUB_DEPARTMENT_ADMIN.value))],
)
def sub_department_admin_trends(
    user: Annotated[dict, Depends(get_current_user)],
    period: str = Query("weekly"),
    db: Session = Depends(get_db),
):
    return AnalyticsService(db).get_sub_department_visitor_trends(user["subDepartmentId"], period)


@router.get("/visit-duration")
def visit_duration_stats(
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    return AnalyticsService(db).get_visit_duration_stats(user)
