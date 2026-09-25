# Sales Representative Attendance Confirmation

## Stack

- **Live API:** Python FastAPI (`python_backend/`) on port 8002
- **Frontend:** Next.js 15 App Router (`frontend/`)
- **NestJS:** bookings do not live there — not duplicated

## Domain

Visitor kind is stored on `Visit` (the booking / pass record):

| `visitorType` | Extra fields | Check-in email |
|---|---|---|
| `GENERAL` | none | skip |
| `VENDOR` | none | skip |
| `SALES_REPRESENTATIVE` | `companyName`, `companyEmail` required | send tokenized confirm email to **visitor email** |

Meeting outcomes (`meetingStatus`): `not_started` → `started` | `not_attended` | `auto_expired`.

## Flow

1. Booking captures `visitorType` (and company fields when Sales Rep).
2. Security completes check-in → generate unguessable single-use token (hash stored), expiry = check-in + `SALES_MEETING_CONFIRM_WINDOW_HOURS` (default 4).
3. Async email to the sales person’s own email (`Visitor.email`) with **Meeting Started** / **Meeting Not Attended**.
4. Tokenized confirm (no login) updates status, invalidates token, audits, then async-notifies `companyEmail`.
5. Cron auto-expires remaining `not_started` visits past the window and notifies `companyEmail`.

## Token security

- `secrets.token_urlsafe(32)` issued once; only **SHA-256 hash** stored (`confirmationTokenHash`)
- Single-use (`confirmationTokenUsedAt`); expiry (`confirmationTokenExpiresAt`)
- Idempotent: check-in retries do not mint a second token if one already exists

## Audit

`MeetingStatusAudit`: `visitId`, `oldStatus`, `newStatus`, `actorType` (`sales_rep_email` / `system_cron` / `token`), `actor`, `tokenHash`, `createdAt`.

## APIs

| Method | Path | Auth |
|---|---|---|
| POST | `/api/public/appointments` | public (booking DTO) |
| POST | `/api/pass/{pass_id}/confirm?token=&status=` | public, token-gated |
| GET | `/api/pass/{pass_id}/confirm` | public; HTML fallback |
| POST | `/api/jobs/sales-meeting-auto-expire` | `X-Cron-Token` when `CRON_JOB_TOKEN` set |

Confirm `status`: `started` \| `not_attended`.

Frontend confirm UI: `/confirm-meeting?passId=&token=&status=`.
