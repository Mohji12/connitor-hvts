"""LiveKit Cloud — in-app video rooms for online appointments."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal
from urllib.parse import quote

from fastapi import HTTPException
from jose import JWTError, jwt
from livekit import api
from sqlalchemy.orm import Session, joinedload

from app.config import get_public_frontend_url, get_settings, is_livekit_configured
from app.models import Visit
from app.models.enums import AppointmentMode, VisitStatus
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

MEETING_PROVIDER = "LIVEKIT"
JOIN_TOKEN_TYPE = "meeting_join"
DEFAULT_CONSULT_MINUTES = 30
PARTICIPANT_TOKEN_TTL = timedelta(hours=2)
PUBLISH_SOURCES = ["camera", "microphone", "screen_share", "screen_share_audio"]
JOINABLE_STATUSES = {
    VisitStatus.APPROVED.value,
    VisitStatus.CHECKED_IN.value,
    VisitStatus.CHECKED_OUT.value,
}

MeetingRole = Literal["host", "guest"]


@dataclass(frozen=True)
class MeetingLinks:
    room_name: str
    host_url: str
    join_url: str


@dataclass(frozen=True)
class JoinWindow:
    opens_at: datetime
    closes_at: datetime


@dataclass(frozen=True)
class ParticipantAccess:
    server_url: str
    participant_token: str
    room_name: str
    role: MeetingRole
    identity: str
    display_name: str
    visit: Visit
    window: JoinWindow


def room_name_for_visit(visit_id: str) -> str:
    return f"visit-{visit_id}"


def visit_id_from_room_name(room_name: str) -> str | None:
    if not room_name.startswith("visit-"):
        return None
    return room_name.removeprefix("visit-") or None


def meeting_join_url(visit: Visit) -> str | None:
    """Visitor-facing link; legacy Zoom links remain valid for visits approved before LiveKit."""
    return visit.meetingJoinUrl or visit.zoomJoinUrl


def meeting_host_url(visit: Visit) -> str | None:
    return visit.meetingHostUrl or visit.zoomStartUrl or visit.zoomJoinUrl


class LiveKitService:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.settings = get_settings()

    # ------------------------------------------------------------------ links

    def join_window(self, visit: Visit) -> JoinWindow:
        if not visit.appointmentDate:
            raise HTTPException(status_code=400, detail="Online appointment has no scheduled time.")
        minutes = visit.allottedMinutes or DEFAULT_CONSULT_MINUTES
        return JoinWindow(
            opens_at=visit.appointmentDate - timedelta(minutes=self.settings.meeting_join_early_minutes),
            closes_at=visit.appointmentDate
            + timedelta(minutes=minutes + self.settings.meeting_join_grace_minutes),
        )

    def create_join_token(self, visit: Visit, role: MeetingRole) -> str:
        window = self.join_window(visit)
        # jose checks `exp` against real epoch time; the join window itself is enforced
        # against naive IST datetimes in mint_participant_token.
        seconds_until_close = max(0, int((window.closes_at - now_ist()).total_seconds()))
        payload = {
            "typ": JOIN_TOKEN_TYPE,
            "vid": visit.id,
            "role": role,
            "exp": int(time.time()) + seconds_until_close + int(timedelta(days=1).total_seconds()),
        }
        return jwt.encode(payload, self.settings.jwt_secret, algorithm="HS256")

    def build_join_links(self, visit: Visit) -> MeetingLinks:
        base = get_public_frontend_url(self.settings)
        host = quote(self.create_join_token(visit, "host"), safe="")
        guest = quote(self.create_join_token(visit, "guest"), safe="")
        return MeetingLinks(
            room_name=room_name_for_visit(visit.id),
            host_url=f"{base}/meet/?t={host}",
            join_url=f"{base}/meet/?t={guest}",
        )

    def assign_meeting(self, visit: Visit) -> MeetingLinks:
        """Attach a LiveKit room + signed host/guest links to an approved online visit."""
        links = self.build_join_links(visit)
        visit.meetingProvider = MEETING_PROVIDER
        visit.meetingRoomName = links.room_name
        visit.meetingHostUrl = links.host_url
        visit.meetingJoinUrl = links.join_url
        return links

    # ----------------------------------------------------------------- tokens

    def _decode_join_token(self, join_token: str) -> tuple[str, MeetingRole]:
        try:
            payload = jwt.decode(join_token, self.settings.jwt_secret, algorithms=["HS256"])
        except JWTError as exc:
            raise HTTPException(status_code=403, detail="This meeting link is invalid or has expired.") from exc
        if payload.get("typ") != JOIN_TOKEN_TYPE or payload.get("role") not in ("host", "guest"):
            raise HTTPException(status_code=403, detail="This meeting link is invalid.")
        visit_id = str(payload.get("vid") or "")
        if not visit_id:
            raise HTTPException(status_code=403, detail="This meeting link is invalid.")
        return visit_id, payload["role"]

    def _load_visit(self, visit_id: str) -> Visit:
        if self.db is None:
            raise RuntimeError("LiveKitService requires a DB session to mint participant tokens.")
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff), joinedload(Visit.branch))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or visit.appointmentMode != AppointmentMode.ONLINE.value:
            raise HTTPException(status_code=404, detail="Online appointment not found.")
        return visit

    def _participant_identity(self, visit: Visit, role: MeetingRole) -> tuple[str, str]:
        if role == "host":
            name = visit.staff.name if visit.staff else (visit.staffName or "Doctor")
            return f"doctor-{visit.staffId or visit.id}", f"Dr. {name}".replace("Dr. Dr.", "Dr.")
        visitor = visit.visitor
        name = f"{visitor.firstName} {visitor.lastName}".strip() if visitor else "Visitor"
        return f"visitor-{visit.visitorId}", name or "Visitor"

    def mint_participant_token(self, join_token: str, *, at: datetime | None = None) -> ParticipantAccess:
        visit_id, role = self._decode_join_token(join_token)
        visit = self._load_visit(visit_id)

        if visit.status not in JOINABLE_STATUSES:
            raise HTTPException(
                status_code=403,
                detail="This consultation is not approved for joining.",
            )

        window = self.join_window(visit)
        current = at or now_ist()
        if current < window.opens_at:
            raise HTTPException(
                status_code=425,
                detail={
                    "message": "This consultation room is not open yet.",
                    "opensAt": window.opens_at.isoformat(),
                    "closesAt": window.closes_at.isoformat(),
                },
            )
        if current > window.closes_at:
            raise HTTPException(status_code=403, detail="This consultation has ended. The link has expired.")

        if not is_livekit_configured(self.settings):
            raise HTTPException(
                status_code=503,
                detail="Video consultations are not configured on this server (LIVEKIT_* missing).",
            )

        identity, display_name = self._participant_identity(visit, role)
        room_name = visit.meetingRoomName or room_name_for_visit(visit.id)
        grants = api.VideoGrants(
            room_join=True,
            room=room_name,
            room_admin=role == "host",
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_publish_sources=list(PUBLISH_SOURCES),
        )
        token = (
            api.AccessToken(self.settings.livekit_api_key, self.settings.livekit_api_secret)
            .with_identity(identity)
            .with_name(display_name)
            .with_metadata(json.dumps({"role": role, "visitId": visit.id}))
            .with_ttl(PARTICIPANT_TOKEN_TTL)
            .with_grants(grants)
            .to_jwt()
        )
        return ParticipantAccess(
            server_url=str(self.settings.livekit_url),
            participant_token=token,
            room_name=room_name,
            role=role,
            identity=identity,
            display_name=display_name,
            visit=visit,
            window=window,
        )
