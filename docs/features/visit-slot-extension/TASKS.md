# Visit slot extension — tasks

- [x] Schema: `allottedMinutes`, `expectedEndTime`, extension token/warning columns; migrate `python_backend/scripts/migrate_visit_slot_extension.py`
- [x] Check-in starts slot clock; `409 HOLD_CURRENT_VISIT` while same-doctor visit is live
- [x] QR/check-in blocked until this visit's slot start (`409 SLOT_NOT_STARTED`)
- [x] Warning job + public preview/confirm; consume token; notify security and delay next visitor
- [x] Extend cascade: all later same-doctor visits rescheduled + notified; QR uses new start
- [x] Dashboards refresh every 5 seconds
- [x] Security Hold badge + expected end; HOLD_CURRENT_VISIT toast; `/extend-visit` page
- [x] Unit tests + PROJECT_STATE
