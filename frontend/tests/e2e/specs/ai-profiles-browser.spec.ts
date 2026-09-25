/**
 * Headed browser e2e: log in as every AI profile and smoke their home dashboards.
 *
 * Run (from frontend/):
 *   npx playwright test tests/e2e/specs/ai-profiles-browser.spec.ts --project=chromium --headed --workers=1
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PASSWORD = 'Connitor@123';
const SCREENSHOT_DIR = path.join(__dirname, '../../../test-results/ai-profiles');

type Profile = {
  role: string;
  email: string;
  loginPath: string;
  expectUrl: RegExp;
  extraPaths?: Array<{ path: string; assert?: RegExp | string }>;
};

const PROFILES: Profile[] = [
  {
    role: 'SUPER_ADMIN',
    email: 'superadmin@hvts.com',
    loginPath: '/auth/login/?role=SUPER_ADMIN',
    expectUrl: /\/dashboard\/?/,
    extraPaths: [{ path: '/dashboard/hospital-chains/', assert: /hospital|chain/i }],
  },
  {
    role: 'HOSPITAL_ADMIN',
    email: 'hospital.admin@connitor-elcity.com',
    loginPath: '/auth/login/?role=HOSPITAL_ADMIN',
    expectUrl: /\/dashboard\/?/,
    extraPaths: [
      { path: '/dashboard/ams/', assert: /AMS|Attendant|Statistics|Dashboard/i },
      { path: '/dashboard/ams/register/', assert: /Register|Patient|Attendant/i },
      { path: '/dashboard/ams/active/', assert: /Active/i },
      { path: '/dashboard/ams/settings/', assert: /Setting|policy|Policy/i },
      { path: '/dashboard/delivery/' },
    ],
  },
  {
    role: 'DEPARTMENT_ADMIN',
    email: 'dept.admin@connitor-elcity.com',
    loginPath: '/auth/login/?role=DEPARTMENT_ADMIN',
    expectUrl: /\/dashboard\/?/,
  },
  {
    role: 'SUB_DEPARTMENT_ADMIN',
    email: 'subdept.admin@connitor-elcity.com',
    loginPath: '/auth/login/?role=SUB_DEPARTMENT_ADMIN',
    expectUrl: /\/dashboard\/?/,
  },
  {
    role: 'STAFF',
    email: 'priya.nair@connitor-elcity.com',
    loginPath: '/auth/login/?role=STAFF',
    expectUrl: /\/dashboard\/?/,
    extraPaths: [{ path: '/dashboard/my-visitors/' }],
  },
  {
    role: 'SECURITY',
    email: 'security@connitor-elcity.com',
    loginPath: '/auth/login/?role=SECURITY',
    expectUrl: /\/security\/dashboard/,
    extraPaths: [
      { path: '/security/dashboard/?tab=delivery-scan' },
      { path: '/security/dashboard/?tab=attendant-scan' },
      { path: '/security/dashboard/?tab=appointments' },
    ],
  },
  {
    role: 'WARD_ADMIN',
    email: 'ward.admin@connitor-elcity.com',
    loginPath: '/auth/login/?role=WARD_ADMIN',
    expectUrl: /\/dashboard\/(ams|attendant-passes)/,
    extraPaths: [
      { path: '/dashboard/ams/', assert: /AMS|Statistics|Dashboard/i },
      { path: '/dashboard/ams/register/', assert: /Register/i },
      { path: '/dashboard/ams/shift-change/', assert: /Shift/i },
    ],
  },
  {
    role: 'RECEIVING',
    email: 'receiving@connitor-elcity.com',
    loginPath: '/auth/login/',
    expectUrl: /\/dashboard\/receiving/,
  },
  {
    role: 'PURCHASE',
    email: 'purchase@connitor-elcity.com',
    loginPath: '/auth/login/',
    expectUrl: /\/dashboard\/delivery/,
  },
  {
    role: 'DISTRIBUTOR',
    email: 'distributor@citygen.demo',
    loginPath: '/auth/login/?role=DISTRIBUTOR',
    expectUrl: /\/vendor\/deliveries/,
    extraPaths: [
      { path: '/vendor/fleet/' },
      { path: '/vendor/wallet/' },
      { path: '/vendor/deliveries/book/' },
    ],
  },
];

async function clearAuth(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

async function loginWithPassword(page: Page, email: string, loginPath: string): Promise<void> {
  await page.goto(loginPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(PASSWORD);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login-password') && res.request().method() === 'POST',
    { timeout: 30000 },
  );
  await page.getByTestId('login-submit').click();
  const res = await loginResponse;
  expect(res.status(), `login failed for ${email}`).toBe(200);
}

test.describe('AI profiles browser walkthrough (Electronic City)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  for (const profile of PROFILES) {
    test(`${profile.role} — login and navigate home`, async ({ page }) => {
      test.setTimeout(180000);
      await clearAuth(page);
      await loginWithPassword(page, profile.email, profile.loginPath);

      await page.waitForURL(profile.expectUrl, { timeout: 45000 });
      await expect(page).toHaveURL(profile.expectUrl);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${profile.role}-home.png`),
      });

      for (const extra of profile.extraPaths ?? []) {
        await page.goto(extra.path, { waitUntil: 'domcontentloaded' });
        await expect(page).not.toHaveURL(/\/auth\/login/);
        if (typeof extra.assert === 'string') {
          await expect(page.getByText(extra.assert, { exact: false }).first()).toBeVisible({
            timeout: 20000,
          });
        } else if (extra.assert instanceof RegExp) {
          await expect(page.locator('body')).toContainText(extra.assert, { timeout: 20000 });
        }
        await page.screenshot({
          path: path.join(
            SCREENSHOT_DIR,
            `${profile.role}-${extra.path.replace(/[/?=&]/g, '_')}.png`,
          ),
        });
      }
    });
  }

  test('Public visitor registration landing opens', async ({ page }) => {
    test.setTimeout(90000);
    await clearAuth(page);
    await page.goto(
      '/visitor-registration/?branchId=11000000-0000-4000-8000-000000000002',
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'PUBLIC-visitor-registration.png'),
    });
  });

  test('Public attendant apply page opens', async ({ page }) => {
    test.setTimeout(90000);
    await clearAuth(page);
    await page.goto('/attendant-pass/apply/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/attendant|admission|MRN|apply/i).first()).toBeVisible({
      timeout: 20000,
    });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'PUBLIC-attendant-apply.png'),
    });
  });

  test('Home role portals grid is visible', async ({ page }) => {
    test.setTimeout(90000);
    await clearAuth(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'HOME-portals.png'),
    });
  });
});
