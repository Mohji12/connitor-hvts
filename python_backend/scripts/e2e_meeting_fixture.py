"""
Test fixture for the LiveKit consultation e2e spec (frontend/tests/e2e/specs/meetings).

Subcommands (all print one JSON object on stdout):
  create   [--offset-minutes N]    APPROVED online visit starting now+N min, with host/guest links
  status   --visit ID              current status / check-in / check-out of the visit
  webhook  --visit ID --event E    POST a LiveKit-signed webhook (participant_joined | room_finished)
                                   to --api (default http://127.0.0.1:8002) — for local runs where
                                   LiveKit Cloud cannot reach the API
  cleanup                          delete visits created by this script

Usage (from python_backend/):
  python scripts/e2e_meeting_fixture.py create
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import sys
import time
import urllib.request
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from livekit import api  # noqa: E402
from livekit.protocol import models  # noqa: E402
from livekit.protocol.webhook import WebhookEvent  # noqa: E402
from google.protobuf.json_format import MessageToJson  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Notification, User, Visit, Visitor  # noqa: E402
from app.models.enums import AppointmentMode, Role, VisitStatus  # noqa: E402
from app.services.livekit_service import LiveKitService, room_name_for_visit  # noqa: E402
from app.utils.timezone import now_ist  # noqa: E402

FIXTURE_PURPOSE = "E2E LiveKit consultation test"
FIXTURE_PHONE = "9000000999"


def _out(payload: dict) -> None:
    print(json.dumps(payload, default=str))


def create(offset_minutes: int) -> None:
    db = SessionLocal()
    try:
        doctor = (
            db.query(User)
            .filter(User.role == Role.STAFF.value, User.branchId.isnot(None))
            .order_by(User.createdAt)
            .first()
        )
        if not doctor:
            raise SystemExit("No STAFF user with a branch found — seed the database first.")
        visitor = (
            db.query(Visitor)
            .filter(Visitor.phone == FIXTURE_PHONE, Visitor.branchId == doctor.branchId)
            .first()
        )
        if not visitor:
            visitor = Visitor(
                firstName="E2E",
                lastName="Patient",
                phone=FIXTURE_PHONE,
                branchId=doctor.branchId,
            )
            db.add(visitor)
            db.flush()

        start = now_ist().replace(second=0, microsecond=0) + timedelta(minutes=offset_minutes)
        visit = Visit(
            visitCategory="APPOINTMENT",
            purpose=FIXTURE_PURPOSE,
            status=VisitStatus.APPROVED.value,
            appointmentMode=AppointmentMode.ONLINE.value,
            appointmentDate=start,
            visitorId=visitor.id,
            staffId=doctor.id,
            staffName=doctor.name,
            branchId=doctor.branchId,
            departmentId=doctor.departmentId,
            isCodeUsed=False,
        )
        db.add(visit)
        db.flush()
        links = LiveKitService(db).assign_meeting(visit)
        db.commit()
        _out(
            {
                "visitId": visit.id,
                "roomName": links.room_name,
                "hostUrl": links.host_url,
                "joinUrl": links.join_url,
                "appointmentDate": start.isoformat(),
                "doctorName": doctor.name,
            }
        )
    finally:
        db.close()


def status(visit_id: str) -> None:
    db = SessionLocal()
    try:
        visit = db.get(Visit, visit_id)
        if not visit:
            raise SystemExit(f"Visit {visit_id} not found")
        _out(
            {
                "visitId": visit.id,
                "status": visit.status,
                "checkInTime": visit.checkInTime,
                "checkOutTime": visit.checkOutTime,
                "checkedInLocation": visit.checkedInLocation,
                "totalDurationMinutes": visit.totalDurationMinutes,
            }
        )
    finally:
        db.close()


def webhook(visit_id: str, event: str, api_base: str) -> None:
    settings = get_settings()
    now = int(time.time())
    payload = WebhookEvent(
        event=event,
        room=models.Room(name=room_name_for_visit(visit_id), creation_time=now - 60),
        participant=models.ParticipantInfo(identity="e2e-fixture"),
        created_at=now,
        id=f"EV_e2e_{now}",
    )
    body = MessageToJson(payload)
    digest = base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()
    token = (
        api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_sha256(digest)
        .to_jwt()
    )
    request = urllib.request.Request(
        f"{api_base.rstrip('/')}/api/webhooks/livekit",
        data=body.encode(),
        headers={"Authorization": token, "Content-Type": "application/webhook+json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        _out(json.loads(response.read().decode()))


def cleanup() -> None:
    db = SessionLocal()
    try:
        visit_ids = [
            row.id
            for row in db.query(Visit.id).filter(
                Visit.purpose == FIXTURE_PURPOSE, Visit.appointmentMode == AppointmentMode.ONLINE.value
            )
        ]
        deleted = 0
        if visit_ids:
            db.query(Notification).filter(Notification.visitId.in_(visit_ids)).delete(synchronize_session=False)
            deleted = db.query(Visit).filter(Visit.id.in_(visit_ids)).delete(synchronize_session=False)
        db.commit()
        _out({"deleted": deleted})
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p_create = sub.add_parser("create")
    p_create.add_argument("--offset-minutes", type=int, default=0)
    p_status = sub.add_parser("status")
    p_status.add_argument("--visit", required=True)
    p_webhook = sub.add_parser("webhook")
    p_webhook.add_argument("--visit", required=True)
    p_webhook.add_argument("--event", required=True, choices=["participant_joined", "room_finished"])
    p_webhook.add_argument("--api", default="http://127.0.0.1:8002")
    sub.add_parser("cleanup")
    args = parser.parse_args()

    if args.command == "create":
        create(args.offset_minutes)
    elif args.command == "status":
        status(args.visit)
    elif args.command == "webhook":
        webhook(args.visit, args.event, args.api)
    else:
        cleanup()


if __name__ == "__main__":
    main()
