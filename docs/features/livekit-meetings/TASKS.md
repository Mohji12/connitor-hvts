# LiveKit meetings — tasks

| # | Task | Status |
| :-- | :-- | :-- |
| 1 | `LIVEKIT_*` config, `.env.example`, local and EC2 `.env` | ✅ |
| 2 | `livekit-api` dependency + `livekit_service` (links, window, grants) | ✅ |
| 3 | Token endpoint, webhook endpoint, `migrate_livekit_meetings.py` | ✅ |
| 4 | Swap Zoom in approval; email/SMS/calendar copy; delete Zoom service/webhook/router/tests | ✅ |
| 5 | `/meet` page + `MeetingRoom` (pre-join, grid/focus, ControlBar, screenshare, states, e2e hook) | ✅ |
| 6 | Callers: status page, My Visitors, security tab, booking copy, schema/services | ✅ |
| 7 | pytest: `test_livekit_service.py`, `test_livekit_webhooks.py`, Zoom tests migrated | ✅ |
| 8 | Playwright two-browser call `tests/e2e/specs/meetings/livekit-call.spec.ts` | ✅ local + staging |
| 9 | Deploy (migration in `EC2_MIGRATE_SCRIPTS`), staging e2e | ✅ |
| 10 | Set webhook URL in the LiveKit Cloud dashboard | ⏳ user action |
| 11 | Rotate the LiveKit API secret (it was shared in chat) | ⏳ user action |
| 12 | Manual device checklist (see QA-REPORT) | ⏳ user action |
