/**
 * Headed e2e: Visitor module — without passcode + with urgent passcode.
 *
 * Without: public registration landing + guest book-appointment.
 * With: doctor issue → security verify → visitor /visitor/urgent walk-in → Entry/Exit QR.
 *
 * Run (from frontend/):
 *   npx playwright test tests/e2e/specs/visitor-workflow-browser.spec.ts --project=chromium --headed --workers=1
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PASSWORD = 'Connitor@123';
const VISITOR_PASSWORD = 'Connitor@123';
const DOCTOR_EMAIL = 'priya.nair@connitor-elcity.com';
const SECURITY_EMAIL = 'security@connitor-elcity.com';
const BRANCH_ID = '11000000-0000-4000-8000-000000000002';
const API = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8002';
const SCREENSHOT_DIR = path.join(__dirname, '../../../test-results/visitor-workflow');
const PYTHON_BACKEND = path.resolve(__dirname, '../../../../python_backend');

type FlowCtx = {
  visitorEmail: string;
  visitorPhone: string;
  visitorFirst: string;
  visitorLast: string;
  guestEmail: string;
  guestPhone: string;
  passcode?: string;
  gateUrl?: string;
  bookingId?: string;
};

const ctx: FlowCtx = {
  visitorEmail: '',
  visitorPhone: '',
  visitorFirst: '',
  visitorLast: '',
  guestEmail: '',
  guestPhone: '',
};

async function clearAuth(page: Page): Promise<void> {
  await page.goto('about:blank');
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
  const token = body.access_token || body.accessToken || body.token;
  expect(token).toBeTruthy();
  return token as string;
}

async function loginUi(page: Page, email: string, roleQuery?: string): Promise<void> {
  const url = roleQuery ? `/auth/login?role=${roleQuery}` : '/auth/login';
  await page.goto(url);
  await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function fillByLabelText(page: Page, label: string, value: string): Promise<void> {
  const input = page.getByText(label, { exact: true }).locator('xpath=..').locator('input, textarea').first();
  await expect(input).toBeVisible({ timeout: 15000 });
  await input.fill(value);
}

async function fillOtp(page: Page, code: string): Promise<void> {
  const hidden = page.locator('input[autocomplete="one-time-code"]');
  if ((await hidden.count()) > 0) {
    await hidden.first().click({ force: true });
    await hidden.first().fill(code);
    return;
  }
  await page.locator('[data-slot="input-otp"]').first().click();
  await page.keyboard.type(code);
}

function istYmd(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000 + 5.5 * 3600000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function activateVisitorInDb(email: string): void {
  execFileSync('python', ['scripts/e2e_activate_visitor.py', email], {
    cwd: PYTHON_BACKEND,
    env: { ...process.env, PYTHONPATH: '.' },
    stdio: 'pipe',
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('Visitor module e2e (with / without passcode)', () => {
  test.beforeAll(async ({ request }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const suffix = Date.now().toString().slice(-6);
    ctx.visitorFirst = 'E2E';
    ctx.visitorLast = `Visitor${suffix}`;
    ctx.visitorEmail = `e2e.vis.${suffix}@example.com`;
    ctx.visitorPhone = `98${suffix.padStart(8, '0').slice(0, 8)}`;
    ctx.guestEmail = `e2e.guest.${suffix}@example.com`;
    ctx.guestPhone = `97${suffix.padStart(8, '0').slice(0, 8)}`;

    const draft = await request.post(`${API}/api/public/visitor-accounts`, {
      data: {
        firstName: ctx.visitorFirst,
        lastName: ctx.visitorLast,
        phone: ctx.visitorPhone,
        email: ctx.visitorEmail,
        emailType: 'PERSONAL',
      },
    });
    expect(draft.ok() || draft.status() === 201, await draft.text()).toBeTruthy();
    const draftBody = await draft.json();
    const accountId = draftBody.accountId as string;
    expect(accountId).toBeTruthy();

    const pw = await request.post(`${API}/api/public/visitor-accounts/${accountId}/password`, {
      data: {
        password: VISITOR_PASSWORD,
        acceptTerms: true,
        privacyPolicyVersion: '2026-06-01',
      },
    });
    expect(pw.ok(), await pw.text()).toBeTruthy();

    const sendEmail = await request.post(
      `${API}/api/public/visitor-accounts/${accountId}/send-email-verification`,
    );
    if (sendEmail.ok()) {
      const emailBody = await sendEmail.json();
      const otp = emailBody.testEmailOtp || emailBody.testOtp;
      if (otp) {
        await request.post(`${API}/api/public/visitor-accounts/${accountId}/verify-email`, {
          data: { otp },
        });
      }
    }

    activateVisitorInDb(ctx.visitorEmail);

    const loginRes = await request.post(`${API}/api/public/visitor-auth/login`, {
      data: { identifier: ctx.visitorEmail, password: VISITOR_PASSWORD },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();

    const doctorToken = await apiLogin(request, DOCTOR_EMAIL);
    const today = istYmd(0);
    const tomorrow = istYmd(1);
    for (const date of [today, tomorrow]) {
      const slots = await request.post(`${API}/api/staff/schedule/slots`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
        data: {
          date,
          startTime: '18:00',
          endTime: '22:00',
          slotMinutes: 30,
        },
      });
      expect(
        slots.ok() || slots.status() === 201 || slots.status() === 409,
        await slots.text(),
      ).toBeTruthy();
    }
  });

  test('01 Without passcode — visitor registration landing + wizard', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await page.goto(`/visitor-registration?branchId=${BRANCH_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.getByRole('heading', { name: /Welcome to/i })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(/Start Registration/i).first()).toBeVisible();
    await shot(page, '01-registration-landing');

    await page.getByText(/Start Registration/i).first().click();
    await expect(page).toHaveURL(/\/visitor-registration\/wizard/, { timeout: 20000 });
    await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByLabel(/Mobile phone number|Phone Number/i)).toBeVisible();
    await shot(page, '01-registration-wizard-phone');
  });

  test('02 Without passcode — guest book appointment', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await page.goto('/book-appointment', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page.getByText(/Book Doctor Appointment/i).first()).toBeVisible({
      timeout: 20000,
    });

    await page.getByRole('button', { name: /Electronic City/i }).click();
    await expect(page.getByText(/Select Department/i)).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /General Medicine/i }).click();
    await expect(page.getByText(/Select Section/i)).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /^OPD$/i }).click();
    await expect(page.getByText(/Select Doctor/i)).toBeVisible({ timeout: 20000 });
    const doctorCard = page
      .locator('button')
      .filter({ hasText: /Priya|Doctor/i })
      .first();
    await expect(doctorCard).toBeVisible({ timeout: 20000 });
    await doctorCard.click();

    await expect(page.getByText(/AI Doctor Priya|First Name/i).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('First Name', { exact: true })).toBeVisible({ timeout: 15000 });

    await fillByLabelText(page, 'First Name', ctx.visitorFirst);
    await fillByLabelText(page, 'Last Name', `Guest${ctx.visitorLast.replace('Visitor', '')}`);
    await fillByLabelText(page, 'Phone (10 digits)', ctx.guestPhone);
    await fillByLabelText(page, 'Email', ctx.guestEmail);
    await fillByLabelText(page, 'Purpose', 'E2E guest booking without urgent passcode');

    const slotBtn = page.getByRole('button', { name: /\d{1,2}:\d{2}\s?(AM|PM)/i }).first();
    if (await slotBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await slotBtn.click();
    } else {
      await page.getByRole('button', { name: /Request a visit slot/i }).click();
    }

    await page.getByRole('button', { name: /Confirm Booking|Send visit request/i }).click();
    await expect(page.getByText(/Booking Confirmed/i)).toBeVisible({ timeout: 30000 });
    const bookingText = await page.getByText(/Booking ID:/i).innerText();
    ctx.bookingId = bookingText.replace(/.*Booking ID:\s*/i, '').trim();
    expect(ctx.bookingId).toBeTruthy();
    await shot(page, '02-book-appointment-confirmed');
  });

  test('03 With passcode — doctor issues urgent passcode', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await loginUi(page, DOCTOR_EMAIL, 'STAFF');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.goto('/dashboard/my-visitors');
    await expect(page.getByRole('button', { name: /Urgent passcode/i })).toBeVisible({
      timeout: 20000,
    });
    await shot(page, '03-my-visitors');

    await page.getByRole('button', { name: /Urgent passcode/i }).click();
    await expect(page.getByRole('heading', { name: /Urgent entry passcode/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByLabel(/Purpose of visit/i).fill('E2E urgent consultation');
    await page.getByLabel(/Note for security/i).fill('E2E headed visitor passcode test');
    await page.getByRole('button', { name: /Generate passcode/i }).click();

    const codeEl = page.locator('p.text-4xl.font-mono');
    await expect(codeEl).toBeVisible({ timeout: 20000 });
    ctx.passcode = (await codeEl.innerText()).replace(/\D/g, '');
    expect(ctx.passcode).toMatch(/^\d{6}$/);
    await shot(page, '03-passcode-issued');
  });

  test('04 With passcode — security verifies + handoff URL', async ({ page }) => {
    test.setTimeout(180000);
    expect(ctx.passcode, 'passcode from doctor step').toMatch(/^\d{6}$/);
    await clearAuth(page);
    await loginUi(page, SECURITY_EMAIL, 'SECURITY');
    await page.waitForURL(/\/security\/dashboard/, { timeout: 30000 });
    await page.goto('/security/dashboard?tab=check-in');
    await expect(page.getByTestId('check-in-tab')).toBeVisible({ timeout: 20000 });
    await shot(page, '04-security-checkin');

    const urgentBtn = page.getByRole('button', { name: /Doctor urgent passcode/i });
    await urgentBtn.scrollIntoViewIfNeeded();
    await urgentBtn.click();
    await expect(page.getByRole('heading', { name: /Doctor urgent passcode/i })).toBeVisible({
      timeout: 15000,
    });
    await fillOtp(page, ctx.passcode!);
    const verifyBtn = page.getByRole('button', { name: /Verify passcode/i });
    if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verifyBtn.click();
    }

    const handoffHeading = page.getByRole('heading', { name: /Ask visitor to register/i });
    await handoffHeading.scrollIntoViewIfNeeded();
    await expect(handoffHeading).toBeVisible({ timeout: 20000 });
    const urlEl = page.locator('p.break-all').filter({ hasText: /\/visitor\/urgent\// });
    await expect(urlEl).toBeVisible({ timeout: 10000 });
    ctx.gateUrl = (await urlEl.innerText()).trim();
    expect(ctx.gateUrl).toMatch(/\/visitor\/urgent\/\?token=/);
    await shot(page, '04-security-handoff');
  });

  test('05 With passcode — visitor signs in, walk-in book, dual QR', async ({ page }) => {
    test.setTimeout(180000);
    expect(ctx.gateUrl, 'gate URL from security').toBeTruthy();
    await clearAuth(page);

    const pathAndQuery = ctx.gateUrl!.replace(/^https?:\/\/[^/]+/, '');
    await page.goto(pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.getByText(/Urgent visit booking/i).first()).toBeVisible({
      timeout: 20000,
    });
    await shot(page, '05-urgent-gate-signed-out');

    await page.getByRole('link', { name: /Sign in/i }).click();
    await expect(page.getByText(/Visitor sign in/i).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole('textbox', { name: /Email or mobile/i }).fill(ctx.visitorEmail);
    await page.getByRole('textbox', { name: /^Password$/i }).fill(VISITOR_PASSWORD);
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(page.getByText(/Urgent visit booking|Confirm visit/i).first()).toBeVisible({
      timeout: 30000,
    });
    const walkIn = page.getByLabel(/Book for ASAP walk-in/i);
    if (await walkIn.isVisible().catch(() => false)) {
      if (!(await walkIn.isChecked())) {
        await walkIn.check();
      }
    }
    await shot(page, '05-urgent-gate-signed-in');

    await page.getByRole('button', { name: /Confirm visit & get QR codes/i }).click();
    await expect(page.getByText(/You.?re approved/i)).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Entry QR', { exact: true })).toBeVisible();
    await expect(page.getByText('Exit QR', { exact: true })).toBeVisible();
    await shot(page, '05-urgent-dual-qr');
  });
});
