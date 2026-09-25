# Doctor schedule slots — UX design

> Doctors publish their own availability; visitors book exclusive slots; urgent passcode bypasses the calendar.

## Goals

1. Doctor adds open slots from **My Visitors → Schedule** matching their day schedule.
2. Once a visitor books a slot, it disappears from public booking until rejected.
3. After a phone call, doctor may issue an **Urgent passcode** — that path does not use or steal calendar slots; the doctor decides by issuing the code.

## Doctor — Schedule tab

### Add slots form

| Field | Required | Notes |
|-------|----------|-------|
| From date | R | Inclusive |
| To date | R | Inclusive; same as from for single day |
| Start time | R | e.g. 09:00 |
| End time | R | e.g. 12:00 |
| Slot minutes | O | Default 30 |
| Weekdays | O | If omitted: Mon–Sat (skip Sunday). Multi-select 0=Mon … 6=Sun |

Submit creates non-overlapping slots; existing starts for that doctor are skipped.

### Slot list

For the selected range: time label, Open / Booked badge. **Delete** only when Open.

Helper copy: “Booked slots cannot be taken by another visitor. For walk-ins after a phone call, use Urgent passcode.”

## Urgent passcode dialog

Add one line: “Urgent passcodes do not use your calendar slots — issuing the code is your approval for gate entry.”

## Visitor booking (unchanged)

Public list only shows unbooked future slots; booking locks immediately.
