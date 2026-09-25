/**
 * Headed browser: full UI workflows across AI Electronic City profiles.
 *
 * Run (from frontend/):
 *   npx playwright test tests/e2e/specs/ai-full-workflows-browser.spec.ts --project=chromium --headed --workers=1
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PASSWORD = 'Connitor@123';
const BRANCH_ID = '11000000-0000-4000-8000-000000000002';
const SCREENSHOT_DIR = path.join(__dirname, '../../../test-results/ai-full-workflows');

async function clearAuth(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

async function login(page: Page, email: string, loginPath: string): Promise<void> {
  await page.goto(loginPath);
  await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('AI full browser workflows (Electronic City)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('01 Home portals → role cards visible', async ({ page }) => {
    test.setTimeout(90000);
    await clearAuth(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Hospital Admin|Security|Distributor/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '01-home-portals');
  });

  test('02 SUPER_ADMIN login + hospital chains', async ({ page }) => {
    test.setTimeout(120000);
    await clearAuth(page);
    await login(page, 'superadmin@hvts.com', '/auth/login?role=SUPER_ADMIN');
    await page.waitForURL(/\/dashboard\/?/, { timeout: 30000 });
    await shot(page, '02-super-admin-dashboard');
    await page.goto('/dashboard/hospital-chains');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await shot(page, '02-super-admin-chains');
  });

  test('03 HOSPITAL_ADMIN login + delivery + AMS pages', async ({ page }) => {
    test.setTimeout(120000);
    await clearAuth(page);
    await login(page, 'hospital.admin@connitor-elcity.com', '/auth/login?role=HOSPITAL_ADMIN');
    await page.waitForURL(/\/dashboard\/?/, { timeout: 30000 });
    await shot(page, '03-hospital-admin-home');
    await page.goto('/dashboard/delivery');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await shot(page, '03-hospital-admin-delivery');
    await page.goto('/dashboard/ams');
    await expect(page.getByRole('heading', { name: /Dashboard|AMS|Attendant/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '03-hospital-admin-ams');
    await page.goto('/dashboard/delivery-slots');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await shot(page, '03-hospital-admin-delivery-slots');
  });

  test('04 DEPT / SUBDEPT / STAFF dashboards', async ({ page }) => {
    test.setTimeout(180000);
    for (const [role, email] of [
      ['DEPARTMENT_ADMIN', 'dept.admin@connitor-elcity.com'],
      ['SUB_DEPARTMENT_ADMIN', 'subdept.admin@connitor-elcity.com'],
      ['STAFF', 'priya.nair@connitor-elcity.com'],
    ] as const) {
      await clearAuth(page);
      await login(page, email, `/auth/login?role=${role === 'STAFF' ? 'STAFF' : role}`);
      await page.waitForURL(/\/dashboard\/?/, { timeout: 30000 });
      await shot(page, `04-${role}-home`);
    }
    await page.goto('/dashboard/my-visitors');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await shot(page, '04-STAFF-my-visitors');
  });

  test('05 DISTRIBUTOR opens book wizard + payment step UI', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await login(page, 'distributor@citygen.demo', '/auth/login?role=DISTRIBUTOR');
    await page.waitForURL(/\/vendor\/deliveries/, { timeout: 30000 });
    await shot(page, '05-distributor-list');

    await page.goto('/vendor/deliveries/book');
    await expect(page.getByText(/Delivery booking|Details|Payment/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '05-distributor-book-details');

    // Single-page Details form (packages + vehicle) — open hospital select if present
    const hospital = page.getByText(/Hospital/i).first();
    await expect(hospital).toBeVisible({ timeout: 10000 });
    const continueBtn = page.getByRole('button', { name: /Continue to payment/i });
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    // Button may stay disabled until form complete — assert wizard labels only
    await expect(page.getByText(/Base Fee|Total|Vehicle Type|Packages/i).first()).toBeVisible({
      timeout: 10000,
    });
    await shot(page, '05-distributor-fee-preview');
  });

  test('06 PURCHASE opens delivery ops', async ({ page }) => {
    test.setTimeout(90000);
    await clearAuth(page);
    await login(page, 'purchase@connitor-elcity.com', '/auth/login');
    await page.waitForURL(/\/dashboard\/delivery/, { timeout: 30000 });
    await shot(page, '06-purchase-delivery');
  });

  test('07 RECEIVING board loads docks + queue', async ({ page }) => {
    test.setTimeout(90000);
    await clearAuth(page);
    await login(page, 'receiving@connitor-elcity.com', '/auth/login');
    await page.waitForURL(/\/dashboard\/receiving/, { timeout: 30000 });
    await expect(page.getByText(/Receiving board|At gate|At dock/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '07-receiving-board');
  });

  test('08 SECURITY dashboard tabs including deliveries hold UI', async ({ page }) => {
    test.setTimeout(120000);
    await clearAuth(page);
    await login(page, 'security@connitor-elcity.com', '/auth/login?role=SECURITY');
    await page.waitForURL(/\/security\/dashboard/, { timeout: 30000 });
    await shot(page, '08-security-home');

    await page.goto('/security/dashboard?tab=delivery-scan');
    await expect(page.getByText(/Scan delivery QR|Validate QR|delivery/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '08-security-delivery-scan');

    await page.goto('/security/dashboard?tab=deliveries');
    await expect(page.getByText(/Scheduled deliveries|Put on hold|No scheduled/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '08-security-today-deliveries');

    await page.goto('/security/dashboard?tab=attendant-scan');
    await expect(page.getByText(/attendant|government|govt|scan/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '08-security-attendant-scan');

    await page.goto('/security/dashboard?tab=appointments');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await shot(page, '08-security-appointments');
  });

  test('09 WARD_ADMIN AMS dashboard + register page', async ({ page }) => {
    test.setTimeout(120000);
    await clearAuth(page);
    await login(page, 'ward.admin@connitor-elcity.com', '/auth/login?role=WARD_ADMIN');
    await page.waitForURL(/\/dashboard\/(ams|attendant-passes)/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Dashboard|AMS|Attendant|Register/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '09-ward-ams-dashboard');

    await page.goto('/dashboard/ams/register');
    await expect(page.getByText(/Register|Patient|Attendant|MRN/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '09-ward-ams-register');

    await page.goto(`/attendant-pass/apply?branchId=${BRANCH_ID}`);
    await expect(page.getByText(/MRN|Look up|Attendant|Apply/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '09-public-attendant-apply');
  });

  test('10 Public visitor registration landing', async ({ page }) => {
    test.setTimeout(60000);
    await clearAuth(page);
    await page.goto(`/visitor-registration?branchId=${BRANCH_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await shot(page, '10-visitor-registration');
  });
});
