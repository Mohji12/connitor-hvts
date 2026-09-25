import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock
from urllib.parse import parse_qs, unquote, urlparse

from fastapi import HTTPException
from jose import jwt
from livekit import api

from app.config import get_settings
from app.models.enums import AppointmentMode, VisitStatus
from app.services.livekit_service import (
    LiveKitService,
    meeting_host_url,
    meeting_join_url,
    room_name_for_visit,
    visit_id_from_room_name,
)

LK_KEY = "APItestkey123"
LK_SECRET = "test-secret-that-is-long-enough-for-hs256-signing"


def _visit(appointment: datetime, *, status: str = VisitStatus.APPROVED.value) -> MagicMock:
    visit = MagicMock()
    visit.id = "v-123"
    visit.staffId = "doc-1"
    visit.visitorId = "vis-9"
    visit.status = status
    visit.appointmentMode = AppointmentMode.ONLINE.value
    visit.appointmentDate = appointment
    visit.allottedMinutes = 20
    visit.meetingRoomName = "visit-v-123"
    visit.staff.name = "Arjun Desai"
    visit.visitor.firstName = "Rahul"
    visit.visitor.lastName = "Mehta"
    return visit


def _service(visit: MagicMock | None = None, *, configured: bool = True) -> LiveKitService:
    db = MagicMock()
    if visit is not None:
        db.query.return_value.options.return_value.filter.return_value.first.return_value = visit
    service = LiveKitService(db)
    service.settings = get_settings().model_copy(
        update={
            "livekit_url": "wss://example.livekit.cloud" if configured else None,
            "livekit_api_key": LK_KEY if configured else None,
            "livekit_api_secret": LK_SECRET if configured else None,
            "meeting_join_early_minutes": 15,
            "meeting_join_grace_minutes": 60,
            "public_frontend_url": "https://app.example.com",
        }
    )
    return service


def _token_from_url(url: str) -> str:
    return unquote(parse_qs(urlparse(url).query)["t"][0])


class RoomNameTests(unittest.TestCase):
    def test_round_trip(self) -> None:
        self.assertEqual(room_name_for_visit("abc"), "visit-abc")
        self.assertEqual(visit_id_from_room_name("visit-abc"), "abc")
        self.assertIsNone(visit_id_from_room_name("other-room"))
        self.assertIsNone(visit_id_from_room_name("visit-"))

    def test_link_helpers_fall_back_to_legacy_zoom(self) -> None:
        visit = MagicMock()
        visit.meetingJoinUrl = None
        visit.meetingHostUrl = None
        visit.zoomJoinUrl = "https://zoom.us/j/1"
        visit.zoomStartUrl = "https://zoom.us/s/1"
        self.assertEqual(meeting_join_url(visit), "https://zoom.us/j/1")
        self.assertEqual(meeting_host_url(visit), "https://zoom.us/s/1")
        visit.meetingJoinUrl = "https://app/meet/?t=g"
        visit.meetingHostUrl = "https://app/meet/?t=h"
        self.assertEqual(meeting_join_url(visit), "https://app/meet/?t=g")
        self.assertEqual(meeting_host_url(visit), "https://app/meet/?t=h")


class JoinLinkTests(unittest.TestCase):
    def test_assign_meeting_sets_fields_and_signed_links(self) -> None:
        visit = _visit(datetime(2030, 1, 1, 10, 0))
        service = _service()
        links = service.assign_meeting(visit)

        self.assertEqual(visit.meetingProvider, "LIVEKIT")
        self.assertEqual(visit.meetingRoomName, "visit-v-123")
        self.assertTrue(links.join_url.startswith("https://app.example.com/meet/?t="))
        guest = jwt.decode(_token_from_url(links.join_url), service.settings.jwt_secret, algorithms=["HS256"])
        host = jwt.decode(_token_from_url(links.host_url), service.settings.jwt_secret, algorithms=["HS256"])
        self.assertEqual(guest["role"], "guest")
        self.assertEqual(host["role"], "host")
        self.assertEqual(guest["vid"], "v-123")
        self.assertEqual(guest["typ"], "meeting_join")

    def test_join_window_uses_allotted_minutes_and_grace(self) -> None:
        visit = _visit(datetime(2030, 1, 1, 10, 0))
        window = _service().join_window(visit)
        self.assertEqual(window.opens_at, datetime(2030, 1, 1, 9, 45))
        self.assertEqual(window.closes_at, datetime(2030, 1, 1, 11, 20))


class MintParticipantTokenTests(unittest.TestCase):
    def setUp(self) -> None:
        self.appt = datetime(2030, 1, 1, 10, 0)

    def _join_token(self, visit: MagicMock, role: str = "guest") -> str:
        return _service().create_join_token(visit, role)  # type: ignore[arg-type]

    def test_guest_token_grants(self) -> None:
        visit = _visit(self.appt)
        access = _service(visit).mint_participant_token(self._join_token(visit), at=self.appt)

        self.assertEqual(access.role, "guest")
        self.assertEqual(access.identity, "visitor-vis-9")
        self.assertEqual(access.display_name, "Rahul Mehta")
        self.assertEqual(access.server_url, "wss://example.livekit.cloud")
        claims = api.TokenVerifier(LK_KEY, LK_SECRET).verify(access.participant_token)
        self.assertEqual(claims.identity, "visitor-vis-9")
        self.assertEqual(claims.video.room, "visit-v-123")
        self.assertTrue(claims.video.room_join)
        self.assertFalse(claims.video.room_admin)
        self.assertIn("screen_share", claims.video.can_publish_sources)
        self.assertIn("microphone", claims.video.can_publish_sources)
        self.assertEqual(json.loads(claims.metadata), {"role": "guest", "visitId": "v-123"})

    def test_host_token_is_room_admin(self) -> None:
        visit = _visit(self.appt)
        access = _service(visit).mint_participant_token(self._join_token(visit, "host"), at=self.appt)
        self.assertEqual(access.identity, "doctor-doc-1")
        self.assertEqual(access.display_name, "Dr. Arjun Desai")
        claims = api.TokenVerifier(LK_KEY, LK_SECRET).verify(access.participant_token)
        self.assertTrue(claims.video.room_admin)

    def test_too_early_returns_425_with_open_time(self) -> None:
        visit = _visit(self.appt)
        with self.assertRaises(HTTPException) as ctx:
            _service(visit).mint_participant_token(self._join_token(visit), at=self.appt - timedelta(minutes=16))
        self.assertEqual(ctx.exception.status_code, 425)
        self.assertEqual(ctx.exception.detail["opensAt"], "2030-01-01T09:45:00")

    def test_early_join_within_window_allowed(self) -> None:
        visit = _visit(self.appt)
        access = _service(visit).mint_participant_token(
            self._join_token(visit), at=self.appt - timedelta(minutes=14)
        )
        self.assertEqual(access.role, "guest")

    def test_after_window_is_expired(self) -> None:
        visit = _visit(self.appt)
        with self.assertRaises(HTTPException) as ctx:
            _service(visit).mint_participant_token(self._join_token(visit), at=self.appt + timedelta(hours=2))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_rejected_visit_cannot_join(self) -> None:
        visit = _visit(self.appt, status=VisitStatus.REJECTED.value)
        with self.assertRaises(HTTPException) as ctx:
            _service(visit).mint_participant_token(self._join_token(visit), at=self.appt)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_tampered_token_rejected(self) -> None:
        visit = _visit(self.appt)
        with self.assertRaises(HTTPException) as ctx:
            _service(visit).mint_participant_token(self._join_token(visit) + "x", at=self.appt)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_foreign_token_type_rejected(self) -> None:
        visit = _visit(self.appt)
        service = _service(visit)
        forged = jwt.encode({"sub": "user-1", "vid": "v-123", "role": "host"}, service.settings.jwt_secret)
        with self.assertRaises(HTTPException) as ctx:
            service.mint_participant_token(forged, at=self.appt)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_in_person_visit_not_found(self) -> None:
        visit = _visit(self.appt)
        visit.appointmentMode = AppointmentMode.IN_PERSON.value
        with self.assertRaises(HTTPException) as ctx:
            _service(visit).mint_participant_token(self._join_token(visit), at=self.appt)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_not_configured_returns_503(self) -> None:
        visit = _visit(self.appt)
        with self.assertRaises(HTTPException) as ctx:
            _service(visit, configured=False).mint_participant_token(self._join_token(visit), at=self.appt)
        self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
