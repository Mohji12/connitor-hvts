# E2E Browser QA Report — Connitor / HVTS

> **Date:** 2026-08-10 (IST)  
> **Environment:** Local headed Chromium (Playwright)  
> **Frontend:** `http://localhost:3000` (Next.js turbopack)  
> **API:** `http://127.0.0.1:8002` (FastAPI uvicorn)  
> **Mode:** Live API (`NEXT_PUBLIC_USE_MOCK_API=false`)  
> **Prep:** `seed_ai_profile_users.py --yes` + `ensure_user_passwords.py`

---

## 1. Executive summary

| Check | Result |
|-------|--------|
| API password logins (Electronic City) | **12/12 OK** |
| Browser headed e2e (all modules, earlier run) | **31/31 passed** (~5.2 min) |
| Visitor module (with / without passcode) | **5/5 passed** (~2.2 min) |
| Delivery booking + dummy payment (re-run) | **4/4 passed** (~1.3 min) |
| Overall | **PASS** — demo-ready for Electronic City |

| Suite | Tests | Result | Time |
|-------|-------|--------|------|
| API login matrix | 12 accounts | **12/12 OK** | ~19s |
| AI full workflows | 10 | **10/10** | included |
| AI profiles walkthrough | 13 | **13/13** | included |
| Attendant workflow | 4 | **4/4** | included |
| Distributor dummy payment | 4 | **4/4** | **1.3 min** (re-run) |
| Visitor with / without passcode | 5 | **5/5** | **2.2 min** |
| **Total Playwright** | **36** | **36 passed** | — |

Screenshots:  
`frontend/test-results/ai-profiles/` · `ai-full-workflows/` · `delivery-payment/` · `attendant-workflow/` · `visitor-workflow/`

---

## 2. Login matrix (all Electronic City accounts)

**Password for all:** `Connitor@123`  
**UI:** `/auth/login` (add `?role=…` for role-targeted entry)

| Role | Email | API login | Browser login (e2e) | Landing |
|------|-------|-----------|---------------------|---------|
| SUPER_ADMIN | `superadmin@hvts.com` | OK | OK | `/dashboard` |
| HOSPITAL_ADMIN | `hospital.admin@connitor-elcity.com` | OK | OK | `/dashboard` |
| DEPARTMENT_ADMIN | `dept.admin@connitor-elcity.com` | OK | OK | `/dashboard` |
| SUB_DEPARTMENT_ADMIN | `subdept.admin@connitor-elcity.com` | OK | OK | `/dashboard` |
| STAFF / Doctor | `priya.nair@connitor-elcity.com` | OK | OK | `/dashboard` → My Visitors |
| STAFF / Nurse | `lakshmi.devi@connitor-elcity.com` | OK | *(API only this run)* | `/dashboard` |
| STAFF / Receptionist | `manoj.kumar@connitor-elcity.com` | OK | *(API only this run)* | `/dashboard` |
| SECURITY | `security@connitor-elcity.com` | OK | OK | `/security/dashboard` |
| WARD_ADMIN | `ward.admin@connitor-elcity.com` | OK | OK | `/dashboard/ams` |
| RECEIVING | `receiving@connitor-elcity.com` | OK | OK | `/dashboard/receiving` |
| PURCHASE | `purchase@connitor-elcity.com` | OK | OK | `/dashboard/delivery` |
| DISTRIBUTOR | `distributor@citygen.demo` | OK | OK | `/vendor/deliveries` |

Distributor UI: `/auth/login?role=DISTRIBUTOR`  
Nurse / Receptionist were verified at API (`/auth/login-password` + `/api/auth/me`); browser profile suite covers Doctor as the STAFF representative.

Full list: [`docs/DEMO-LOGINS.txt`](DEMO-LOGINS.txt)

---

## 3. Module e2e results

### 3.1 Auth & home
- [x] Home portals / role cards visible
- [x] Password login for every Electronic City role (API)
- [x] Headed login for 10 primary roles + public pages

### 3.2 Super Admin
- [x] Login → dashboard
- [x] Hospital chains page loads (`/dashboard/hospital-chains`)

### 3.3 Hospital Admin
- [x] Login → dashboard
- [x] Delivery ops (`/dashboard/delivery`)
- [x] AMS dashboard (`/dashboard/ams`)
- [x] Delivery slots (`/dashboard/delivery-slots`)

### 3.4 Department / Sub-department / Staff
- [x] Dept Admin dashboard
- [x] Sub-dept Admin dashboard
- [x] Doctor (STAFF) dashboard + My Visitors

### 3.5 Security
- [x] Security dashboard home
- [x] Delivery scan tab
- [x] Today’s deliveries / hold UI
- [x] Attendant scan tab
- [x] Appointments tab
- [x] Doctor urgent passcode verify → visitor handoff URL

### 3.6 Delivery / distributor
- [x] Distributor list + book wizard (Details / fee preview)
- [x] Dummy payment step (amount due)
- [x] Simulate payment failure stays on Payment
- [x] UPI Pay → Delivery booked
- [x] Card Pay → Delivery booked

### 3.7 Purchase / Receiving
- [x] Purchase → delivery overview
- [x] Receiving board (docks + queue)

### 3.8 Attendant / AMS (Ward)
- [x] AMS dashboard + register page
- [x] Public apply (`/attendant-pass/apply`) — MRN lookup + submit
- [x] Ward approve + issue pass (QR)
- [x] Security entry scan (govt ID) + checkout QR → pass **USED**
- [x] AMS search / revoke UI visible

### 3.9 Public visitor
- [x] Visitor registration landing (`?branchId=` Electronic City)
- [x] Wizard phone-entry step (Start Registration)
- [x] Guest `/book-appointment` without passcode (hospital → dept → OPD → AI Doctor Priya → slot → **Booking Confirmed**, pending doctor approval)
- [x] Urgent passcode: doctor issue → security confirm-verify → `/visitor/urgent` sign-in → walk-in book → **Entry QR + Exit QR** (auto-approved)

### 3.10 Not automated this run
- [ ] Doctor schedule exclusive lock (two visitors same slot)
- [ ] Security Put on hold / Release hold + email proof
- [ ] Gate block while delivery `ON_HOLD`
- [ ] Visitor pre-registration OAuth / photo upload
- [ ] WhatsApp notifications (Meta token typically invalid locally)

---

## 4. Playwright suite detail

### 4.1 `ai-full-workflows-browser.spec.ts` — **10/10**

| # | Activity | Result |
|---|----------|--------|
| 01 | Home portals | ok |
| 02 | Super Admin + hospital chains | ok |
| 03 | Hospital Admin + delivery + AMS + slots | ok |
| 04 | Dept / Subdept / Staff dashboards | ok |
| 05 | Distributor book wizard UI | ok |
| 06 | Purchase delivery | ok |
| 07 | Receiving board | ok |
| 08 | Security tabs + deliveries hold UI | ok |
| 09 | Ward AMS + public apply | ok |
| 10 | Visitor registration landing | ok |

### 4.2 `ai-profiles-browser.spec.ts` — **13/13**

| # | Profile / page | Result |
|---|----------------|--------|
| 1 | SUPER_ADMIN | ok |
| 2 | HOSPITAL_ADMIN (+ AMS, delivery) | ok |
| 3 | DEPARTMENT_ADMIN | ok |
| 4 | SUB_DEPARTMENT_ADMIN | ok |
| 5 | STAFF / Doctor (My Visitors) | ok |
| 6 | SECURITY (scan tabs) | ok |
| 7 | WARD_ADMIN (AMS) | ok |
| 8 | RECEIVING | ok |
| 9 | PURCHASE | ok |
| 10 | DISTRIBUTOR (fleet, wallet, book) | ok |
| 11 | Public visitor registration | ok |
| 12 | Public attendant apply | ok |
| 13 | Home role portals | ok |

### 4.3 `attendant-workflow-browser.spec.ts` — **4/4**

| # | Activity | Result |
|---|----------|--------|
| 01 | Public apply for visit pass | ok |
| 02 | Ward AMS + approve/issue | ok |
| 03 | Security scan UI + entry/exit (USED) | ok |
| 04 | AMS revoke control visible | ok |

### 4.4 `delivery-payment-browser.spec.ts` — **4/4** (~1.3 min, re-run 2026-08-10 ~04:04 IST)

| # | Activity | Result |
|---|----------|--------|
| 01 | Details → Payment amount due | ok |
| 02 | Simulate failure stays on Payment | ok |
| 03 | UPI Pay → Delivery booked | ok |
| 04 | Card Pay → Delivery booked | ok |

### 4.5 `visitor-workflow-browser.spec.ts` — **5/5** (~2.2 min)

| # | Activity | Result |
|---|----------|--------|
| 01 | Without passcode — registration landing + wizard phone step | ok |
| 02 | Without passcode — guest book appointment (slot → Booking Confirmed) | ok |
| 03 | With passcode — doctor My Visitors → Generate passcode | ok |
| 04 | With passcode — security Check-In → verify → handoff URL | ok |
| 05 | With passcode — visitor sign-in + walk-in book → Entry/Exit QR | ok |

---

## 5. Observations

1. All Electronic City demo passwords work after `ensure_user_passwords.py` (`Connitor@123`).
2. AMS is the live attendant UI; legacy “Attendant Passes” heading must not be asserted.
3. Distributor book wizard is Details → dummy Payment; UPI and Card both complete bookings.
4. Attendant checkout QR is returned on the scan API (`exitQrPayload` / `exitQrSignature`); pass closes as `USED`.
5. WhatsApp Meta token is often expired locally — do not rely on WhatsApp in this demo environment.
6. Seeded doctor display name is **AI Doctor Priya** (`priya.nair@connitor-elcity.com`), not “Dr. Priya Nair”.
7. Guest book-appointment stays **PENDING** until the doctor approves. Urgent passcode walk-in is **auto-approved** with dual QR.
8. Security OTP auto-submits on the 6th digit (`onComplete`); do not wait for a second Verify click.

**Branch ID (public links):** `11000000-0000-4000-8000-000000000002` (Electronic City)

---

## 6. Suggestions

1. Add headed e2e for **delivery hold → release** and same-slot exclusive lock.
2. Collapse Hospital Admin AMS sidebar into one AMS group.
3. Replace remaining `networkidle` waits with `data-testid` for faster logins.
4. Refresh WhatsApp token or disable Meta health noise in local `.env`.
5. Demo credentials are seed-only — rotate before staging/production.

---

## 7. How to re-run

```bash
# Terminal A — API
cd python_backend
# activate venv
$env:PYTHONPATH="."
python scripts/seed_ai_profile_users.py --yes
python scripts/ensure_user_passwords.py
uvicorn main:app --reload --port 8002

# Terminal B — Frontend
cd frontend
npm run dev

# Terminal C — All headed e2e
cd frontend
npx playwright test tests/e2e/specs/ai-profiles-browser.spec.ts tests/e2e/specs/ai-full-workflows-browser.spec.ts tests/e2e/specs/delivery-payment-browser.spec.ts tests/e2e/specs/attendant-workflow-browser.spec.ts tests/e2e/specs/visitor-workflow-browser.spec.ts --project=chromium --headed --workers=1 --reporter=list

# Visitor module only (with / without passcode)
npx playwright test tests/e2e/specs/visitor-workflow-browser.spec.ts --project=chromium --headed --workers=1 --reporter=list

# Delivery booking + dummy payment only
npx playwright test tests/e2e/specs/delivery-payment-browser.spec.ts --project=chromium --headed --workers=1 --reporter=list
```

---

## 8. Verdict

**PASS.** All Electronic City logins work. Prior module suites **31/31**; visitor with/without passcode **5/5** (**36 Playwright tests**).  

**Demo-ready:** role navigation, delivery dummy pay, attendant apply → approve → gate entry/exit, visitor guest booking, urgent passcode dual QR.  

**Still manual / not in this run:** delivery hold+notify emails, doctor schedule exclusive booking.
