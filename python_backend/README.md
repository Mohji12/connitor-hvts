# Python Backend (FastAPI)

Python port of the NestJS/TypeScript backend for the **Hospital Visitor Tracking System**.

## Stack

- **FastAPI** — HTTP API (80 endpoints, same paths as Node backend under `/api`)
- **SQLAlchemy** — MySQL ORM (same database as Prisma)
- **JWT** — Bearer auth (phone OTP login)
- **Optional:** GCP Storage, AWS SNS, WhatsApp (Meta Cloud API)

## Quick start

```bash
cd python_backend
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
copy .env.example .env
# Edit DATABASE_URL and JWT_SECRET to match your Node backend .env
```

Run the server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or double-click `run-dev.bat` (Windows).

- API root: http://localhost:8000/api/
- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

## Connect the Next.js frontend

Run **both** processes (two terminals):

```bash
# Terminal 1 — Python API (required; frontend calls /api/auth/login)
cd python_backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (proxies /api to port 8000 in dev)
cd frontend
npm run dev
```

In `frontend/.env.local`, leave `NEXT_PUBLIC_BACKEND_API_URL` empty so requests go to
`http://localhost:3000/api/...` and Next.js forwards them to `BACKEND_PROXY_URL` (default `http://localhost:8000`).

If the browser shows errors on API calls, ensure uvicorn is on the **same port** as `BACKEND_PROXY_URL` (default **8000**).

Test login email: `superadmin@hvts.com` (seeded user).

## Environment

Use the same MySQL database as the original backend (`DATABASE_URL`).  
Copy values from `backend/.env` into `python_backend/.env`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `mysql+pymysql://user:pass@host:3306/hvts` |
| `JWT_SECRET` | Must match Node backend for shared tokens |
| `TEST_MODE` / `DEMO_MODE` | Same behavior as NestJS |
| `GCP_*` | File uploads (optional) |
| `AWS_*` | SMS OTP (optional) |

## Endpoint parity

All **80** routes from the NestJS controllers are implemented:

| Module | Prefix |
|--------|--------|
| App | `GET /api/` |
| Auth | `/api/auth` |
| Hospital chains | `/api/hospital-chains` |
| Branches | `/api/chain/{chainId}/branches` |
| All branches | `/api/branches/all-branches` |
| Users | `/api/users` |
| Staff | `/api/staff` |
| Security | `/api/security` |
| Notifications | `/api/notifications` |
| Visitors | `/api/visitors` |
| Public visitors | `/api/public/visitors` |
| Public visits | `/api/public/visits` |
| Analytics | `/api/analytics` |

## Project layout

```
python_backend/
  main.py                 # FastAPI entry
  app/
    config.py
    database.py
    models/               # SQLAlchemy entities
    dependencies/         # JWT, roles
    services/             # Business logic
    routers/              # HTTP routes
```

## Connect the frontend

1. Start this API: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
2. In `frontend/.env.local`:

```env
BACKEND_PROXY_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_API_URL=
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEMO_MODE=false
```

3. Restart the Next.js dev server (`npm run dev` in `frontend/`) so env vars reload.

4. Log in with a seeded user **email** (e.g. `superadmin@hvts.com` for SUPER_ADMIN).  
   Optional: set `HVTS_TEST_MODE=true` and `E2E_FIXED_OTP=123456` in `python_backend/.env` to skip real email (OTP returned in API / toast).

5. Configure SMTP in `.env` for production email delivery (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).

Frontend requests go to `http://localhost:3000/api/...` (proxied to `http://localhost:8000/api/...`).

## Notes

- Uses the **existing MySQL schema** created by Prisma migrations; no new migrations required.
- Gate pass images use **Pillow** instead of Node `canvas` (same API behavior, simplified rendering).
- Do **not** run the NestJS backend on port 8000 at the same time as this server.
