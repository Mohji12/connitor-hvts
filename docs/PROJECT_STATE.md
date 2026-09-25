# 🟢 Project State

> **Mission:** Build a Hospital Visitor Tracking System to streamline entry/exit, enhance security with QR codes, and manage multi-branch chains.
> **Phase:** MVP - Feature Implementation

## 1. The Stack

- **Core:** Node.js v20+, NestJS (legacy), **Python FastAPI live API** (`python_backend/` on port 8002), Next.js 15 (Frontend).
- **Key Libs:** Prisma (ORM), PostgreSQL, Tailwind CSS, ShadCN UI, Passport.js (Auth).

## 2. Active Tasks

| Task                      | Status         | Owner     | Notes                                    |
| :------------------------ | :------------- | :-------- | :--------------------------------------- |
| **F-001** Auth System     | 🟢 Live        | Tech Lead | Spec: `docs/specs/F-001-auth-system`     |
| **F-002** Hospital Chains | 🟢 Live        | Developer | Spec: `docs/specs/F-002-hospital-chains` |
| **F-003** Branches        | 🏗 In Progress | Developer | Spec: `docs/specs/F-003-branches`        |
| **F-004** User Mgmt       | 🏗 In Progress | Developer | Spec: `docs/specs/F-004-user-mgmt`       |
| **Dept Hierarchy**        | 🟢 Live        | Developer | Spec: `docs/features/department-hierarchy/` |
| **Hospital Admin Role**   | 🟢 Live        | Agent     | `docs/features/hospital-admin/` |
| **Delivery Management**   | 🟢 Live        | Agent     | Full suite redesign: distributor portal, hospital ops, receiving board, security gate (`frontend/src/features/delivery-management/`) |
| **Distributor Onboarding** | 🟢 Live        | Agent     | Self-serve apply `/vendor/register`; hospital review on delivery vendors; `docs/features/distributor-onboarding/` |
| **Urgent visit passcode**  | 🟢 Live        | Agent     | Gate verify → visitor register/book (auto-approved) → Entry/Exit QR — `docs/features/urgent-visit-passcode/` |
| **Doctor schedule slots**  | 🟢 Live        | Agent     | Exclusive booked slots; doctors no longer add/publish them from My Visitors — `docs/features/doctor-schedule-slots/` |
| **Visit slot allotment** | 🟢 Live | Agent | Hospital daily quota + admin allot/routine → even-split `DoctorAvailabilitySlot` — `docs/features/visit-slot-allotment/` |
| **Delivery shared-minute slots** | 🟢 Live | Agent | Hospital 2h windows; distributors consume unload minutes — `docs/features/delivery-shared-minute-slots/` |
| **Dummy delivery payment** | 🟢 Live | Agent | Book wizard Details → fake UPI/Card pay → `paymentMethod=DUMMY` credit+debit; demo only |
| **Delivery hold (internal bypass)** | 🟢 Live | Agent | Security hold/release on Today's Deliveries; notify vendor/driver/admins — `docs/features/delivery-hold-bypass/` |
| **E2E headed QA report** | 🟢 Done | Agent | 2026-08-10: logins 12/12 + Playwright 36/36 (visitor 5/5, delivery pay 4/4 re-run); `docs/E2E-QA-REPORT.md` |
| **3-module completion doc** | 🟢 Done     | Agent     | Detailed what’s-complete for urgent + schedule + delivery: `docs/MODULES-COMPLETE.md` |
| **Sales Rep attendance** | 🟢 Live | Agent | Check-in confirm email + company outcome + dashboard status — `docs/features/sales-rep-attendance/` |
| **Attendant Management (AMS)** | 🟢 Live | Agent | Full AMS under `/dashboard/ams` on attendant-pass foundation — `docs/features/attendant-management/` |
| **Rule/UI alignment**     | 🟢 Done        | Agent     | Delivery status transitions + exit-after-GRN; attendant expired ACTIVE + branch scan + honest email toast; El City demo portals |
| **Visitor pass quota** | 🟢 Live | Agent | Per-branch daily hospital-issued pass IDs — `docs/features/visitor-pass-quota/` |
| **Visit slot extension** | 🟢 Live | Agent | Slot-length clock from check-in; doctor extend email; hold next visitor — `docs/features/visit-slot-extension/` |
| **F-005** Visitor Mgmt    | 🏗 In Progress | Developer | Spec: `docs/specs/F-005-visitor-mgmt`    |
| **Visitor Pre-Registration** | 🟢 Live     | Agent     | `docs/features/visitor-pre-registration/` |
| **F-006** Navigation      | 🏗 In Progress | Developer | Spec: `docs/specs/F-006-navigation`      |
| **F-007** Messaging       | 🏗 In Progress | Developer | Spec: `docs/specs/F-007-messaging`       |
| **E2E Test Setup**        | 🟢 Live        | Developer | Spec: `docs/features/e2e-test-setup/`    |
| **Conninter website redesign** | 🟢 Live | Agent | Marketing `/` + `/portal` + `/demo`; navy app chrome — `docs/features/conninter-website-redesign/` |
| **LiveKit online consultations** | 🟢 Live | Agent | Replaces Zoom; in-app `/meet` room, webhook check-in/out — `docs/features/livekit-meetings/` |

## 3. Knowledge / Constraints

- **Brand spelling (UI):** **Conninter** (design wordmark). Asset path `/ConnInter.png` kept until a new logo ships. Component export `ConnitorLoader` retained for imports.
- **App chrome brand:** Navy/blue tokens (`#001B71` / `#4A90E2` / `#F7F9FC`); visitor shells use `VisitorPortalShell` + `ConninterWordmark`. Keep emerald for success/status only.
- **Marketing home:** Conninter Vite design ported into Next.js at `frontend/src/components/home/conninter/` (composed by `HomePage.tsx`). Login hub `/portal` → real auth. Product tour at `/demo` (mock UI only, not production auth). Staff strip between Pricing and Footer.
- **Landing module slider:** Hero and How It Works auto-rotate between Visitor visits and Deliveries (`useAutoRotate` in `frontend/src/hooks/use-auto-rotate.ts`, tabs in `ModuleToggle.tsx`). Copy/cards live in `heroModules.ts` and `how-it-works/howItWorksData.ts` (`visitorFlow` / `deliveryFlow`). Pauses on hover, typing in search, hidden tab, and when How It Works is off-screen; no auto-rotate under reduced motion.
- **Deploy automation:** `scripts/deploy/` — EC2 backend + **Vercel** frontend (`deploy-frontend.ps1` or push to `coninter` → `main`). Copy `config.example.env` → `config.env`. Guide: `docs/knowledge/deployment/DEPLOY-AUTOMATION.md`. **Amplify retired** — production UI is https://coninter-main.vercel.app only.
- **Local Dev (Windows):** Start **Docker Desktop**, then MySQL container `hvts-mysql` on host port **3307** (`root` / `635241`, DB `hvts`). Python API: `python_backend/.venv` + `pip install -r requirements-dev.txt` + `uvicorn main:app --port 8002`. Frontend proxies `/api` → `BACKEND_PROXY_URL=http://127.0.0.1:8002` via `frontend/.env.local`. Demo login: `superadmin@hvts.com` / `Connitor@123` (or OTP `123456` when `HVTS_TEST_MODE=true`). Backend tests: `cd python_backend && python -m pytest` (needs `pytest-asyncio`; see `requirements-dev.txt`).
- **Auth:** OTP-based + password login. JWT Strategy.
- **RBAC:** Hospital hierarchy: **Super Admin → Hospital Admin → Department Admin → Sub-Department Admin → Staff** (Doctor, Nurse, Security, and other clinical/support types). Legacy chain/branch admin roles remain for multi-site setup.
- **Department Hierarchy:** Spec: `docs/features/department-hierarchy/`
- **Visitor Types:** "Meeting" (High security/friction) vs "Delivery" (Low friction).
- **Messaging:** WhatsApp is primary channel for Gate Passes.
- **Testing:**
  - Backend unit tests: `npm test`
  - E2E Testing: Uses TEST_MODE env var to mock SMS/WhatsApp and use fixed OTP
  - Deterministic Seeding: Fixed UUIDs for core entities (Super Admin, Chain Admins, Branch Admins)
- **Strictness:** No `any`, strictNullChecks enabled.
- **ESLint:** TypeScript unsafe rules disabled for test files (see `docs/features/unified-visitor-workflow/ESLINT-JEST-INVESTIGATION.md`)
- **E2E Test Constants:**
  - Super Admin ID: `11111111-1111-1111-1111-111111111111`, Phone: `6987456321`
  - Department Admin (Cardiology): `22222222-2222-2222-2222-222222222222`, Phone: `8482022111`
  - Sub-Dept Admin (Chennai): `33333333-3333-3333-3333-333333333333`, Phone: `7980427511`
  - Mock API: set `NEXT_PUBLIC_USE_MOCK_API=true` for in-browser departments/sub-departments CRUD
  - Dept Admin dashboard: `/dashboard` (mock persona `22222222-2222-2222-2222-222222222222`)
  - Public booking: `/book-appointment` (also linked from HomePage)
  - Cardiology Dept ID: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`
  - ICU Cardiology Sub-Dept ID: `ffffffff-ffff-4fff-8fff-ffffffffffff`
  - Apollo Chain ID: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
  - Chennai Branch ID: `dddddddd-dddd-4ddd-8ddd-dddddddddddd`
  - Hospital Admin ID: `55554444-4444-4444-4444-444444444444`, Phone: `9123456780`
- **AMS:** Staff UI at `/dashboard/ams/*` (dashboard, register, search, active, shift-change, emergency, reports, settings). Migration: `python scripts/migrate_ams_register_fields.py --yes` in `python_backend/`. Legacy `/dashboard/attendant-passes` redirects to AMS.
- **Gate exit + duration:** Same-QR exit for deliveries (after GRN) and attendants; duration emails; one-inside booking block.
- **Urgent visit passcode:** Doctor issues code → multi-app share (Web Share API for native Phone/Laptop app chooser, WhatsApp, Email, SMS, Copy) → security **confirm-verify** → visitor `/visitor/urgent` registers + books (auto-APPROVED) → Entry/Exit QR for check-in/out. Migrate: `python scripts/migrate_doctor_urgent_passcode.py --yes`, `migrate_urgent_passcode_share.py --yes`, `migrate_urgent_passcode_gate_flow.py --yes`.
- **Doctor schedule:** Doctors do not publish slots from My Visitors. Public booking still uses exclusive `DoctorAvailabilitySlot`s when they exist; urgent passcode bypasses calendar.
- **Visit slot allotment:** Hospital/branch admin sets per-branch `dailyQuota` and allots windows + slot counts to visit-capable STAFF (even split). Default routines + day/person overrides. Excel bulk import + staff email on allot. UI `/dashboard/visit-slots`. Migrate: `python scripts/migrate_visit_slot_allotment.py --yes` in `python_backend/`.
- **Delivery volume pricing:** Distributor book form uses package types (Small→Custom) + vehicle type (Bike→LCV) fees with over-capacity handling; wizard **Payment** step uses dummy UPI/Card (`paymentMethod=DUMMY` credits then debits wallet). Legacy volume formula still accepted by API without packages.
- **Delivery windows:** Hospital admin publishes multi-hour windows on `/dashboard/delivery-slots`; each booking consumes unload minutes (`slotMinutes`); remaining minutes stay available. Migrate: `python scripts/migrate_delivery_slot_minutes.py --yes`.
- **Delivery hold:** Security puts distributor bookings `ON_HOLD` from Today's Deliveries (reason + optional until); notifies distributor/driver/hospital admin/super admin; release restores original `SCHEDULED` time. Migrate: `python scripts/migrate_delivery_hold.py --yes`.
- **Sales Rep attendance:** Public booking `visitorType` (General / Sales Representative / Vendor). Sales Rep requires `companyName` + `companyEmail`. After security check-in, visitor email gets a one-time confirm link (Meeting Started / Not Attended). Unconfirmed visits auto-expire after `SALES_MEETING_CONFIRM_WINDOW_HOURS` (default 4). Company gets the outcome. Confirm UI: `/confirm-meeting`. Migrate: `python scripts/migrate_sales_rep_attendance.py --yes` in `python_backend/`. Cron: `python scripts/expire_sales_meeting_confirmations.py --yes` or `POST /api/jobs/sales-meeting-auto-expire`.
- **Visitor pass quota:** Per-branch daily hospital-issued pool (`BranchVisitorPassPolicy` + `VisitorPass`). Admin generates IDs; unused still count; in-person approval/assignment consumes one ID (online does not). Recycle if rejected before check-in. Migrate: `python scripts/migrate_visitor_pass_quota.py --yes` in `python_backend/`.
- **Online consultations (LiveKit, Zoom retired):** Approval assigns room `visit-{id}` and signed `/meet/?t=` host/guest links (`Visit.meeting*`; old `zoom*` columns kept for history). Env (server only): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, optional `MEETING_JOIN_EARLY_MINUTES` (15) / `MEETING_JOIN_GRACE_MINUTES` (60). Token: `POST /api/public/meetings/token`. Webhook: `https://connitor.bengalurutechcommunity.com/api/webhooks/livekit` (set in LiveKit Cloud → Settings → Webhooks). Migrate: `python scripts/migrate_livekit_meetings.py --yes`. E2E: `npx playwright test tests/e2e/specs/meetings --project=chromium` (fixture `python_backend/scripts/e2e_meeting_fixture.py`). EC2 has 411 MB RAM: gunicorn runs `-w 2 --timeout 120`.
- **Shell gotcha:** `deploy-frontend.ps1` sets `NEXT_PUBLIC_BACKEND_API_URL` in the session; clear it (`Remove-Item Env:NEXT_PUBLIC_BACKEND_API_URL`) before `npm run dev`, or the local app calls production. `npm run build` also overwrites `.next` under a running dev server — restart dev afterwards.
- **Visit slot extension:** In-person check-in lasts the booked slot length. Cron emails the doctor 1 minute before expected end (`VISIT_EXTEND_WARN_MINUTES`). Single-use `/extend-visit` link. Extending delays **all** later same-doctor visits (new QR scan time) and notifies them. Security cannot check in while a live visit is holding, or before that visitor's own (possibly delayed) slot start (`SLOT_NOT_STARTED`). Dashboards refresh every 5 seconds. Migrate: `python scripts/migrate_visit_slot_extension.py --yes`. Job: `python scripts/send_visit_extension_warnings.py --yes` or `POST /api/jobs/visit-extension-warnings`.
