"""Clear Redis entries after commits that change cached rows.

Only ORM unit-of-work changes are seen; bulk ``query.update()`` / raw SQL rely on cache TTLs.
"""

from itertools import chain

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.cache import bump_namespace, cache_delete, make_key
from app.models import Branch, Department, HospitalChain, SubDepartment, User

REFERENCE_NAMESPACE = "ref"
REFERENCE_CACHE_TTL_SECONDS = 600
DOCTOR_CACHE_TTL_SECONDS = 300
USER_CACHE_TTL_SECONDS = 120
ANALYTICS_CACHE_TTL_SECONDS = 60

_REFERENCE_MODELS = (HospitalChain, Branch, Department, SubDepartment)
_USER_FIELDS_NOT_CACHED = {"otp", "otpExpires", "passwordHash", "phoneVerified", "updatedAt"}
_PENDING_KEY = "cache_invalidation"


def user_cache_key(user_id: str) -> str:
    return make_key("user", user_id)


def _user_change_is_cached(user: User) -> bool:
    state = inspect(user)
    return any(
        attr.history.has_changes()
        for attr in state.attrs
        if attr.key not in _USER_FIELDS_NOT_CACHED
    )


@event.listens_for(Session, "after_flush")
def _collect_changes(session: Session, _flush_context) -> None:
    pending = session.info.setdefault(_PENDING_KEY, {"users": set(), "reference": False})
    for obj in chain(session.new, session.dirty, session.deleted):
        if isinstance(obj, User):
            is_update = obj in session.dirty and obj not in session.deleted
            if is_update and not _user_change_is_cached(obj):
                continue
            if obj.id:
                pending["users"].add(obj.id)
            pending["reference"] = True
        elif isinstance(obj, _REFERENCE_MODELS):
            pending["reference"] = True


@event.listens_for(Session, "after_commit")
def _apply_invalidation(session: Session) -> None:
    pending = session.info.pop(_PENDING_KEY, None)
    if not pending:
        return
    if pending["users"]:
        cache_delete(*(user_cache_key(uid) for uid in pending["users"]))
    if pending["reference"]:
        bump_namespace(REFERENCE_NAMESPACE)


@event.listens_for(Session, "after_rollback")
def _discard_pending(session: Session) -> None:
    session.info.pop(_PENDING_KEY, None)
