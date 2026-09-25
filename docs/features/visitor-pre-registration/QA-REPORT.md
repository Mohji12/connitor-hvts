# QA Report — Visitor Pre-Registration

**Date:** 2026-06-06  
**Scope:** Phases P1–P7

## Automated

| Check | Result |
|-------|--------|
| `test_visitor_account_service.py` | Pass (draft, duplicate phone, professional update, OTP test mode) |

## Manual checklist

- [ ] `POST /public/visitor-accounts` creates DRAFT
- [ ] Wizard steps persist and preview updates live
- [ ] Photo + govt ID upload to S3 (or mock in dev)
- [ ] SMS OTP + email magic link verify
- [ ] Activate → ACTIVE status
- [ ] Password login issues JWT
- [ ] Dashboard shows profile + appointments
- [ ] Book appointment prefills from session and links branch Visitor
- [ ] Security visit details show account photo + govt ID (SECURITY role)
- [ ] Rate limit returns 429 on repeated OTP sends

## Notes

- OAuth requires production Google/LinkedIn app credentials.
- S3 bucket and IAM credentials required for media in non-test environments.
- Legacy email OTP login retained for visitors who booked without a profile.
