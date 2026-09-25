# Visit slot extension — architecture

After in-person check-in, a visit lasts as long as its **booked slot** (`DoctorAvailabilitySlot` length, else 30 minutes). Expected end is `checkInTime + allottedMinutes`.

One minute before that end (`VISIT_EXTEND_WARN_MINUTES`), a cron job emails the doctor a **single-use** link (`/extend-visit`). Confirming adds 1–60 minutes, notifies branch security, and **delays every later same-doctor visit** (not only the next one). Each delayed visitor is emailed/SMS'd with the new window (e.g. 7:15 PM to 7:25 PM) because the ongoing meeting was extended. QR/check-in stay blocked until that new start (`SLOT_NOT_STARTED`). Public booking hides slots that start before the live visit's expected end.

Operational dashboards refetch every 5 seconds so new times and holds appear without a manual refresh.

While `now < expectedEndTime` for a checked-in visit, security cannot check in another in-person visitor for the same doctor (`409 HOLD_CURRENT_VISIT`). Hold lifts at expected end or checkout.

Security also cannot scan QR or check in a visitor **before that visit's own slot start** (`409 SLOT_NOT_STARTED`, e.g. "Meeting will start at 6:55 PM"). This still applies after a delay when the previous visit has already ended. Urgent passcodes and midnight open `[CUSTOM SLOT]` requests are not gated this way.

## Ops

- Migrate: `python scripts/migrate_visit_slot_extension.py --yes`
- Cron each minute: `python scripts/send_visit_extension_warnings.py --yes` or `POST /api/jobs/visit-extension-warnings`
