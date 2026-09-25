import base64
import hashlib
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from google.protobuf.json_format import MessageToJson
from livekit import api
from livekit.protocol import models
from livekit.protocol.webhook import WebhookEvent

from app.config import get_settings
from app.models.enums import AppointmentMode, VisitStatus
from app.services.livekit_webhook_service import (
    InvalidWebhookError,
    LiveKitWebhookService,
    WebhookNotConfiguredError,
    epoch_to_ist,
    verify_livekit_webhook,
)

LK_KEY = "APItestkey123"
LK_SECRET = "test-secret-that-is-long-enough-for-hs256-signing"

# 2030-01-01 10:00 IST
JOIN_EPOCH = 1893472200


def _settings(configured: bool = True):
    return get_settings().model_copy(
        update={
            "livekit_url": "wss://example.livekit.cloud" if configured else None,
            "livekit_api_key": LK_KEY if configured else None,
            "livekit_api_secret": LK_SECRET if configured else None,
        }
    )


def _event(kind: str, *, room: str = "visit-v-1", created_at: int = JOIN_EPOCH) -> WebhookEvent:
    return WebhookEvent(
        event=kind,
        room=models.Room(name=room, creation_time=created_at - 60),
        participant=models.ParticipantInfo(identity="visitor-vis-1"),
        created_at=created_at,
    )


def _signed(body: str, secret: str = LK_SECRET) -> str:
    digest = base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()
    return api.AccessToken(LK_KEY, secret).with_sha256(digest).to_jwt()


def _visit(status: str) -> MagicMock:
    visit = MagicMock()
    visit.id = "v-1"
    visit.status = status
    visit.appointmentMode = AppointmentMode.ONLINE.value
    visit.checkInTime = None
    return visit


class VerifyWebhookTests(unittest.TestCase):
    def setUp(self) -> None:
        patcher = patch("app.services.livekit_webhook_service.get_settings", return_value=_settings())
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_valid_signature_parses_event(self) -> None:
        body = MessageToJson(_event("participant_joined"))
        event = verify_livekit_webhook(body, _signed(body))
        self.assertEqual(event.event, "participant_joined")
        self.assertEqual(event.room.name, "visit-v-1")

    def test_bearer_prefix_accepted(self) -> None:
        body = MessageToJson(_event("room_finished"))
        event = verify_livekit_webhook(body, f"Bearer {_signed(body)}")
        self.assertEqual(event.event, "room_finished")

    def test_tampered_body_rejected(self) -> None:
        body = MessageToJson(_event("participant_joined"))
        with self.assertRaises(InvalidWebhookError):
            verify_livekit_webhook(body.replace("visit-v-1", "visit-v-2"), _signed(body))

    def test_wrong_secret_rejected(self) -> None:
        body = MessageToJson(_event("participant_joined"))
        with self.assertRaises(InvalidWebhookError):
            verify_livekit_webhook(body, _signed(body, secret="another-secret-that-is-long-enough-xx"))

    def test_missing_header_rejected(self) -> None:
        with self.assertRaises(InvalidWebhookError):
            verify_livekit_webhook("{}", None)

    def test_not_configured(self) -> None:
        with patch("app.services.livekit_webhook_service.get_settings", return_value=_settings(False)):
            with self.assertRaises(WebhookNotConfiguredError):
                verify_livekit_webhook("{}", "token")


class HandleEventTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = LiveKitWebhookService(self.db)

    def _returns(self, visit: MagicMock | None) -> None:
        self.db.query.return_value.options.return_value.filter.return_value.first.return_value = visit

    def test_epoch_to_ist(self) -> None:
        self.assertEqual(epoch_to_ist(JOIN_EPOCH), datetime(2030, 1, 1, 10, 0))
        self.assertIsNone(epoch_to_ist(0))

    def test_participant_joined_checks_in(self) -> None:
        visit = _visit(VisitStatus.APPROVED.value)
        self._returns(visit)
        result = self.service.handle_event(_event("participant_joined"))
        self.assertEqual(result["action"], "checked_in")
        self.assertEqual(visit.status, VisitStatus.CHECKED_IN.value)
        self.assertEqual(visit.checkInTime, datetime(2030, 1, 1, 10, 0))
        self.assertEqual(visit.checkedInLocation, "LIVEKIT_ONLINE")

    def test_second_participant_is_idempotent(self) -> None:
        visit = _visit(VisitStatus.CHECKED_IN.value)
        self._returns(visit)
        result = self.service.handle_event(_event("participant_joined"))
        self.assertEqual(result["action"], "already_checked_in")

    def test_room_finished_checks_out_with_duration(self) -> None:
        visit = _visit(VisitStatus.CHECKED_IN.value)
        visit.checkInTime = datetime(2030, 1, 1, 10, 0)
        self._returns(visit)
        result = self.service.handle_event(_event("room_finished", created_at=JOIN_EPOCH + 25 * 60))
        self.assertEqual(result["action"], "checked_out")
        self.assertEqual(visit.status, VisitStatus.CHECKED_OUT.value)
        self.assertEqual(visit.totalDurationMinutes, 25)
        self.assertEqual(visit.checkedOutLocation, "LIVEKIT_ONLINE")

    def test_room_finished_twice_is_idempotent(self) -> None:
        self._returns(_visit(VisitStatus.CHECKED_OUT.value))
        result = self.service.handle_event(_event("room_finished"))
        self.assertEqual(result["action"], "already_checked_out")

    def test_unknown_room_ignored(self) -> None:
        result = self.service.handle_event(_event("participant_joined", room="lobby"))
        self.assertFalse(result["handled"])
        self.db.commit.assert_not_called()

    def test_unrelated_event_ignored(self) -> None:
        result = self.service.handle_event(_event("track_published"))
        self.assertEqual(result, {"handled": False, "event": "track_published"})


class WebhookRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        from fastapi.testclient import TestClient

        import main
        from app.database import get_db

        self.db = MagicMock()
        main.app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(main.app.dependency_overrides.clear)
        patcher = patch("app.services.livekit_webhook_service.get_settings", return_value=_settings())
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(main.app)

    def test_invalid_signature_returns_401(self) -> None:
        response = self.client.post(
            "/api/webhooks/livekit",
            content="{}",
            headers={"Authorization": "bogus", "Content-Type": "application/webhook+json"},
        )
        self.assertEqual(response.status_code, 401)

    @patch("app.routers.livekit_webhooks.threading.Thread")
    @patch("app.routers.livekit_webhooks.LiveKitWebhookService")
    def test_valid_event_is_processed(self, mock_service_cls: MagicMock, mock_thread: MagicMock) -> None:
        mock_service_cls.return_value.handle_event.return_value = {
            "handled": True,
            "visitId": "v-1",
            "action": "checked_in",
        }
        body = MessageToJson(_event("participant_joined"))
        response = self.client.post(
            "/api/webhooks/livekit",
            content=body,
            headers={"Authorization": _signed(body), "Content-Type": "application/webhook+json"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"received": True, "handled": True, "visitId": "v-1", "action": "checked_in"}
        )
        mock_thread.assert_called_once()
        self.assertEqual(mock_thread.call_args.kwargs["args"], ("v-1", "checked_in"))


if __name__ == "__main__":
    unittest.main()
