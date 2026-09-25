# Spec: Sales Representative attendance confirmation

## Booking

`visitorType`: `GENERAL` | `SALES_REPRESENTATIVE` | `VENDOR` (default `GENERAL`).

When `SALES_REPRESENTATIVE`:

- `companyName` required (non-empty)
- `companyEmail` required (valid email)

Other types: extra fields ignored / cleared.

Surfaces: `/book-appointment`, on-spot wizard (same component), visitor-registration meeting details.

## Check-in

On completed check-in (`VisitorsService.check_in_visitor` / `verify_code`) for Sales Rep:

1. If `confirmationTokenHash` already set → no-op (idempotent)
2. Else mint token, persist hash + expiry, `meetingStatus=not_started`, audit
3. Queue email to `Visitor.email` (not `companyEmail`) via FastAPI `BackgroundTasks`

Window: `SALES_MEETING_CONFIRM_WINDOW_HOURS` (default 4) from `checkInTime`.

## Confirm

Validate visit id + token hash. Reject used (410), expired (410), mismatch (404). Update `meetingStatus` + `meetingConfirmedAt`, clear token, audit, queue company email.

## Cron

`meetingStatus == not_started` AND `checkInTime + window < now` → `auto_expired`, audit, company email.

Local: FastAPI lifespan loop (5 min). Ops: `python scripts/expire_sales_meeting_confirmations.py --yes` or `POST /api/jobs/sales-meeting-auto-expire`.
