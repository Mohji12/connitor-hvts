# Specification: Frontend Playwright Infrastructure (Task 4)

This document specifies the setup and configuration of Playwright for end-to-end (E2E) testing of the Next.js frontend.

## 1. Overview
Playwright will provide cross-browser testing capabilities for the Hospital Visitor Tracking System. The infrastructure is designed to be deterministic, leveraging a backend "Test Mode" for authentication (Fixed OTP) and mocking external services.

## 2. Installation Commands
Run these commands from the root directory to initialize Playwright in the `frontend/` directory.

```bash
# Navigate to frontend
cd frontend

# Initialize Playwright (Non-interactive)
npm init playwright@latest -- --yes --quiet --browser=chromium --browser=firefox --browser=webkit --install-deps

# Verify installation
npx playwright --version
```

## 3. Directory Structure
All E2E testing artifacts must reside in `frontend/tests/e2e/`.

```text
frontend/
├── playwright.config.ts          # Main configuration
├── .gitignore                    # Updated to include playwright artifacts
├── package.json                  # Scripts added
├── tests/
│   └── e2e/
│       ├── fixtures/
│       │   ├── test-users.ts     # Constants matching backend seed data
│       │   └── base.ts           # Extended test with custom fixtures
│       ├── specs/
│       │   ├── auth/
│       │   │   └── login.spec.ts    # First smoke test
│       │   └── visitors/
│       │       └── check-in.spec.ts # Placeholder for visitor flow
│       └── utils/
│           └── auth-helpers.ts   # Reusable login/logout functions
```

## 4. playwright.config.ts
**File Path:** `frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
```

## 5. package.json Scripts
**File Path:** `frontend/package.json`

Add these scripts to the `scripts` section:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "npx playwright show-report"
  }
}
```

## 6. Data Models & Constants

### 6.1 Test User Constants
**File Path:** `frontend/tests/e2e/fixtures/test-users.ts`

```typescript
export const TEST_USERS = {
  SUPER_ADMIN: {
    id: '11111111-1111-1111-1111-111111111111',
    phone: '6987456321',
    name: 'Sushobhit Kundra',
    role: 'SUPER_ADMIN',
  },
  CHAIN_ADMIN: {
    id: '22222222-2222-2222-2222-222222222222',
    phone: '8482022111',
    name: 'Rajesh Kumar',
    role: 'CHAIN_ADMIN',
  },
  STAFF: {
    id: '44444444-4444-4444-4444-444444444444',
    phone: '7003636111',
    name: 'Dr. Arjun Desai',
    role: 'STAFF',
  },
  SECURITY: {
    id: '55555555-5555-5555-5555-555555555555',
    phone: '9883578111',
    name: 'Rameshwar Tiwari',
    role: 'SECURITY',
  },
} as const;

export const E2E_FIXED_OTP = '123456';
```

## 7. Pseudo-Code / Logic

### 7.1 Reusable Login Helper
**File Path:** `frontend/tests/e2e/utils/auth-helpers.ts`

```typescript
/**
 * Logic:
 * 1. Navigate to /login
 * 2. Fill phone number input
 * 3. Click 'Send OTP'
 * 4. Wait for OTP input field to appear
 * 5. Fill fixed OTP (123456)
 * 6. Click 'Verify'
 * 7. Assert navigation to dashboard/home
 */
export async function loginAs(page: Page, phone: string, otp: string = '123456') {
  await page.goto('/login');
  await page.getByLabel(/phone/i).fill(phone);
  await page.getByRole('button', { name: /send otp/i }).click();
  
  // Wait for OTP field
  const otpInput = page.getByLabel(/otp/i);
  await expect(otpInput).toBeVisible();
  await otpInput.fill(otp);
  
  await page.getByRole('button', { name: /verify/i }).click();
  
  // Assert successful login (e.g., URL change or dashboard presence)
  await expect(page).toHaveURL(/dashboard|home/);
}
```

### 7.2 Custom Fixture (base.ts)
**File Path:** `frontend/tests/e2e/fixtures/base.ts`

```typescript
import { test as base } from '@playwright/test';
import { TEST_USERS } from './test-users';
import { loginAs } from '../utils/auth-helpers';

type MyFixtures = {
  superAdminPage: Page;
  staffPage: Page;
};

export const test = base.extend<MyFixtures>({
  superAdminPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.SUPER_ADMIN.phone);
    await use(page);
  },
  staffPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.STAFF.phone);
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

## 8. Environment Variables
Defined in `frontend/.env.test` (or `frontend/.env`):

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | Target URL for tests |
| `CI` | `false` | Set to `true` in GitHub Actions |

## 9. .gitignore Updates
Add these entries to `frontend/.gitignore`:

```text
# Playwright
test-results/
playwright-report/
blob-report/
playwright/.cache/
```

## 10. CI Configuration Example (GitHub Actions)
Snippet for `.github/workflows/e2e.yml`:

```yaml
- name: Run Playwright tests
  run: npm run test:e2e
  working-directory: frontend
  env:
    PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL }}
    NODE_ENV: test
    TEST_MODE: true
    E2E_FIXED_OTP: "123456"
```

## 11. Test Cases

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Success Login** | Enter valid phone + fixed OTP | Redirect to Dashboard, User name visible |
| **Invalid OTP** | Enter valid phone + wrong OTP | Error message displayed, stays on login page |
| **Unauthorized Access** | Try to access `/dashboard` without login | Redirected to `/login` |
| **RBAC Check** | Login as Staff, try to access `/admin/chains` | Redirected or "Access Denied" shown |

## 12. Acceptance Criteria
1. `npm run test:e2e` executes without configuration errors.
2. Artifacts (reports, screenshots) are stored in `frontend/playwright-report/` and `frontend/test-results/`.
3. Tests run in Chromium, Firefox, and Webkit as configured.
4. `auth-helpers.ts` correctly automates the OTP login flow.
5. Directory structure matches the specification exactly.
