# Visit slot allotment — UX

## Goals

1. Admin sets a hospital daily visit-slot pool (e.g. 50).
2. Admin allots staff + date + hours + slot count; times auto-split evenly.
3. Default routines avoid re-entering every day; day/person overrides when needed.
4. Visitors still book from the existing public wizard.

## Screens (`/dashboard/visit-slots`)

### Policy

- Daily quota number + Save
- Selected date: used / remaining

### Day board

- Date picker
- Table: staff, window, slot count, booked/open, source badge
- Edit / Delete (blocked when booked slots would be orphaned beyond new count)

### Allot form

| Field | Required |
|-------|----------|
| Staff | R (searchable STAFF at branch) |
| Date | R |
| Start time | R |
| End time | R |
| Slot count | R (≥ 1) |

Preview of generated times before/after save.

### Excel import

- Download template (Date, StartTime, EndTime, SlotCount, StaffName, StaffEmail).
- Upload `.xlsx`; valid rows allot immediately; failed rows listed with reasons.
- Each successful allotment emails the staff member (date, window, times).

### Defaults tab

- Routine lines: staff, weekdays, window, count
- Apply to next N days (skips MANUAL/OVERRIDE)

## Copy

“Unused allotted slots still count toward the daily pool.”
