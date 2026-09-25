# Visitor Pre-Registration — Feature Architecture

## Overview

Global **VisitorAccount** identity for platform-wide pre-registration, separate from branch-scoped **Visitor** records used for hospital operations. Linked via `Visitor.visitorAccountId`.

## Data model

| Table | Purpose |
|-------|---------|
| `VisitorAccount` | Profile, verification flags, `profileStatus` |
| `VisitorAccountAuth` | PASSWORD / GOOGLE / LINKEDIN |
| `VisitorAccountDocument` | LIVE_PHOTO, GOVT_ID (S3 keys) |
| `EmailVerificationToken` | Magic-link verification |
| `VisitorAccountAuditLog` | Login, uploads, ID access |

## API (`/api/public/visitor-accounts`)

- `POST /` — create DRAFT (step 1)
- `PATCH /{id}` — professional details
- `POST /{id}/password`, `/photo`, `/government-id`
- `POST /{id}/send-phone-otp`, `/verify-phone`
- `POST /{id}/send-email-verification`, `GET /verify-email`
- `POST /{id}/activate`
- `GET /{id}/preview`, `GET /me`, `PATCH /me` (auth)

## Auth (`/api/public/visitor-auth`)

Password login, forgot/reset password, Google & LinkedIn OAuth.

## Storage

AWS S3 only for visitor account media (`visitor-accounts/{accountId}/...`).

## Integration

- **Booking:** `AppointmentsService.book_appointment` links branch `Visitor` via `VisitorAccountLinkService` when JWT present.
- **Security:** `SecurityService.get_visitor_details` returns S3 presigned photo + govt ID for linked accounts.
- **Visitor portal:** Appointments listed by `visitorAccountId` when account JWT used.

## Frontend

- `/visitor/register` — wizard + live preview
- `/visitor/login` — password + OAuth + legacy email OTP
- `/visitor/dashboard` — profile card + appointments
- `/visitor/verify-email`, `/visitor/oauth-callback`

See phased plan in project todos and `TASKS.md`.
