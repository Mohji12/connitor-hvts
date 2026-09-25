# Visit slot allotment — architecture

Hospital admin manages a **per-branch daily visit-slot pool**. Admins allot windows and slot counts to visit-capable STAFF; the system evenly generates bookable `DoctorAvailabilitySlot` rows for public booking.

## Decisions

- Slot times: even split of the allotted window (3 slots in 09:00–10:00 → 09:00, 09:20, 09:40).
- Who gets slots: active branch `role=STAFF` (doctors, nurses, receptionists, etc.).
- Daily cap: sum of allotment `slotCount` for branch+date ≤ `BranchVisitSlotPolicy.dailyQuota` (default 50). Unused allotted slots still count.

## Data

- `BranchVisitSlotPolicy` — `branchId`, `dailyQuota`
- `VisitSlotRoutine` — recurring template: staff, weekdays JSON, window HH:MM, slotCount
- `VisitSlotAllotment` — concrete day allotment: staff, date, window, slotCount, source `ROUTINE|MANUAL|OVERRIDE`
- Materialized rows remain `DoctorAvailabilitySlot` (`doctorId` = allotted staff)

## Flows

1. Admin sets daily quota.
2. Admin saves routines; **Apply** fills a date range (skips MANUAL/OVERRIDE allotments).
3. Admin upserts day allotments by staff name; regenerates **unbooked** slots only.
4. Visitors book open slots via `/book-appointment` (STAFF hosts, not doctors-only).

## APIs

Under `/api/branches/{branchId}/…` (hospital/branch/super admin):

- `GET/PUT visit-slot-policy`
- `GET/POST/PATCH/DELETE visit-slot-routines`
- `POST visit-slot-routines/apply`
- `GET/POST/PATCH/DELETE visit-slot-allotments`
- `GET visit-slot-allotments/template` — Excel template
- `POST visit-slot-allotments/import` — bulk `.xlsx` import (partial success) + staff email notify
- `GET visit-slot-staff`

Migrate: `python scripts/migrate_visit_slot_allotment.py --yes` in `python_backend/`.

## UI

- `/dashboard/visit-slots` — policy, day board, allot form, defaults tab
