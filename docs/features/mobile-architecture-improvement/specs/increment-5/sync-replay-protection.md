# Increment 5 — Sync and replay protection (stub)

**Status:** Done. `POST /api/gate/offline/sync` returns ACCEPTED / DUPLICATE / REJECTED / CONFLICT.

## Intent

Batch-upload queued scan events. Retries must not create duplicate records. Conflicting offline redemptions are reported, not hidden.

## Planned work

- `POST /api/gate/offline/sync` with client `event_id`s.
- Per-event results: accepted, duplicate, rejected, conflict.
- Server receipt time vs device `occurred_at`; clock-drift policy.
- Unique redemption constraints in MySQL for one-time passes.

## Done when

Interrupted sync + retry is idempotent; two offline devices scanning the same one-time pass produce an explicit conflict on the server.
