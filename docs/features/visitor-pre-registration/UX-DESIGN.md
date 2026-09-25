# Visitor Pre-Registration — UX Design

## Registration wizard (`/visitor/register`)

Split layout: form left, LinkedIn-style preview card right (collapsible on mobile).

| Step | Fields | Preview updates |
|------|--------|-----------------|
| 1 Basic | Name, phone, email, work/personal | Name, email badge |
| 2 Professional | Company, role, LinkedIn URL | Headline |
| 3 Live photo | Webcam capture only | Avatar |
| 4 Government ID | Type dropdown + camera | (ID never shown in preview) |
| 5 Password | Password + terms | — |
| 6 Verification | Email link + SMS OTP | Verification chips |

## Login (`/visitor/login`)

- Primary: email/phone + password
- OAuth: Google, LinkedIn
- Fallback: legacy email OTP (post-booking without profile)

## Dashboard (`/visitor/dashboard`)

- Profile header card (photo via presigned URL)
- Appointment list (existing cards)
- Book new visit CTA

## Email verification

Magic link opens `/visitor/verify-email?token=...` → API verify → return to registration or login.
