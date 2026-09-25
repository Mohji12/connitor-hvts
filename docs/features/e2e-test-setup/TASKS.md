# Tasks: E2E Testing Setup

**Reference:** `docs/features/e2e-test-setup/specs/architecture.md`

## 1. Backend Configuration & Security
**Goal:** Enable a secure way to toggle "Test Mode" that allows mocking but is strictly disabled in production.
**Complexity:** Small (S)
**Dependencies:** None

- [ ] **Define Env Vars:** Add `TEST_MODE` and `E2E_FIXED_OTP` to `backend/.env` and `backend/.env.example`.
- [ ] **Implement Guard:** Create `isTestModeEnabled()` helper method (likely in `ConfigService` or a util) that returns `false` if `NODE_ENV === 'production'`, regardless of the `TEST_MODE` var.
- [ ] **Acceptance:** 
    - `TEST_MODE=true` in `.env` is readable.
    - `isTestModeEnabled()` returns `false` if explicitly tested with `NODE_ENV=production`.

## 2. Service Mocking (Auth & Messaging)
**Goal:** Bypass external SMS/WhatsApp APIs and use fixed OTPs during tests to ensure determinism and save costs.
**Complexity:** Medium (M)
**Dependencies:** Task 1

- [ ] **AuthService:** Update `login` method to check `isTestModeEnabled()`. If true, bypass RNG and use `E2E_FIXED_OTP`.
- [ ] **SmsService:** Update `sendOtp` (or equivalent) to check `isTestModeEnabled()`. If true, log the OTP to stdout and skip SNS call.
- [ ] **WhatsAppService:** Update `sendMessage` to check `isTestModeEnabled()`. If true, log intent and return success without calling Meta API.
- [ ] **Acceptance:**
    - Login with `E2E_FIXED_OTP` works when `TEST_MODE=true`.
    - No network requests are made to AWS/Meta during this flow.

## 3. Deterministic Database Seeding
**Goal:** Ensure specific Users and Chains exist with known UUIDs so Playwright tests can reference them directly.
**Complexity:** Small (S)
**Dependencies:** None (can be parallel with 1 & 2)

- [ ] **Update Data:** Modify `backend/prisma/data.ts` to use fixed UUIDs for:
    - Super Admin, Chain Admin, Branch Admin, Staff, Security.
    - Hospital Chains (Apollo, Fortis, Max).
- [ ] **Update Seeder:** Ensure `backend/prisma/seed.ts` (or `index.ts`) respects these IDs during upsert.
- [ ] **Acceptance:**
    - Running `npm run prisma:seed` results in the specific UUIDs (e.g., `1111...` for Super Admin) existing in the DB.

## 4. Frontend Playwright Infrastructure
**Goal:** Initialize and configure the testing framework in the Frontend application.
**Complexity:** Small (S)
**Dependencies:** None

- [ ] **Install:** Run `npm init playwright@latest` in `frontend/`.
- [ ] **Config:** Update `frontend/playwright.config.ts`:
    - Set base URL to `http://localhost:3000` (or env var).
    - Configure for CI (headless) vs Local (headed) behavior.
- [ ] **Scripts:** Add `test:e2e`, `test:e2e:ui`, `test:e2e:headed` to `frontend/package.json`.
- [ ] **Acceptance:**
    - `npm run test:e2e` runs (even if no tests exist yet or it fails, the runner should start).

## 5. E2E Smoke Test (Login Flow)
**Goal:** Verify the system works end-to-end (Backend + Frontend) using the mocked setup.
**Complexity:** Medium (M)
**Dependencies:** Task 2, 3, 4

- [ ] **Fixtures:** Create `frontend/tests/e2e/fixtures/test-users.ts` with the fixed data from Task 3.
- [ ] **Auth Helpers:** Create `frontend/tests/e2e/utils/auth-helpers.ts` for reusable login logic.
- [ ] **UI Hooks:** Add `data-testid` attributes to the Login Page (phone input, submit button, OTP input).
- [ ] **Spec:** Write `frontend/tests/e2e/specs/auth/login.spec.ts`.
    - Scenario: Enter fixed phone -> Receive fixed OTP (mock) -> Enter fixed OTP -> Verify redirect/dashboard.
- [ ] **Acceptance:**
    - Test passes reliably locally.
