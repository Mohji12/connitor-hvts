# Mobile architecture improvement — Tasks

| Phase | Status | Description |
| --- | --- | --- |
| 01 Audit | Done | Repository baseline, QR/session/API inventory, regression tests |
| 02 Foundation | Done | Session restore, API timeouts/retry, network banner, Capacitor App/Network |
| 03 Backend | Done | Gate device identity and signed, gate-scoped manifests |
| 04 Native | Done | Bundled offline-gate.html, AES-GCM vault, local verification |
| 05 Sync | Done | Idempotent event upload, redemption conflicts, acknowledgments |
| 06 Release | Done | Feature flag, ops dashboard, security/admin nav |

## This increment

- Spec folder created.
- Capacitor stays on 7.x. No AGP/Gradle bump.
- No FastAPI gate-offline routers.
- No SQLite / secure-storage / barcode plugins.
- Expo left unchanged.

## Done when (01–02)

- App reopen, expired JWT, logout, and network loss behave consistently in Jest.
- `isNativeApp()` is documented and tested as UI context, not authorization.
- Axios has a timeout, GET-only retry, and staff 401 session clear.
- Offline banner is visible in the app shell; it does not treat a cached QR as authorized.
