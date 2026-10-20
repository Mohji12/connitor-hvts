# Increment 3 — Gate identity and signed manifests (stub)

**Status:** Done.

## Intent

Only authorized, enrolled gate devices may download a gate-scoped signed manifest. Tampered manifests must fail verification.

## Planned work

- `python_backend` models/schemas for `gate_devices` and `gate_manifest_versions`.
- `scripts/migrate_gate_offline.py` (same migrate-script pattern as the rest of FastAPI).
- `GET /api/gate/offline/manifest`, `POST /api/gate/devices/register` (admin enrollment, not self-serve).
- Signing keys on the server; public verification keys to the app.
- Preserve current HMAC QR until a dual-read migration.

## Done when

Only enrolled devices receive the correct gate-scoped manifest; signature failure rejects import.
