# Current baseline (Phase 01 audit)

Recorded against the Capacitor 7.2 / Next.js 15 / FastAPI / MySQL tree. Do not assume the proposed offline-gate files already exist.

## Shell

| Item | Location | Notes |
| --- | --- | --- |
| Capacitor | [`mobile/package.json`](../../../mobile/package.json) | `@capacitor/core` and `@capacitor/android` `^7.2.0`. No Network/App plugins before Phase 02. |
| Config | [`mobile/capacitor.config.ts`](../../../mobile/capacitor.config.ts) | No `server.url`. `webDir: www`. Splash then `https://www.conninter.com/app/?native=1`. `allowNavigation`: `conninter.com`, `*.conninter.com`, Google, LinkedIn. `cleartext: false`. |
| Android | [`mobile/android/app/src/main/AndroidManifest.xml`](../../../mobile/android/app/src/main/AndroidManifest.xml) | CAMERA, INTERNET, RECORD_AUDIO. `allowBackup="true"` before Phase 02 (change to `false`). MainActivity exported, `singleTask`. |
| Expo | `mobile-expo/` | Parallel shell. Freeze until Capacitor is stable. |

Frontend currently has **no** `@capacitor/*` packages. Remote WebView pages must dynamic-import plugins; the public website must keep working without them.

## Session

| Store | Desktop | Native WebView |
| --- | --- | --- |
| Staff JWT `authToken` | `sessionStorage` | `localStorage` (+ session) |
| Visitor JWT `visitorAuthToken` | `localStorage` | `localStorage` |
| Resume paths | — | `conninterLastInAppPaths` per persona |
| Last role | — | `conninterPersona` |
| Native flag | — | `?native=1` → `conninterNativeShell` / `__CONNINTER_NATIVE_SHELL__` |

Files: [`frontend/src/lib/auth-storage.ts`](../../../frontend/src/lib/auth-storage.ts), [`visitor-auth-storage.ts`](../../../frontend/src/lib/visitor-auth-storage.ts), [`native-session.ts`](../../../frontend/src/lib/native-session.ts), [`platform.ts`](../../../frontend/src/lib/platform.ts).

`getStoredAuthToken` / `getVisitorToken` already drop tokens whose JWT `exp` is in the past. `isNativeApp()` is UI context (chrome, storage location) and must never authorize a gate decision.

## API client

[`frontend/src/lib/api.ts`](../../../frontend/src/lib/api.ts) (axios):

- Auth header: visitor token on visitor-portal paths, otherwise staff token.
- Slash normalization for FastAPI vs Next rewrite.
- Visitor **401** clears the visitor token.
- Before Phase 02: **no timeout**, **no GET retry**, **staff 401 does not clear** the staff session.
- Errors: [`api-errors.ts`](../../../frontend/src/lib/api-errors.ts). Unreachable copy mentioned local uvicorn — unsafe on production / native.

Live API: `https://api.conninter.com`. Frontend: `https://www.conninter.com`.

## QR formats (preserve)

Do not migrate QR payloads in Phase 01–02.

| Kind | Payload | Signature | Scan UI |
| --- | --- | --- | --- |
| Visitor entry/exit | JSON `{"t":"entry\|exit","v":visitId,"j":uuid}` | Unsigned in `GatePassService.issue_entry_exit_qrs` | Security `html5-qrcode` |
| Delivery | `{deliveryId}:{deliveryNumber}:{iso}` | HMAC-SHA256 with `jwt_secret`; QR JSON `{qrPayload, signature}` | Same scanner + `parseQrScanText` |
| Attendant | HMAC-SHA256 of pass payload with `jwt_secret` | `qrPayload` + `qrSignature` | WebView camera / Expo native scan |

Parser: [`frontend/src/components/security/QrCheckInScanner.tsx`](../../../frontend/src/components/security/QrCheckInScanner.tsx) `parseQrScanText`. Scanner is **not** a Capacitor barcode plugin.

## Pass caches (not authorization)

| Key | File | Meaning |
| --- | --- | --- |
| `visitorPassCache` | [`visitor-pass-cache.ts`](../../../frontend/src/lib/visitor-pass-cache.ts) | Lets the visitor still **see** a QR image offline |
| `deliveryPassCache` | [`delivery-pass-cache.ts`](../../../frontend/src/lib/delivery-pass-cache.ts) | Same for distributor/driver pass image |

A cached image is not a server decision and must not be treated as gate acceptance.

## Backend / DB

- FastAPI routers under `python_backend/app/routers/`. No `/api/gate/offline/*` yet.
- Gate scan today is **online**: visitor `scan_check_in_qr`, delivery `DeliveryGateService.scan_qr`, attendant HMAC verify.
- Schema changes use `python_backend/scripts/migrate_*.py`. Later gate tables must follow that pattern, not Alembic, unless the project later adopts Alembic.

## Test gaps before Phase 01

- [`native-session.test.ts`](../../../frontend/src/lib/native-session.test.ts) covered staff resume and expired staff JWT; missing expired visitor JWT, logout → no resume, and “native ≠ auth”.
- No tests for `parseQrScanText`.
- Pass-cache tests stored/retrieved QR images but did not state they are display-only.
- No axios timeout / GET-retry / staff-401 tests.
