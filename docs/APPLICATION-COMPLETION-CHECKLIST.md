# Application Completion Checklist — Connitor / HVTS

> **Generated:** 2026-08-05  
> **Scope:** Deep analysis of the monorepo as it exists today (frontend + FastAPI `python_backend` + docs).  
> **Related:** `docs/MODULES-COMPLETE.md` (urgent / schedule / delivery windows detail) · `docs/PROJECT_STATE.md`  
> **Git tip at analysis:** `c1b0710` on `main`

### How to read this file

| Mark | Meaning |
|------|---------|
| `[x]` | **Complete / live** in code (UI + API + wired flow) |
| `[ ]` | **Not done**, deferred, or only planned in docs |
| **PARTIAL** | Section has both completed and remaining items |

Statuses reflect **codebase evidence**, not stale roadmap checkboxes. Where `PROJECT_STATE.md` or old NestJS specs disagree with the repo, this file prefers the **running FastAPI + Next.js** implementation.

---

## 0. Executive scoreboard

| Domain | Status | Notes |
|--------|--------|-------|
| Platform / stack | **Live (evolved)** | Primary API is **FastAPI** (`python_backend/`). NestJS `backend/` folder is **absent**. Frontend is Next.js 15. |
| Auth & RBAC | **Live** | Staff OTP + password login; visitor accounts; role-based sidebars |
| Org hierarchy (chains → wards) | **Live** | Chains, branches, depts, sub-depts, Hospital Admin |
| Unified visitor workflow | **Live** | Public registration, gate pass, security check-in/logs |
| Appointments & doctor schedule | **Live** | Public book + doctor Schedule tab + exclusivity |
| Urgent visit passcode | **Live** | Gate verify → register/book → dual QR |
| Visitor pre-registration portal | **Live** | Profile, OAuth, dashboard, book prefill |
| Delivery management suite | **Live** | Book, gate, receiving/GRN, wallet, slots, pricing |
| Distributor onboarding | **PARTIAL** | MVP apply + hospital review live; Inc 2–3 later |
| Attendant Management (AMS) | **Live** | Full AMS UI on attendant-pass foundation |
| Messaging / notifications | **PARTIAL** | Email/SMS/WhatsApp services exist; NestJS F-007 spec outdated |
| Analytics | **Live** | Hierarchy + delivery analytics endpoints/UI pieces |
| E2E / unit tests | **PARTIAL** | Large Python + Playwright suites; some flaky / Nest-era TASKS stale |
| Multi-tenant SaaS / community | **Not started** | Roadmap Phase 2–3 |

---

## 1. Platform & infrastructure

### 1.1 Runtime & repo layout

- [x] Monorepo with `frontend/` (Next.js App Router)
- [x] Primary API: `python_backend/` (FastAPI + SQLAlchemy)
- [x] PostgreSQL-backed models under `python_backend/app/models/`
- [x] Env-driven config (`python_backend/app/config.py`, `.env`)
- [x] Feature flag for delivery module (`DELIVERY_MODULE_ENABLED`)
- [x] Seed / migrate scripts under `python_backend/scripts/`
- [x] Frontend env examples (`.env.example`)
- [ ] NestJS `backend/` package present and maintained *(folder missing; legacy docs still mention Nest/Prisma)*
- [ ] Root `docker-compose.yml` present *(deleted in working tree / not on latest push)*
- [ ] Root `Readme.md` present *(deleted in working tree)*

### 1.2 Documented stack vs reality

- [x] Next.js 15 + Tailwind + Shadcn/Radix UI in use
- [x] FastAPI routers registered in `python_backend/app/routers/__init__.py`
- [ ] `PROJECT_STATE.md` Stack section updated to FastAPI (still lists NestJS/Prisma as core)
- [ ] Knowledge roadmap (`docs/knowledge/planning/roadmap.md`) refreshed to match live modules

---

## 2. Authentication & identity

### 2.1 Staff / admin auth

- [x] OTP login API (`POST /api/auth/login`, `verify-otp`)
- [x] Password login API (`POST /api/auth/login-password`)
- [x] Current user (`GET /api/auth/me`)
- [x] Frontend staff login UI (`/auth/login`, `/auth/login-otp`, `/auth/verify-otp`)
- [x] Auth password form component
- [x] Role-based post-login routing (`auth-routing.ts`)
- [x] JWT session for staff APIs

### 2.2 Visitor identity (pre-registration)

- [x] Visitor account register / verify email / SMS OTP
- [x] Visitor password login + reset
- [x] Visitor JWT + portal APIs (`/api/public/visitor-auth`, `visitor-accounts`, `visitor-portal`)
- [x] Google / LinkedIn OAuth callback page
- [x] Visitor dashboard + profile (`/visitor/dashboard`, `/visitor/dashboard/profile`)
- [x] Photo / ID upload path (S3-backed per feature docs)

### 2.3 Roles & RBAC (present in sidebar / API)

- [x] `SUPER_ADMIN`
- [x] `HOSPITAL_ADMIN`
- [x] `DEPARTMENT_ADMIN` / `SUB_DEPARTMENT_ADMIN`
- [x] `CHAIN_ADMIN` / `BRANCH_ADMIN` (legacy multi-site)
- [x] `STAFF` (doctor / clinical)
- [x] `SECURITY` / `SECURITY_SUPERVISOR`
- [x] `RECEIVING` / `PURCHASE`
- [x] `DISTRIBUTOR`
- [x] `WARD_ADMIN`
- [x] Permission tables for delivery fine-grained checks (per delivery architecture)

---

## 3. Organization administration

### 3.1 Hospital chains (F-002)

- [x] Chains CRUD UI (`/dashboard/hospital-chains`)
- [x] API `/api/hospital-chains`
- [x] Super Admin sidebar entry

### 3.2 Branches (F-003)

- [x] Branches UI (`/dashboard/branches`)
- [x] Chain-scoped + all-branches APIs (`/api/chain/{id}/branches`, `/api/branches`)
- [ ] Formal F-003 “In Progress” closed out in PROJECT_STATE *(functionally live; status row still 🏗)*

### 3.3 Departments & sub-departments

- [x] Models + migrations + seeds
- [x] Departments CRUD UI + API
- [x] Sub-departments CRUD UI + API
- [x] Hierarchy form fields on user create/edit
- [x] Dept / Sub-dept admin scoped user pages
- [x] Unit tests (`test_departments_service.py`, `test_sub_departments_service.py`)

### 3.4 User management (F-004)

- [x] Users UI (`/dashboard/users`)
- [x] Users API + RBAC scoping (`/api/users`)
- [x] Hospital Admin create/scope rules
- [x] Role-appropriate sidebars
- [ ] Formal F-004 “In Progress” closed out in PROJECT_STATE *(functionally largely live)*

### 3.5 Hospital Admin role feature

- [x] Backend role enum + auth dependencies
- [x] Department / appointment / visitor scoping
- [x] Analytics + notification recipients
- [x] Frontend guards + overview
- [x] Seed + unit tests (`test_hospital_admin_service.py`)

---

## 4. Unified visitor workflow

### 4.1 Public registration (meeting / delivery)

- [x] Landing + wizard routes under `/visitor-registration/*`
- [x] Phone entry + OTP verification
- [x] Visit type selection (Meeting vs Delivery)
- [x] Meeting registration form + meeting details
- [x] Delivery registration form + delivery details
- [x] Confirmation page
- [x] Status check (`/visitor-registration/status/[visitId]`)
- [x] Gate pass page (`/visitor-registration/gate-pass/[visitId]`)
- [x] Public registration / visitors / visits APIs
- [x] On-spot visit (`/visit/on-spot`)
- [x] Public QR visitor form (`/public-qr-visitor-form`)

### 4.2 Host approval

- [x] Doctor / staff My Visitors (`/dashboard/my-visitors`)
- [x] Approve / reject visit actions
- [x] Public approve link (`/approve-visit`)
- [x] Email / SMS approval notification paths
- [x] WhatsApp webhook routers present

### 4.3 Gate pass & check-in OTP

- [x] Gate pass image / QR generation services
- [x] Gate pass email delivery helpers
- [x] Check-in OTP verify path (security)
- [x] Same-QR / dual-QR exit patterns for applicable visit types

### 4.4 Security dashboard

- [x] Security layout + dashboard (`/security/dashboard`)
- [x] Check-In tab (phone lookup, OTP, urgent passcode verify/handoff)
- [x] Today’s Appointments tab
- [x] Visitor Logs tab (filters + polling)
- [x] Delivery Scan tab
- [x] Attendant Pass Scan tab
- [x] Today’s Deliveries tab
- [x] ID proof verification for appointments
- [x] Duration tracking on checkout
- [x] Unified security queue API

### 4.5 Dashboard visitor admin pages

- [x] Visitors list (`/dashboard/visitors`)
- [x] Check-in page (`/dashboard/visitors/check-in`)
- [x] Visitor logs (`/dashboard/visitors/visitors-logs`)
- [x] Appointments list (`/dashboard/appointments`)

---

## 5. Appointments & doctor schedule

### 5.1 Public booking

- [x] `/book-appointment` wizard
- [x] How-it-works + status pages
- [x] Public appointments API catalog / book / status
- [x] Home page CTA to book
- [x] Doctor approval notifications
- [x] Unit tests (`test_appointments_service.py`)

### 5.2 Doctor schedule slots *(Module 2 — complete)*

- [x] `DoctorScheduleService` list / batch create / delete
- [x] API `/api/staff/schedule/slots`
- [x] Race-hardened slot reserve
- [x] My Visitors → Schedule UI (`DoctorSchedulePanel`)
- [x] Public list shows only open future slots
- [x] Urgent passcode bypasses calendar (documented + UI copy)
- [x] Unit tests (`test_doctor_schedule.py`)
- [x] Feature docs (`docs/features/doctor-schedule-slots/`)

---

## 6. Urgent visit passcode *(Module 1 — complete)*

- [x] Doctor issue / reuse passcode dialog
- [x] Status lifecycle `ACTIVE → VERIFIED → REDEEMED`
- [x] Security confirm-verify API
- [x] Public session + book APIs (`/api/public/urgent-passcodes`)
- [x] Auto-APPROVED visit on urgent book
- [x] Entry + Exit QR payloads on visit
- [x] Gate scan distinguishes entry vs exit
- [x] Security handoff QR/link to `/visitor/urgent`
- [x] Visitor urgent page (auth → book → dual QR)
- [x] Old immediate-redeem path disabled
- [x] Migrations (`migrate_doctor_urgent_passcode`, `share`, `gate_flow`)
- [x] Unit tests (`test_doctor_urgent_passcode.py`)
- [x] Feature docs + `MODULES-COMPLETE.md` section
- [ ] WhatsApp channel for passcode share *(explicitly out of scope)*

---

## 7. Visitor pre-registration (portal)

- [x] P1 Foundation (schema, S3, draft API)
- [x] P2 Wizard (`/visitor/register`, photo/ID)
- [x] P3 Email + SMS verify + activate
- [x] P4 Auth + dashboard v2
- [x] P5 Google + LinkedIn OAuth
- [x] P6 Branch visitor link, book prefill, security ID
- [x] P7 Rate limits, audit log, unit tests, QA report
- [x] Feature docs (`docs/features/visitor-pre-registration/`)

---

## 8. Delivery management suite

### 8.1 Core inbound delivery (Phases 0–8)

- [x] Foundation docs, permissions, module skeleton
- [x] Branch settings, docks, gates, distributors
- [x] Delivery lifecycle + QR
- [x] Security gate merge + `VisitDeliveryLink`
- [x] Receiving board + GRN
- [x] Billing + wallet (recharge, transactions, debit on book)
- [x] Analytics + notifications bridge
- [x] Seed / wizard fixes / tests (`test_delivery_module.py`, gate exit tests, etc.)
- [x] Hospital delivery ops UI (`/dashboard/delivery`, detail pages)
- [x] Receiving UI (`/dashboard/receiving`)
- [x] Distributor portal (`/vendor/deliveries`, book, detail)
- [x] Fleet agents/vehicles (`/vendor/fleet`)
- [x] Wallet UI (`/vendor/wallet`)
- [x] Security delivery scan + today’s deliveries
- [x] Exit-after-GRN / duration email alignment

### 8.2 Shared-minute delivery windows *(Module 3 — complete)*

- [x] `BranchDeliverySlot.bookedMinutes`
- [x] Window mode capacity = minute length
- [x] Book path reserves `slotMinutes`
- [x] Hospital publish UI (`/dashboard/delivery-slots`)
- [x] Distributor picker filters by remaining minutes
- [x] Legacy `grid` mode still available
- [x] Migration + tests (`migrate_delivery_slot_minutes.py`, `test_delivery_slot_minutes.py`)

### 8.3 Volume / package pricing *(complete)*

- [x] Package unit table (Small→Custom) + vehicle base fees
- [x] Over-capacity handling fee + longer unload minutes
- [x] Quote endpoint + wallet debit on book
- [x] Booking wizard live summary
- [x] Legacy volume formula still accepted without packages
- [x] Migration + tests (`test_delivery_volume_pricing.py`)

### 8.4 Distributor onboarding — **PARTIAL**

**Increment 1 (MVP) — done**

- [x] Distributor onboarding profile fields + documents
- [x] Public apply API + branches list
- [x] `/vendor/register` multi-step wizard
- [x] Home / footer portal links
- [x] Hospital vendors review + verification status
- [x] Block booking when not fully approved
- [x] Tests (`test_distributor_onboarding.py`)

**Increment 2–3 — not done**

- [ ] Draft save
- [ ] Document expiry reminders
- [ ] Full compliance matrix UI by vendor type
- [ ] External GSTIN / MSME validation
- [ ] Wallet unlock only after bank verified

---

## 9. Attendant Management System (AMS)

- [x] Increment 1: Shell + dashboard summary (`/dashboard/ams`)
- [x] Increment 2: Register fields + QR pass UI (`/dashboard/ams/register`)
- [x] Increment 3: Search + Active (`/search`, `/active`)
- [x] Increment 4: Shift change + Emergency
- [x] Increment 5: Reports + Settings
- [x] Backend AMS endpoints on `/api/attendant-passes/*`
- [x] Public apply (`/attendant-pass`, `/attendant-pass/apply`)
- [x] Ward email approval (`/approve-attendant`)
- [x] Security attendant scan tab
- [x] Visiting hours / one-inside / expired ACTIVE handling (aligned)
- [x] Legacy `/dashboard/attendant-passes` redirect to AMS
- [x] Migration `migrate_ams_register_fields.py`
- [x] Tests (`test_ams_features.py`, attendant pass / approval tests)
- [x] Feature docs (`docs/features/attendant-management/`)

---

## 10. Messaging, notifications & webhooks — **PARTIAL**

### 10.1 Implemented in FastAPI

- [x] Notifications router (`/api/notifications`)
- [x] Email service (gate pass, approvals, duration, assignment)
- [x] SMS service (OTP / doctor notify paths)
- [x] WhatsApp service class + webhooks (`whatsapp_webhooks`)
- [x] Twilio webhooks
- [x] Zoom webhooks (calendar / meeting related)
- [x] Gate pass email on approval paths
- [x] Attendant / delivery duration and assignment emails

### 10.2 Spec / NestJS F-007 gaps

- [ ] NestJS `MessagingModule` / Meta WhatsApp pamphlet send as originally specified in `F-007` *(Nest backend gone)*
- [ ] PROJECT_STATE F-007 marked Live with accurate FastAPI description *(still 🏗 In Progress)*
- [ ] Guaranteed production WhatsApp gate-pass delivery verified for all visit types *(depends on env/provider config)*

---

## 11. Analytics & dashboards

- [x] Analytics API router (`/api/analytics`)
- [x] Super Admin / Hospital / Dept / Sub-dept overview widgets
- [x] Visitor trends + visit duration endpoints
- [x] Delivery dashboard summary API
- [x] AMS reports summary
- [x] Unit tests (`test_analytics_service.py`)
- [ ] Standalone “Phase 2 Analytics Dashboard” product packaging from old roadmap *(core pieces already live)*

---

## 12. Navigation & UX shell (F-006)

- [x] Role-based `sidebar-config.ts` for all major roles
- [x] Dashboard layout + settings page
- [x] Security sidebar / bottom nav / mobile menu
- [x] Home page portals (visitor, delivery, staff entry points)
- [x] Site footer links (distributor register, etc.)
- [ ] Formal F-006 closed as Live in PROJECT_STATE *(still 🏗; functionally present)*

---

## 13. Testing & quality

### 13.1 Python backend unit tests (present)

- [x] Auth / users / hospital admin
- [x] Departments / sub-departments / appointments / security
- [x] Analytics / visitor accounts
- [x] Delivery module / booking / pricing / slot minutes / onboarding
- [x] Urgent passcode / doctor schedule
- [x] AMS / attendant pass / gate QR / gate exit
- [x] WhatsApp approval / Twilio / Zoom / email templates / SMS
- [x] Admission visit slots / custom slot request / calendar

### 13.2 Frontend / E2E

- [x] Playwright config + scripts in frontend
- [x] Auth login smoke specs
- [x] Visitor registration wizard / steps / gate-pass / status specs
- [x] Security logs + phone lookup specs
- [x] AI profile / workflow browser specs
- [x] Unified visitor workflow large unit + E2E history documented in feature TASKS
- [ ] Nest-era `e2e-test-setup/TASKS.md` checkboxes updated to FastAPI reality *(file still unchecked against Nest paths)*
- [ ] Playwright suite reliably green in CI / headed runs *(known flakiness: trailing-slash FastAPI POSTs, infra-dependent failures)*

### 13.3 Demo / seed data

- [x] Deterministic / Electronic City seed scripts
- [x] Demo login credentials doc (`docs/DEMO-LOGINS.txt`)
- [x] Password ensure scripts for demo users

---

## 14. Frontend route inventory (pages present)

### Public / marketing

- [x] `/` Home
- [x] `/book-appointment` (+ how-it-works, status)
- [x] `/public-qr-visitor-form`
- [x] `/approve-visit`, `/approve-attendant`
- [x] `/visit/on-spot`
- [x] `/not-found`

### Auth

- [x] `/auth/login`, `/auth/login-otp`, `/auth/register`, `/auth/verify-otp`

### Visitor portal

- [x] `/visitor/login`, `/register`, `/reset-password`, `/verify-email`, `/oauth-callback`
- [x] `/visitor/dashboard`, `/visitor/dashboard/profile`
- [x] `/visitor/urgent`

### Visitor registration wizard

- [x] `/visitor-registration` (+ phone, type, meeting/delivery forms, confirmation, status, gate-pass)

### Staff dashboard

- [x] `/dashboard` overview
- [x] Chains, branches, departments, sub-departments, users, settings
- [x] Visitors, check-in, logs, appointments, my-visitors
- [x] Delivery, delivery detail, delivery-slots, vendors, receiving
- [x] AMS suite (dashboard, register, search, active, shift-change, emergency, reports, settings)
- [x] Legacy attendant-passes redirect page

### Security

- [x] `/security/dashboard` (multi-tab)

### Distributor / vendor

- [x] `/vendor/register`, `/vendor/deliveries`, `/vendor/deliveries/book`, `/vendor/deliveries/[id]`
- [x] `/vendor/fleet`, `/vendor/wallet`

### Attendant public

- [x] `/attendant-pass`, `/attendant-pass/apply`

---

## 15. Backend API surface (routers mounted)

- [x] `/api/auth`
- [x] `/api/hospital-chains`, `/api/branches`, `/api/chain/{id}/branches`
- [x] `/api/departments`, `/api/sub-departments`, `/api/users`
- [x] `/api/appointments`, `/api/public/appointments`, `/api/public/appointment-approval`
- [x] `/api/staff`, `/api/staff/urgent-passcodes`, `/api/staff/schedule`
- [x] `/api/security` (+ urgent-passcodes security router)
- [x] `/api/visitors`, `/api/public/visitors`, `/api/public/visits`, `/api/public/registration`
- [x] `/api/public/visitor-portal`, `/api/public/visitor-accounts`, `/api/public/visitor-auth`
- [x] `/api/public/urgent-passcodes`
- [x] `/api/public/attendant-passes`, `/api/attendant-passes`
- [x] `/api/public/distributor-onboarding`
- [x] `/api/delivery` (book, quote, slots, security, receiving, GRN, wallets, distributors, …)
- [x] `/api/notifications`, `/api/analytics`
- [x] `/api/webhooks` (Zoom, Twilio, WhatsApp)

---

## 16. Feature-folder TASKS rollup

| Feature folder | TASKS status (as written) | Code verdict |
|----------------|---------------------------|--------------|
| `urgent-visit-passcode` | All `[x]` | **Complete** |
| `doctor-schedule-slots` | All `[x]` | **Complete** |
| `delivery-shared-minute-slots` | All `[x]` | **Complete** |
| `delivery-volume-pricing` | All `[x]` | **Complete** |
| `attendant-management` | All increments `[x]` | **Complete** |
| `delivery-management` | Phases 0–8 Done | **Complete** |
| `distributor-onboarding` | Inc 1 `[x]`; Inc 2–3 `[ ]` | **PARTIAL** |
| `visitor-pre-registration` | P1–P7 Done | **Complete** |
| `hospital-admin` | All Done | **Complete** |
| `department-hierarchy` | Phases 1–5 `[x]` | **Complete** |
| `unified-visitor-workflow` | Increments shipped + large test history | **Complete (MVP)** |
| `e2e-test-setup` | TASKS still Nest unchecked; QA/Playwright exist | **PARTIAL (docs drift)** |
| `F-001` … `F-007` | Mixed / Nest-era specs | **Re-map to FastAPI; several functionally live** |

---

## 17. Explicitly incomplete / deferred backlog

### Product backlog

- [ ] Distributor onboarding Increments 2–3 (drafts, expiry, compliance matrix, GSTIN/MSME, bank-gated wallet)
- [ ] WhatsApp share for urgent passcodes
- [ ] Multi-tenant SaaS isolation (roadmap Phase 2)
- [ ] Professional community / profiles (roadmap Phase 3)
- [ ] Stabilize Playwright E2E against FastAPI trailing-slash / env issues

### Documentation / housekeeping backlog

- [ ] Refresh `PROJECT_STATE.md` Stack (FastAPI, not Nest/Prisma-only)
- [ ] Close or re-label F-003 / F-004 / F-005 / F-006 / F-007 status rows to match reality
- [ ] Update `docs/knowledge/planning/roadmap.md` milestones (M2/M3 largely delivered)
- [ ] Rewrite or archive Nest-only F-007 / e2e TASKS against `python_backend`
- [ ] Restore or intentionally remove root README / docker-compose from git history policy
- [ ] Decide whether `frontend/dist/` should be gitignored (build artifacts often dirty locally)

### Ops reminders (complete when deployed)

- [ ] Run urgent passcode migrations on each environment
- [ ] Run delivery slot minutes + volume pricing migrations
- [ ] Run AMS register fields migration
- [ ] Run visitor pre-registration migration where needed
- [ ] Configure WhatsApp / SMS / email / S3 / OAuth secrets per environment
- [ ] Restart API after migrations

---

## 18. Suggested demo path (all major live modules)

1. **Admin:** Super/Hospital Admin → chains/branches/depts/users  
2. **Schedule:** Doctor → My Visitors → Schedule → publish slots → visitor `/book-appointment`  
3. **Urgent:** Doctor passcode → Security confirm-verify → `/visitor/urgent` → dual QR scan  
4. **Walk-in visitor:** `/visitor-registration` → approve → gate pass → security check-in/out  
5. **Delivery:** Hospital slots → distributor register/approve → book (packages/vehicle) → security scan → receiving/GRN → exit  
6. **AMS:** Ward register attendant → approval link → security attendant scan → shift/emergency/reports  

Demo credentials: `docs/DEMO-LOGINS.txt`

---

## 19. Analysis method (evidence sources)

This checklist was produced by cross-checking:

1. `docs/PROJECT_STATE.md` active tasks  
2. Every `docs/features/*/TASKS.md` and major UX/architecture docs  
3. All `frontend/src/app/**/page.tsx` routes (~68 pages)  
4. `frontend/src/lib/sidebar-config.ts` role menus  
5. `python_backend/app/routers/__init__.py` + key routers (auth, security, delivery, AMS, urgent, schedule)  
6. `python_backend/tests/test_*.py` inventory (~39 files)  
7. `frontend/tests/e2e/specs/**` Playwright inventory  
8. Presence/absence of NestJS `backend/` folder  

For the three recent modules in extra depth, see **`docs/MODULES-COMPLETE.md`**.
