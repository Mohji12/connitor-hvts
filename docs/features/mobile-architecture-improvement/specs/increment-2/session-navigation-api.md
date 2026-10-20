# Increment 2 — Session, navigation, API reliability

## Goal

Centralize session restoration, API errors/timeouts, network status, and mobile route handling. Smallest compatible changes. Do not upgrade Capacitor, AGP, or Gradle.

## Capacitor (`mobile/`)

- Confirm `@capacitor/core` / `@capacitor/android` 7.x.
- `npm install @capacitor/network @capacitor/app` at the same major.
- `npx cap sync android`.
- `android:allowBackup="false"` in `AndroidManifest.xml`.
- Do not add scanner, secure-storage, or SQLite plugins.

## Frontend

| Change | File |
| --- | --- |
| Detection is UI-only | `frontend/src/lib/platform.ts` |
| JWT `exp` already in storage helpers; resume must not use expired tokens; logout → Welcome on native | `native-session.ts`, `logout.ts` |
| Axios timeout 20s, GET retry max 1 on network/timeout, staff 401 clears staff session | `api.ts`, `api-client-policy.ts` |
| Production-safe unreachable / timeout copy | `api-errors.ts` |
| `navigator.onLine` + optional Capacitor Network | `frontend/src/lib/mobile/network.ts` |
| App resume → re-check session | `frontend/src/lib/mobile/app-lifecycle.ts`, `NativeSessionTracker.tsx` |
| Offline banner in app shell | `components/mobile/OfflineBanner.tsx` |
| Optional Capacitor JS (dynamic import) | `@capacitor/core`, `@capacitor/app`, `@capacitor/network` on frontend |

## Rules

- Never retry POST/PUT/PATCH/DELETE.
- Never treat offline or a cached QR as authorized.
- Marketing pages must not crash if Capacitor is absent.
- Native home after logout / expired session: `/app/`.

## Tests

- `api-client-policy.test.ts` — GET retry vs mutation no-retry; timeout classified as retriable.
- `api-errors.test.ts` — production/native copy does not mention uvicorn.
- `network.test.ts` — online/offline subscription.
- Extended `native-session.test.ts`.
