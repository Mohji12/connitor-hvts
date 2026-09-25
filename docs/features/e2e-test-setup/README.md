# E2E Testing Strategy - Completed

## ✅ Feature Status: COMPLETED

The End-to-End (E2E) testing infrastructure has been successfully implemented using **Playwright**, with a robust backend "Test Mode" that handles OTPs and notification mocking.

---

## 1. Architecture Overview

### A. Backend Test Mode
To bypass real-world friction (SMS/WhatsApp costs, random OTPs), we implemented a `TEST_MODE` flag in the backend.

- **Environment Variable:** `TEST_MODE=true`
- **Fixed OTP:** In test mode, `AuthService` always generates `123456` (configurable via `E2E_FIXED_OTP`).
- **Mocked Notifications:** `SmsService` and `WhatsappService` log messages to the console (`[TEST_MODE] Sending...`) instead of calling AWS/Meta APIs.
- **Safety Guard:** Test mode is **strictly disabled** if `NODE_ENV=production`.

### B. Deterministic Seeding
Tests need reliable data. We updated the seed logic to use **Hardcoded UUIDs** for key actors.

| Role | Name | Phone | UUID |
|:---|:---|:---|:---|
| **Super Admin** | Sushobhit Kundra | `6987456321` | `11111111-1111-1111-1111-111111111111` |
| **Chain Admin** | Rajesh Kumar (Apollo) | `8482022111` | `22222222-2222-2222-2222-222222222222` |
| **Branch Admin** | Anil Patel (Chennai) | `7980427511` | `33333333-3333-3333-3333-333333333333` |
| **Staff** | Dr. Arjun Desai | `7003636111` | `88888888-8888-8888-8888-888888888888` |
| **Security** | Rameshwar Tiwari | `9883578111` | `99999999-9999-9999-9999-999999999999` |

### C. Playwright Setup
Located in `frontend/tests/e2e/`.

- **Config:** `playwright.config.ts` (Runs on localhost:3000)
- **Fixtures:** `frontend/tests/e2e/fixtures/test-users.ts` (Matches the UUIDs above)
- **Helpers:** `frontend/tests/e2e/utils/auth-helpers.ts` (Reusable `loginAs` function)
- **Specs:** `frontend/tests/e2e/specs/auth/login.spec.ts` (Smoke test)

---

## 2. How to Run E2E Tests

### Step 1: Start Backend (Test Mode)
In terminal 1:
```bash
cd backend
export TEST_MODE=true
export E2E_FIXED_OTP=123456  # Optional, defaults to 123456
npm run start:dev
```

### Step 2: Start Frontend
In terminal 2:
```bash
cd frontend
npm run dev
```

### Step 3: Run Tests
In terminal 3:
```bash
cd frontend
# Run all tests (headless)
npm run test:e2e

# Run with UI (good for debugging)
npm run test:e2e:ui
```

---

## 3. Implementation Details

### Files Created/Modified
- **Backend:**
  - `src/config/app-config.service.ts`: Central logic for Test Mode.
  - `src/auth/auth.service.ts`: OTP bypassing.
  - `src/messaging/sms.service.ts`: AWS SNS mocking.
  - `src/messaging/whatsapp.service.ts`: Meta API mocking.
  - `prisma/data.ts` & `seed.ts`: Deterministic data.

- **Frontend:**
  - `playwright.config.ts`
  - `tests/e2e/` (specs, fixtures, utils)
  - `package.json`: Added test scripts.

### Security
- The system includes a strict check: `if (nodeEnv === 'production' && testMode) throw Error`. This prevents accidental deployment of the test bypass.

---

## 4. Next Steps
- Write tests for Visitor Check-in flow.
- Write tests for Gate Pass approval flow.
- Add CI/CD pipeline integration.
