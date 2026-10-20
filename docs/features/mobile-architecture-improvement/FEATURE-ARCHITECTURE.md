# Feature architecture — hybrid Capacitor + offline gate

## Target

Keep Capacitor as the production mobile shell, Next.js as the shared UI, and FastAPI as the authorization authority. Add a **separate** offline gate path later: signed, short-lived, gate-scoped manifests in an encrypted local database. Do not rebuild product dashboards in React Native.

```text
Conninter Capacitor App
  Splash · App lifecycle · Secure storage · Native camera · Push (later)

Online mode
  Live Next.js UI · API requests · bookings · real-time authorization

Offline gate mode (Phase 04+)
  Signed authorization data · encrypted SQLite · scanner · audit queue
          │
          ▼
Next.js 15  frontend/
  Shared UI · role navigation · API client · offline status UI
          │
FastAPI  python_backend/
  Authorization · signed manifests · pass validation · idempotent sync
          │
MySQL
  Pass records · revocations · gate events · device registrations
```

Two operating paths:

1. **Online** — the current WebView of `www.conninter.com` (this is what Phase 02 hardens).
2. **Offline gate verification** — a dedicated native workflow that verifies previously downloaded signed data and queues scans. A page hosted only at `www.conninter.com` cannot be the sole entry point when the site is unreachable. Phase 04 must add a locally bundled gate screen.

A cached QR image is **not** proof that a visitor or delivery is authorized.

## Existing modules (do not duplicate)

| Concern | Current file |
| --- | --- |
| Native detection | `frontend/src/lib/platform.ts` |
| Session resume | `frontend/src/lib/native-session.ts` |
| Staff JWT | `frontend/src/lib/auth-storage.ts` |
| Visitor JWT | `frontend/src/lib/visitor-auth-storage.ts` |
| Axios client | `frontend/src/lib/api.ts` |
| API errors | `frontend/src/lib/api-errors.ts` |
| Mobile chrome | `frontend/src/components/mobile/` |
| Capacitor config | `mobile/capacitor.config.ts` |

Proposed later (not in Phase 01–02): `mobile/src/` typed bridge, `frontend/src/lib/mobile/` adapters (network/lifecycle start in Phase 02), `python_backend` `gate_offline` router/services.

## Online vs offline authorization

Distinguish three checks:

- **QR authenticity** — issued by Conninter? (HMAC today; signed token later)
- **Offline eligibility** — does the cached manifest permit this gate and window?
- **Global redemption** — already used or revoked elsewhere? Cannot be guaranteed across disconnected devices.

Policy: **online-first**. Offline verification only for a short configurable window, on registered gate devices, with a visible offline status. Hospital access should not silently treat offline scans as equivalent to server-confirmed acceptance.

Recommended operational models (Phase 04+):

1. Online-first (default).
2. Single-authority offline gate for designed deployments.
3. Multiple independent offline gates — residual conflict risk, then reconcile.

## Proposed native contracts (Phase 04)

```ts
interface GateScanner {
  startScan(): Promise<{ rawValue: string }>;
  stopScan(): Promise<void>;
}

interface GateSync {
  getStatus(): Promise<{
    online: boolean;
    pendingEvents: number;
    lastSuccessfulSync: string | null;
  }>;
  syncPendingEvents(): Promise<void>;
}
```

These are contracts, not current APIs. Implement with Capacitor 7-compatible plugins or a small custom plugin. Do not store API secrets, JWTs, or private signing keys in `mobile/www/`.

## Proposed local SQLite (Phase 04)

| Table | Purpose |
| --- | --- |
| `gate_manifest` | Active signed snapshot (id, version, gate, expiry, signature) |
| `offline_pass` | Cached eligibility (pass id, type, window, status, manifest version) |
| `revocation` | Cached revocations |
| `gate_event` | Durable scan audit queue (unique `event_id`) |
| `device_state` | Last sync, active manifest, last server time |

Encrypt the DB; protect the key with the platform keystore; exclude from backups. Unique event IDs; atomic accept + local redemption.

## QR migration (Phase 03+, backward compatible)

Today: visitor unsigned JSON `{t,v,j}`; delivery/attendant HMAC-SHA256 of payload with `jwt_secret`, scanned as `{qrPayload, signature}`.

Later preference: compact signed token (issuer, `jti`, gate scope, pass type, nbf/exp, kid). Server holds private keys; the app gets allowlisted public keys only. Do not embed names or phones in the QR. A valid signature does not prevent copy or replay.

## Proposed MySQL + API (Phase 03 / 05)

Tables (logical; join to existing pass/visit/delivery rows, do not duplicate them):

- `gate_devices`
- `gate_manifest_versions`
- `gate_scan_events`
- `gate_pass_redemptions`

Endpoints:

- `GET /api/gate/offline/manifest`
- `POST /api/gate/offline/sync`
- `POST /api/gate/verify`
- `POST /api/gate/devices/register` (admin enrollment only)

Sync: client-generated event IDs; per-event accepted / duplicate / rejected / conflict. Record server receipt time separately from device `occurred_at`. Migrations via `python_backend/scripts/migrate_*.py`.

## Security (OWASP MASVS)

| Risk | Mitigation |
| --- | --- |
| JWT theft | Secure storage (later), short-lived tokens, 401 session clear (Phase 02) |
| Forged QR | HMAC today; signed tokens + allowlisted algs later |
| Replayed QR | Local dedupe + server redemption |
| Revoked pass used offline | Short manifest TTL, revocation snapshot, online-first |
| Compromised gate phone | Device enrollment and revocation |
| Tampered manifest | Verify signature before import |
| Duplicate sync | Unique event IDs, idempotent processing |
| Wrong device clock | Trusted sync time, bounded drift |
| WebView navigation abuse | Existing `allowNavigation` allowlist; no untrusted pages with bridge access |
| Sensitive logs | Redact JWTs, QR payloads, visitor details |
| Unauthorized API | Server-side role, device, gate checks |

`isNativeApp()` is never an authorization check.

## Packages (Capacitor 7.x only)

| Package | Phase | Purpose |
| --- | --- | --- |
| `@capacitor/network` | 02 | Connectivity |
| `@capacitor/app` | 02 | Lifecycle / resume |
| `@capacitor/preferences` | later | Non-sensitive UI settings only — not the gate DB |
| Secure-storage plugin | 04 | Credentials / DB key |
| Encrypted SQLite | 04 | Manifest + event queue |
| Camera / barcode plugin | 04 | Native scan |
| Push notifications | later | Medium |

Do not store a database encryption key in the DB, `localStorage`, or bundled config.

## Offline verification flow (Phase 04)

1. While online: download signed gate-scoped manifest, public keys, expiry, revocations.
2. Scan QR with native camera; parse pass id or signed payload.
3. Verify signature, gate scope, expiry, manifest age, pass status, local duplicates.
4. Eligible: atomic local accept event. Invalid: reject / demand online / escalate.
5. When online: upload queue, reconcile, acknowledgments.

## Ops (Phase 06)

Admin view: registered devices, last sync, manifest version/expiry, pending events, failed batches, duplicate/conflict redemptions, offline accept counts. Feature-flag offline acceptance. Keep the current online scan as fallback.
