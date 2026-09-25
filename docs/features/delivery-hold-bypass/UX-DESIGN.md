# Delivery hold (internal bypass) — UX

> Security puts a distributor booking **on hold** when hospital internal delivery needs the dock. No separate internal-notice UI (staff tell Security offline).

## Flow

1. Distributor books → appears on Security **Today’s Deliveries**.
2. Security: **Put on hold** → reason (required) + optional until time → status `ON_HOLD`.
3. Notify: distributor users, driver email, hospital admins, super admins.
4. Gate entry / allow-entry blocked while `ON_HOLD`.
5. Security: **Release hold** → back to `SCHEDULED`, same arrival/slot; notify same parties.

## APIs

- `POST /api/delivery/security/hold/{id}` `{ reason, holdUntil? }`
- `POST /api/delivery/security/release-hold/{id}`

## Migration

```bash
cd python_backend
python scripts/migrate_delivery_hold.py --yes
```
