/**
 * Headed e2e: distributor delivery dummy payment (Details → Payment → Pay / fail).
 *
 * Run (from frontend/):
 *   npx playwright test tests/e2e/specs/delivery-payment-browser.spec.ts --project=chromium --headed --workers=1
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PASSWORD = 'Connitor@123';
const DISTRIBUTOR_EMAIL = 'distributor@citygen.demo';
const HOSPITAL_ADMIN_EMAIL = 'hospital.admin@connitor-elcity.com';
const API = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8002';
const SCREENSHOT_DIR = path.join(__dirname, '../../../test-results/delivery-payment');

async function clearAuth(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(`${API}/api/auth/login-password`, {
    data: { email, password: PASSWORD },
  });
  expect(res.ok(), `login ${email}`).toBeTruthy();
  const body = await res.json();
  const token = body.accessToken || body.access_token || body.token;
  expect(token).toBeTruthy();
  return token as string;
}

async function ensureDeliveryWindow(request: APIRequestContext): Promise<void> {
  const token = await apiLogin(request, HOSPITAL_ADMIN_EMAIL);
  const me = await request.get(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(me.ok()).toBeTruthy();
  const user = await me.json();
  const branchId = user.branchId as string;
  expect(branchId).toBeTruthy();

  // Approve demo distributor so DUMMY payment booking is allowed
  const vendors = await request.get(`${API}/api/delivery/distributors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(vendors.ok()).toBeTruthy();
  const vendorsBody = await vendors.json();
  const vendorList = (
    Array.isArray(vendorsBody) ? vendorsBody : vendorsBody.items || []
  ) as Array<{ id: string; email?: string; vendorName?: string }>;
  const demo =
    vendorList.find((v) => (v.email || '').toLowerCase() === DISTRIBUTOR_EMAIL) ||
    vendorList.find((v) => /citygen/i.test(v.vendorName || ''));
  expect(demo?.id, 'demo distributor').toBeTruthy();
  const verify = await request.post(`${API}/api/delivery/distributors/${demo!.id}/verification`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'APPROVED' },
  });
  expect(verify.ok(), await verify.text()).toBeTruthy();

  // Allow unscheduled so booking does not depend on slot inventory
  await request.put(`${API}/api/delivery/branch-settings/${branchId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { allowUnscheduledDeliveries: true },
  });

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateIso = `${y}-${m}-${d}`;

  await request.post(`${API}/api/delivery/branches/${branchId}/slots`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      startDate: dateIso,
      endDate: dateIso,
      slotMinutes: 120,
      mode: 'windows',
      windows: [{ start: '09:00', end: '18:00' }],
    },
  });
}

async function loginDistributor(page: Page): Promise<void> {
  await page.goto('/auth/login?role=DISTRIBUTOR');
  await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('email-input').fill(DISTRIBUTOR_EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/vendor\/deliveries/, { timeout: 30000 });
}

async function openFirstComboboxOption(page: Page, combobox: ReturnType<Page['getByRole']>): Promise<void> {
  await combobox.click();
  const option = page.getByRole('option').first();
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.click();
}

async function fillDetailsForPayment(page: Page): Promise<void> {
  await page.goto('/vendor/deliveries/book');
  await expect(page.getByRole('heading', { name: /Book delivery/i })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText('Delivery booking')).toBeVisible({ timeout: 10000 });

  // Hospital (first combobox)
  await openFirstComboboxOption(page, page.getByRole('combobox').nth(0));

  // Prefer unscheduled when available
  const unscheduled = page.locator('#unscheduled');
  await page.waitForTimeout(800);
  if (await unscheduled.isVisible().catch(() => false)) {
    await unscheduled.check();
    const eta = page.locator('input[type="datetime-local"]').first();
    await expect(eta).toBeVisible({ timeout: 5000 });
    const when = new Date();
    when.setHours(when.getHours() + 3);
    const pad = (n: number) => String(n).padStart(2, '0');
    await eta.fill(
      `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`,
    );
  } else {
    // Delivery window combobox (after hospital + vehicle type)
    await openFirstComboboxOption(page, page.getByRole('combobox').nth(2));
  }

  await page.getByRole('radio', { name: /New vehicle/i }).check();
  await page.getByPlaceholder('KA01AB1234').fill(`E2E${Date.now().toString().slice(-6)}`);

  await page.getByRole('radio', { name: /New driver/i }).check();
  // Labels are not htmlFor-linked — use the textbox in the same field group as the label
  await page
    .getByText('Driver Name', { exact: true })
    .locator('..')
    .getByRole('textbox')
    .fill('E2E Payment Driver');
  await page
    .getByText('Driver Mobile', { exact: true })
    .locator('..')
    .getByRole('textbox')
    .fill('9876501234');

  await page.getByPlaceholder('Purchase Order Number').fill(`PO-E2E-${Date.now().toString().slice(-5)}`);

  const continueBtn = page.getByRole('button', { name: /Continue to payment/i });
  await expect(continueBtn).toBeEnabled({ timeout: 20000 });
  await continueBtn.click();
  // CardTitle is not a heading role — assert payment step copy instead
  await expect(page.getByText(/Demo payment only/i)).toBeVisible({ timeout: 15000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('Distributor dummy payment e2e', () => {
  test.beforeAll(async ({ request }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await ensureDeliveryWindow(request);
  });

  test('01 Details → Payment step shows amount due', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await loginDistributor(page);
    await fillDetailsForPayment(page);

    await expect(page.getByText(/Demo payment only/i)).toBeVisible();
    await expect(page.getByText(/Amount due/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Pay ₹/i })).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-payment-step.png'),
      fullPage: true,
    });
  });

  test('02 Simulate failure keeps user on Payment', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await loginDistributor(page);
    await fillDetailsForPayment(page);

    await page.getByLabel(/UPI ID/i).fill('e2e@upi');
    await page.getByRole('button', { name: /Simulate failure/i }).click();
    await expect(page.getByText(/Payment failed|simulated/i).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Demo payment only/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-simulate-failure.png'),
      fullPage: true,
    });
  });

  test('03 UPI Pay succeeds and books delivery', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await loginDistributor(page);
    await fillDetailsForPayment(page);

    await page.getByLabel(/UPI ID/i).fill('e2e.pay@oksbi');
    await page.getByRole('button', { name: /Pay ₹/i }).click();

    await expect(page.getByRole('heading', { name: /Delivery booked/i })).toBeVisible({
      timeout: 90000,
    });
    await expect(page.getByText(/Reference:/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-pay-success.png'),
      fullPage: true,
    });
  });

  test('04 Card method fields then Pay succeeds', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await loginDistributor(page);
    await fillDetailsForPayment(page);

    await page.getByRole('button', { name: /^Card$/i }).click();
    await page.getByLabel(/Card number/i).fill('4111111111111111');
    await page.getByLabel(/Expiry/i).fill('12/30');
    await page.getByLabel(/CVV/i).fill('123');

    await page.getByRole('button', { name: /Pay ₹/i }).click();
    await expect(page.getByRole('heading', { name: /Delivery booked/i })).toBeVisible({
      timeout: 90000,
    });
    await expect(page.getByText(/Reference:/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-card-pay-success.png'),
      fullPage: true,
    });
  });
});
