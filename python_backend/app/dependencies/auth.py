from typing import Annotated, Callable

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.cache import cache_get_json, cache_set_json, is_miss
from app.cache_invalidation import USER_CACHE_TTL_SECONDS, user_cache_key
from app.config import get_settings, is_demo_mode_enabled
from app.constants.demo_users import resolve_demo_user
from app.database import get_db
from app.models import User

security = HTTPBearer(auto_error=False)
PUBLIC_ROUTES: set[tuple[str, str]] = set()


def public_route(func: Callable) -> Callable:
    PUBLIC_ROUTES.add((func.__module__, func.__name__))
    func.__public__ = True  # type: ignore[attr-defined]
    return func


def _decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
    x_demo_user_id: Annotated[str | None, Header()] = None,
) -> dict:
    settings = get_settings()

    if credentials is not None:
        payload = _decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        cache_key = user_cache_key(str(user_id))
        hit = cache_get_json(cache_key)
        if not is_miss(hit):
            return hit

        user = db.get(User, str(user_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        current = {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "role": user.role,
            "userType": user.userType,
            "department": user.department,
            "location": user.location,
            "hospitalChainId": user.hospitalChainId,
            "branchId": user.branchId,
            "departmentId": user.departmentId,
            "subDepartmentId": user.subDepartmentId,
            "distributorId": user.distributorId,
            "deliveryAgentId": user.deliveryAgentId,
            "isActive": user.isActive,
        }
        cache_set_json(cache_key, current, USER_CACHE_TTL_SECONDS)
        return current

    if is_demo_mode_enabled(settings):
        return resolve_demo_user(x_demo_user_id)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def require_roles(*roles: str):
    def dependency(user: Annotated[dict, Depends(get_current_user)]) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency


require_super_admin = require_roles("SUPER_ADMIN")
require_hospital_admin = require_roles("HOSPITAL_ADMIN")
require_department_admin = require_roles("DEPARTMENT_ADMIN")
require_sub_department_admin = require_roles("SUB_DEPARTMENT_ADMIN")
require_hospital_or_above = require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN")
require_hierarchy_admin = require_roles(
    "SUPER_ADMIN",
    "HOSPITAL_ADMIN",
    "DEPARTMENT_ADMIN",
    "SUB_DEPARTMENT_ADMIN",
)
require_user_manager = require_roles(
    "SUPER_ADMIN",
    "CHAIN_ADMIN",
    "BRANCH_ADMIN",
    "HOSPITAL_ADMIN",
    "DEPARTMENT_ADMIN",
    "SUB_DEPARTMENT_ADMIN",
)
