# Visitor Pre-Registration — Tasks

| Phase | Status | Deliverable |
|-------|--------|-------------|
| P1 Foundation | Done | Schema, S3, migration, draft API, docs |
| P2 Wizard | Done | `/visitor/register`, preview, photo/ID upload |
| P3 Verify | Done | Email link + SMS OTP + activate |
| P4 Auth + dashboard | Done | Password login, JWT, dashboard v2 |
| P5 OAuth | Done | Google + LinkedIn routes + login UI |
| P6 Integration | Done | Branch visitor link, book-appointment prefill, security ID |
| P7 Hardening | Done | Rate limits, audit log, unit tests, QA report |

## Commands

```bash
# Migration
cd python_backend
python scripts/migrate_visitor_pre_registration.py --yes

# Tests
npx jest tests/test_visitor_account_service.py  # or: python -m pytest if configured
python -m unittest tests.test_visitor_account_service
```

## Env

See `python_backend/.env.example` — `AWS_S3_BUCKET`, OAuth client IDs, `VISITOR_JWT_EXPIRY_HOURS`.
