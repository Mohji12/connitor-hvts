# Increment 6 — Pilot and production rollout (stub)

**Status:** Done. `GATE_OFFLINE_ENABLED` (default off) plus per-device `offlineEnabled`. Ops at `/dashboard/gate-offline`.

## Intent

Enable offline acceptance only on a small set of enrolled devices behind a feature flag. Keep the existing online scan as fallback.

## Planned work

- Ops dashboard: devices, last sync, manifest expiry, pending events, conflicts.
- Required test scenarios (no internet start, duplicate scan, two offline devices, clock change, manifest expiry, uninstall, device revoke, mid-sync retry, role change, older APK vs new API).
- Security and operational sign-off before broad enablement.

## Done when

Pilot criteria pass; offline status is unmistakable to gate staff; escalation exists when authorization cannot be established.
