# Increment 1 — Repository audit

## Goal

Inventory session, QR, API, Capacitor, and scan code. Add regression tests so Phase 02 cannot silently break login, resume, or QR parsing.

## Deliverables

- [CURRENT-BASELINE.md](../../CURRENT-BASELINE.md)
- Jest: expired visitor JWT does not resume; logout/clear tokens → `resolveNativeResumePath()` is null; `isNativeApp()` is not treated as auth.
- Jest: `parseQrScanText` accepts `{qrPayload, signature}` JSON and rejects garbage.
- Jest: visitor pass cache is display-only (cached QR is not a gate decision).

## Out of scope

Backend tables, FastAPI routers, native plugins besides documentation.
