# Technical Specification: E2E Smoke Test - Login Flow

**File Path:** `docs/features/e2e-test-setup/specs/login-smoke-test.spec.md`

## 1. Overview
This specification defines the E2E smoke test for the authentication login flow. The test ensures that a user can successfully log in using a phone number and a fixed OTP (provided by the backend test mode). It covers the happy path and basic error scenarios.

**Dependencies:**
- Backend running in `test` mode (Fixed OTP: `123456`).
- Database seeded with deterministic test users.
- Playwright E2E framework initialized in `frontend/tests/e2e`.

---

## 2. Data Models & Fixtures

### Test User Interface
**File Path:** `frontend/tests/e2e/fixtures/test-users.ts`

```typescript
export interface TestUser {
  name: string;
  phoneNumber: string;
  role: 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'RECEPTIONIST' | 'VISITOR';
  description: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  RECEPTIONIST_USER: {
    name: 'Test Receptionist',
    phoneNumber: '9876543210',
    role: 'RECEPTIONIST',
    description: 'Standard receptionist user from seed data'
  },
  INVALID_USER: {
    name: 'Non-existent User',
    phoneNumber: '0000000000',
    role: 'VISITOR',
    description: 'Phone number not in database'
  }
};

export const E2E_FIXED_OTP = '123456';
```

---

## 3. Auth Helper Functions

**File Path:** `frontend/tests/e2e/utils/auth-helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';
import { TestUser, E2E_FIXED_OTP } from '../fixtures/test-users';

/**
 * Performs a full login flow for a given test user.
 * @param page Playwright Page object
 * @param user TestUser fixture
 * @param otp Optional OTP (defaults to E2E_FIXED_OTP)
 */
export async function loginAsUser(page: Page, user: TestUser, otp: string = E2E_FIXED_OTP) {
  // 1. Navigate to login
  await page.goto('/login');

  // 2. Enter Phone Number
  await page.getByTestId('phone-input').fill(user.phoneNumber);
  await page.getByTestId('login-submit').click();

  // 3. Enter OTP
  // Wait for OTP field to be visible (transition from phone entry)
  await expect(page.getByTestId('otp-input')).toBeVisible({ timeout: 5000 });
  await page.getByTestId('otp-input').fill(otp);
  await page.getByTestId('otp-submit').click();
}
```

---

## 4. Required UI Hooks (data-testid)

The following `data-testid` attributes must be added to the React components in the login flow:

| Element | Description | Component/File |
| :--- | :--- | :--- |
| `phone-input` | Input field for phone number | `src/app/login/page.tsx` |
| `login-submit` | Button to request OTP | `src/app/login/page.tsx` |
| `otp-input` | Input field for 6-digit OTP | `src/app/login/page.tsx` |
| `otp-submit` | Button to verify OTP | `src/app/login/page.tsx` |
| `login-error` | Container for error messages | `src/app/login/page.tsx` |
| `dashboard-container` | Main wrapper of the dashboard | `src/app/dashboard/layout.tsx` |

---

## 5. Login Spec Test Cases

### Happy Path: Valid phone + valid OTP
- **Description:** Verify successful login and redirection to dashboard.
- **Input:** `TEST_USERS.RECEPTIONIST_USER.phoneNumber`, `E2E_FIXED_OTP`.
- **Expected Result:** Redirected to `/dashboard`, user name/role visible.

### Error: Invalid phone number
- **Description:** Verify error message when phone number is not registered.
- **Input:** `TEST_USERS.INVALID_USER.phoneNumber`.
- **Expected Result:** Error message "User not found" or similar is visible.

### Error: Invalid OTP
- **Description:** Verify error message when an incorrect OTP is entered.
- **Input:** `TEST_USERS.RECEPTIONIST_USER.phoneNumber`, OTP: `999999`.
- **Expected Result:** Error message "Invalid OTP" is visible, remains on OTP screen.

### Error: Expired OTP
- **Description:** Verify handling of expired codes (simulated via backend or delay if possible).
- **Note:** In `test` mode with fixed OTP, this might require a specific "expired" phone number if implemented in Task 2.

---

## 6. Playwright Test Structure

**File Path:** `frontend/tests/e2e/specs/auth/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { TEST_USERS, E2E_FIXED_OTP } from '../../fixtures/test-users';
import { loginAsUser } from '../../utils/auth-helpers';

test.describe('Authentication: Login Smoke Test', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state
    await page.goto('/');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const user = TEST_USERS.RECEPTIONIST_USER;
    
    await loginAsUser(page, user, E2E_FIXED_OTP);

    // Assertions
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByTestId('dashboard-container')).toBeVisible();
    // Optional: Check for user name in header
    // await expect(page.locator('header')).toContainText(user.name);
  });

  test('should show error for unregistered phone number', async ({ page }) => {
    const user = TEST_USERS.INVALID_USER;

    await page.goto('/login');
    await page.getByTestId('phone-input').fill(user.phoneNumber);
    await page.getByTestId('login-submit').click();

    // Check for error toast or message
    const errorMsg = page.getByTestId('login-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/not found|invalid/i);
  });

  test('should show error for incorrect OTP', async ({ page }) => {
    const user = TEST_USERS.RECEPTIONIST_USER;
    const wrongOtp = '000000';

    await page.goto('/login');
    await page.getByTestId('phone-input').fill(user.phoneNumber);
    await page.getByTestId('login-submit').click();

    await page.getByTestId('otp-input').fill(wrongOtp);
    await page.getByTestId('otp-submit').click();

    const errorMsg = page.getByTestId('login-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/invalid/i);
  });
});
```

---

## 7. Assertions
1.  **URL Redirection:** Check that `page.url()` contains `/dashboard`.
2.  **State Visibility:** Ensure the dashboard shell is rendered.
3.  **Error Feedback:** Ensure elements with `data-testid="login-error"` appear on failures.
4.  **Button States:** Verify submit buttons become disabled/loading during requests (optional but recommended).

---

## 8. Cleanup / Teardown
- No specific browser cleanup needed as Playwright handles context isolation.
- If tokens are stored in `localStorage`, they are cleared between tests by default Playwright config.
- No DB cleanup required per test since we are using read-only smoke tests for existing seed data.

---

## 9. CI Considerations
- **Timeout:** Set global timeout to 30s.
- **Headless Mode:** Tests must pass in headless mode.
- **Environment Variables:** Ensure `BASE_URL` is set to the frontend URL (e.g., `http://localhost:3000`).
- **Dependencies:** Backend must be up with `NODE_ENV=test` before running tests.

---

## 10. Acceptance Criteria
1.  `test-users.ts` exports `TEST_USERS` with the correct schema.
2.  `auth-helpers.ts` provides a reusable `loginAsUser` function.
3.  `login.spec.ts` contains at least 3 tests (Happy path, Invalid Phone, Invalid OTP).
4.  All tests pass against a running dev environment with seed data.
5.  All UI elements used in tests have the corresponding `data-testid`.
