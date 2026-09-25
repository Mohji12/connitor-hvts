# Completed modules — detailed status

> **Date:** 2026-08-05  
> **Repo commit:** `083a656` on `main` (`https://github.com/dittocodes/connitor`)  
> **Status:** All three modules below are **live / complete** (backend + frontend + migrations + unit tests + feature docs).

This document is the single detailed checklist of what shipped for:

1. **Urgent visit passcode** (gate verify → register/book → dual QR)
2. **Doctor schedule slots** (publish availability; exclusive booking; urgent bypass)
3. **Delivery shared-minute windows** (hospital multi-hour pools + distributor unload minutes), including the related **volume/package pricing** used when booking

---

## Module 1 — Urgent visit passcode

### Purpose

Doctor-issued 6-digit codes for urgent gate access. Security verifies at the gate; the visitor then registers and books on the platform (auto-approved); Entry and Exit QR codes drive check-in and checkout timestamps.

### End-to-end flow (complete)

| Step | Actor | What happens |
|------|--------|----------------|
| 1 | Doctor | Issues or reuses an active passcode from **My Visitors → Urgent passcode** dialog |
| 2 | Doctor / visitor | Code shared out-of-band (copy; SMS/email optional) |
| 3 | Security | Enters code on Check-in tab → **confirm-verify** → passcode becomes `VERIFIED`; handoff shows register URL/QR |
| 4 | Visitor | Opens `/visitor/urgent/?token=…` → create profile or sign in → book (ASAP or open slot) |
| 5 | System | Visit created **APPROVED**; passcode → `REDEEMED`; **Entry QR** + **Exit QR** issued |
| 6 | Security | Scan Entry QR → `checkInTime`; scan Exit QR → `checkOutTime` |

### Status lifecycle (complete)

`ACTIVE` → (security confirm-verify) → `VERIFIED` → (visitor book) → `REDEEMED`

- Immediate redeem-on-verify (old path) is **disabled** (returns 400).

### Backend — what is complete

| Item | Detail |
|------|--------|
| Entity | `DoctorUrgentPasscode` with `VERIFIED`, `verifiedAt` / `verifiedBy`, gate token support |
| Security API | `POST …/confirm-verify` — marks verified and returns gate handoff token/session |
| Public API | `GET/POST /api/public/urgent-passcodes/{session,book}` — session + book with gate JWT |
| Booking | Public urgent book creates visit as **APPROVED** (skips doctor approval queue) |
| Dual QR | Visit stores `entryQrPayload` / `exitQrPayload`; `GatePassService.issue_entry_exit_qrs` |
| Gate scan | Scan path distinguishes **entry** vs **exit** by QR type |
| Migrations | `migrate_doctor_urgent_passcode.py`, `migrate_urgent_passcode_share.py`, `migrate_urgent_passcode_gate_flow.py` |
| Tests | `python_backend/tests/test_doctor_urgent_passcode.py` |

**Key files**

- `python_backend/app/services/doctor_urgent_passcode_service.py`
- `python_backend/app/routers/doctor_urgent_passcode.py`
- `python_backend/app/routers/public_urgent_passcodes.py`
- `python_backend/app/services/gate_pass_service.py` (entry/exit issue + scan)
- `python_backend/app/models/entities.py` (passcode + visit QR fields)

### Frontend — what is complete

| Item | Detail |
|------|--------|
| Doctor UI | `UrgentPasscodeDialog` — generate/reuse, copy code, copy that calendar is bypassed |
| Security UI | `CheckInTab` — verify → confirm-verify → handoff QR/link to `/visitor/urgent/?token=…` |
| Visitor page | `/visitor/urgent` — auth → locked-doctor book → show Entry + Exit QR |
| Services | `urgentPasscodeService.ts`, `urgentGatePublicService.ts` |

**Key files**

- `frontend/src/components/myVisitors/UrgentPasscodeDialog.tsx`
- `frontend/src/app/security/dashboard/components/CheckInTab.tsx`
- `frontend/src/app/visitor/urgent/page.tsx`
- `frontend/src/lib/services/urgentPasscodeService.ts`
- `frontend/src/lib/services/urgentGatePublicService.ts`

### Docs

- `docs/features/urgent-visit-passcode/UX-DESIGN.md`
- `docs/features/urgent-visit-passcode/TASKS.md`

### Explicitly out of scope (not built)

- WhatsApp channel for passcode share
- Changing approval rules for normal (non-urgent) bookings

### Deploy notes

```bash
cd python_backend
python scripts/migrate_doctor_urgent_passcode.py --yes
python scripts/migrate_urgent_passcode_share.py --yes
python scripts/migrate_urgent_passcode_gate_flow.py --yes
```

Restart API after migrate so new routes/columns are live.

---

## Module 2 — Doctor schedule slots

### Purpose

Doctors publish their own availability windows; public booking locks a slot exclusively when taken. Urgent passcodes do **not** consume calendar slots — issuing the code is the doctor’s approval for gate entry.

### End-to-end flow (complete)

| Step | Actor | What happens |
|------|--------|----------------|
| 1 | Doctor | **My Visitors → Schedule** — set date range, start/end time, slot length, weekdays |
| 2 | System | Creates non-overlapping `DoctorAvailabilitySlot`s (existing starts skipped) |
| 3 | Visitor | Public `/book-appointment` lists only **open** future slots |
| 4 | Visitor | Books a slot → reserved exclusively (race-hardened reserve) |
| 5 | Doctor | May delete only **Open** slots; booked ones stay until visit is rejected/cleared |
| 6 | Urgent path | Passcode flow bypasses calendar entirely (see Module 1) |

### Backend — what is complete

| Item | Detail |
|------|--------|
| Service | `DoctorScheduleService` — list / create batch / delete |
| API | Routes under `/api/staff/schedule/slots` |
| Exclusivity | `_reserve_slot` hardened against double-book races |
| Tests | `python_backend/tests/test_doctor_schedule.py` |

**Key files**

- `python_backend/app/services/doctor_schedule_service.py`
- `python_backend/app/routers/doctor_schedule.py`
- Public booking path continues to use open slots only (existing appointments flow)

### Frontend — what is complete

| Item | Detail |
|------|--------|
| Service | `doctorScheduleService.ts` |
| Doctor UI | `DoctorSchedulePanel` on My Visitors **Schedule** tab — add slots, list Open/Booked, delete Open |
| Copy | Urgent dialog states that passcodes do not use calendar slots |
| Public | `/book-appointment` continues to show only bookable open slots |

**Key files**

- `frontend/src/components/myVisitors/DoctorSchedulePanel.tsx`
- `frontend/src/components/myVisitors/MyVisitors.tsx` (Schedule tab)
- `frontend/src/lib/services/doctorScheduleService.ts`
- `frontend/src/components/myVisitors/UrgentPasscodeDialog.tsx` (bypass copy)

### Docs

- `docs/features/doctor-schedule-slots/UX-DESIGN.md`
- `docs/features/doctor-schedule-slots/TASKS.md`

### Slot form fields (shipped)

| Field | Required | Notes |
|-------|----------|-------|
| From / To date | Yes | Inclusive range |
| Start / End time | Yes | e.g. 09:00–12:00 |
| Slot minutes | Optional | Default 30 |
| Weekdays | Optional | Default Mon–Sat (skip Sunday) |

---

## Module 3 — Delivery shared-minute windows (+ booking pricing)

### Purpose

Hospital publishes multi-hour receiving windows. Distributors book only the unload minutes they need; leftover capacity stays available for others. Booking fees use package + vehicle pricing (v2), which also drives the unload-minute estimate.

### End-to-end flow (complete)

| Step | Actor | What happens |
|------|--------|----------------|
| 1 | Hospital admin | `/dashboard/delivery-slots` — publish morning/afternoon windows for a date range |
| 2 | System | One `BranchDeliverySlot` per window; capacity = window length in minutes |
| 3 | Distributor | Book form: packages + vehicle → fee quote + `slotMinutes` (usually 10+, more if over capacity) |
| 4 | Distributor | Slot picker shows windows with **enough remaining minutes** |
| 5 | System | Booking reserves minutes (`bookedMinutes`); wallet debit of quoted total |
| 6 | Others | Same window remains bookable until remaining &lt; needed |

### Example (complete behaviour)

- Hospital: **10:00–12:00** → 120 minute pool  
- Distributor A: books ~**10 min** unload  
- Result: **110 min left** for other distributors  

### Backend — shared-minute windows (complete)

| Item | Detail |
|------|--------|
| Model | `BranchDeliverySlot.bookedMinutes` |
| Service | `DeliverySlotService` — window mode, minute reserve/list |
| Book path | Delivery book passes `slotMinutes` into reserve |
| Modes | Default `windows` (shared pool); legacy `grid` still chops fixed chunks |
| Migration | `migrate_delivery_slot_minutes.py` |
| Tests | `python_backend/tests/test_delivery_slot_minutes.py` |

### Backend — volume / package pricing (complete)

| Item | Detail |
|------|--------|
| Pricing helper | `delivery_pricing.py` (v2) |
| Packages | Small 1, Medium 2, Large 4, Equipment 8, Custom 10 (units × qty) |
| Vehicles | Bike ₹48 / Auto ₹149 / SCV ₹349 / MCV ₹1449 / LCV ₹1999 with capacities |
| Over capacity | Allowed with warning; `handling = ceil(over/5)×₹25` |
| Slot minutes | 10 if within capacity; `10 + ceil(over/5)×5` when over |
| Wallet | Debit on successful book |
| Legacy | Old volume formula still accepted if `packages` / `vehicleCategory` omitted |
| Migration | `migrate_delivery_volume_pricing.py` |
| Tests | `python_backend/tests/test_delivery_volume_pricing.py` |

**Key files**

- `python_backend/app/delivery/delivery_slot_service.py`
- `python_backend/app/delivery/delivery_pricing.py`
- `python_backend/app/delivery/inbound_delivery_service.py`
- `python_backend/app/routers/delivery.py`
- `python_backend/app/models/delivery_entities.py`

### Frontend — what is complete

| Item | Detail |
|------|--------|
| Hospital UI | `/dashboard/delivery-slots` — publish windows; day schedule shows remaining/capacity + booking count |
| Distributor UI | `DeliveryBookingWizard` — packages, vehicle, live fee/slot summary, windows filtered by needed minutes |
| Services | `distributorDeliveryService.ts` |

**Key files**

- `frontend/src/app/dashboard/delivery-slots/page.tsx`
- `frontend/src/features/distributor-delivery/DeliveryBookingWizard.tsx`
- `frontend/src/lib/services/distributorDeliveryService.ts`

### Docs

- `docs/features/delivery-shared-minute-slots/UX-DESIGN.md`
- `docs/features/delivery-shared-minute-slots/TASKS.md`
- `docs/features/delivery-volume-pricing/UX-DESIGN.md`
- `docs/features/delivery-volume-pricing/TASKS.md`

### Rules shipped

- Capacity = `slotEnd − slotStart` (minutes)
- Reject when remaining minutes &lt; needed
- Unscheduled arrivals still allowed when branch policy permits
- Over-capacity bookings allowed with handling fee + longer unload estimate

### Deploy notes

```bash
cd python_backend
python scripts/migrate_delivery_slot_minutes.py --yes
python scripts/migrate_delivery_volume_pricing.py --yes
```

Restart API after migrate.

---

## Cross-module relationships

```text
Doctor Schedule (Module 2)
    └── publishes exclusive calendar slots for normal booking

Urgent Passcode (Module 1)
    └── bypasses calendar; security verify → visitor book → dual QR

Delivery Windows (Module 3)
    └── independent receiving capacity (minutes) + pricing on distributor book
```

- Urgent booking may still offer an open doctor slot on the visitor urgent page, but the **passcode itself does not reserve** a calendar slot when issued.
- Delivery modules do not share state with visitor/doctor schedule.

---

## Verification summary

| Module | Unit tests | Feature docs | PROJECT_STATE |
|--------|------------|--------------|---------------|
| Urgent visit passcode | `test_doctor_urgent_passcode.py` | UX + TASKS | 🟢 Live |
| Doctor schedule slots | `test_doctor_schedule.py` | UX + TASKS | 🟢 Live |
| Delivery shared-minute + pricing | `test_delivery_slot_minutes.py`, `test_delivery_volume_pricing.py` | UX + TASKS (both feature folders) | 🟢 Live |

---

## How to demo (quick)

1. **Schedule:** Doctor login → My Visitors → Schedule → publish a day’s slots → visitor books on `/book-appointment`.
2. **Urgent:** Doctor issues passcode → Security Check-in → confirm-verify → visitor opens handoff link → dual QR → security scans Entry then Exit.
3. **Delivery:** Hospital publishes a 2-hour window on Delivery Slots → distributor books with packages/vehicle → confirm remaining minutes drop by unload estimate and wallet is debited.
