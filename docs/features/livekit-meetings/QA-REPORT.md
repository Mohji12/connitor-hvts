# LiveKit meetings — QA report (2026-09-25)

## Automated

| Suite | Result |
| :-- | :-- |
| pytest LiveKit and migrated Zoom tests (service, webhooks, approval, email, calendar, notifications, security, pass quota) | 70 passed |
| Full pytest | 4 failures, none caused by this change: async tests without `pytest-asyncio`, and the in-person pass fixture in the hierarchy demo |
| Playwright `livekit-call.spec.ts`, local (API :8002, Next :3000, LiveKit Cloud) | 2/2 passed |
| Playwright `livekit-call.spec.ts`, staging (Vercel + EC2 + LiveKit Cloud) | 2/2 passed |

The two-browser spec checks:

1. Both participants connect with the correct identities (`doctor-*` and `visitor-*`) in room `visit-{id}`.
2. The remote tile shows on each side, and remote video plays (`videoWidth > 0`).
3. Remote microphone is subscribed and unmuted, and an `<audio>` element is attached.
4. Microphone mute and unmute are reflected on the other side.
5. Camera off sets `data-lk-video-muted=true` on the remote tile; turning it back on restores it.
6. Screenshare publishes `screen_share`, the other side switches to focus layout, and stopping returns to the grid.
7. Switching the microphone device changes the active device and keeps publishing.
8. The webhook check-in sets CHECKED_IN with `LIVEKIT_ONLINE`.
9. Leaving removes the participant on the other side and shows the left screen; the patient can rejoin.
10. The webhook check-out sets CHECKED_OUT with a duration.
11. An invalid token, a missing token, and a too-early link (with countdown) each show the right screen.

On staging, the webhook steps post a LiveKit-signed payload from EC2 (`MEETING_WEBHOOK_MODE=simulate`). This exercises signature verification and the lifecycle on production. Once the dashboard webhook URL is set, run with `MEETING_WEBHOOK_MODE=real` to also verify LiveKit's own delivery.

### Commands

```powershell
# local (frontend/)
npx playwright test tests/e2e/specs/meetings --project=chromium

# staging (frontend/)
$env:PLAYWRIGHT_BASE_URL='https://coninter-main.vercel.app'
$env:MEETING_FIXTURE_CMD='ssh -i <key.pem> ubuntu@connitor.bengalurutechcommunity.com "cd /home/ubuntu/connitor/connitor/python_backend && conni/bin/python scripts/e2e_meeting_fixture.py"'
$env:MEETING_API_BASE='https://connitor.bengalurutechcommunity.com'
$env:MEETING_WEBHOOK_MODE='simulate'   # or 'real' once the dashboard webhook is set
npx playwright test tests/e2e/specs/meetings --project=chromium
```

## Issues found and fixed during QA

- The webhook sent notifications before responding. That exceeded the timeout, and the long notification transaction held a foreign-key lock that blocked check-out. Fix: the handler runs in a threadpool, notifications go out on a detached thread, and the notification row is committed before the slow sends.
- EC2 (411 MB RAM) killed gunicorn workers for missed heartbeats. The systemd unit now uses `-w 2 --timeout 120`; a backup is at `/etc/systemd/system/conni.service.bak.livekit`.
- FastAPI returned dict `detail` values as a Python repr. The global handler now merges dict details into the JSON body, so the 425 response includes `opensAt`.

## Manual cross-device checklist (pending)

| Scenario | Chrome desktop | Edge desktop | Android Chrome | iOS Safari |
| :-- | :-- | :-- | :-- | :-- |
| Pre-join preview + device pickers | ☐ | ☐ | ☐ | ☐ |
| Two-way video/audio | ☐ | ☐ | ☐ | ☐ |
| Screenshare | ☐ | ☐ | n/a (hidden) | n/a (hidden) |
| Permission denied → friendly message | ☐ | ☐ | ☐ | ☐ |
| Network drop → reconnect toast → recovers | ☐ | ☐ | ☐ | ☐ |
| Same link in two tabs (second replaces first) | ☐ | ☐ | ☐ | ☐ |
