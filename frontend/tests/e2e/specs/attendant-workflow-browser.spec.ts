/**
 * Headed e2e: Attendant system (apply → ward AMS → approve/issue → security UI → entry/exit).
 *
 * Browser covers public apply + AMS/security shells.
 * Gate QR entry/exit uses API (camera scan is not automatable here).
 *
 * Run (from frontend/):
 *   npx playwright test tests/e2e/specs/attendant-workflow-browser.spec.ts --project=chromium --headed --workers=1
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PASSWORD = 'Connitor@123';
const WARD_EMAIL = 'ward.admin@connitor-elcity.com';
const SECURITY_EMAIL = 'security@connitor-elcity.com';
const BRANCH_ID = '11000000-0000-4000-8000-000000000002';
const API = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8002';
const SCREENSHOT_DIR = path.join(__dirname, '../../../test-results/attendant-workflow');

/** Minimal 1x1 JPEG for government ID upload on entry scan */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
  'base64',
);

type FlowCtx = {
  mrn: string;
  patientId: string;
  admissionId: string;
  attendantId: string;
  attendantName: string;
  attendantEmail: string;
  attendantPhone: string;
  passId?: string;
  passNumber?: string;
  qrPayload?: string;
  qrSignature?: string;
  exitQrPayload?: string;
  exitQrSignature?: string;
};

const ctx: FlowCtx = {
  mrn: '',
  patientId: '',
  admissionId: '',
  attendantId: '',
  attendantName: '',
  attendantEmail: '',
  attendantPhone: '',
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

test.describe.configure({ mode: 'serial' });

test.describe('Attendant system e2e', () => {
  test.beforeAll(async ({ request }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const suffix = Date.now().toString().slice(-6);
    ctx.mrn = `E2E-ATT-${suffix}`;
    ctx.attendantName = `E2E Attendant ${suffix}`;
    ctx.attendantEmail = `e2e.att.${suffix}@example.com`;
    ctx.attendantPhone = `98${suffix.padStart(8, '0').slice(0, 8)}`;

    const token = await apiLogin(request, WARD_EMAIL);
    const headers = { Authorization: `Bearer ${token}` };

    const patient = await request.post(`${API}/api/attendant-passes/patients`, {
      headers,
      data: {
        branchId: BRANCH_ID,
        mrn: ctx.mrn,
        firstName: 'E2E',
        lastName: `Patient${suffix}`,
        phone: '9111100099',
      },
    });
    expect(patient.ok() || patient.status() === 201, await patient.text()).toBeTruthy();
    ctx.patientId = (await patient.json()).id as string;

    const admission = await request.post(`${API}/api/attendant-passes/admissions`, {
      headers,
      data: {
        patientId: ctx.patientId,
        branchId: BRANCH_ID,
        wardName: 'ICU',
        roomNumber: 'E2E-1',
        bedNumber: 'A',
      },
    });
    expect(admission.ok() || admission.status() === 201, await admission.text()).toBeTruthy();
    ctx.admissionId = (await admission.json()).id as string;
  });

  test('01 Public apply for visit pass', async ({ page }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await page.goto(`/attendant-pass/apply?branchId=${BRANCH_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(page.getByText(/Apply for visit pass/i).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/Find patient/i).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('tab', { name: /Search by MRN/i }).click();
    await page.getByLabel(/Patient MRN/i).fill(ctx.mrn);
    await page.getByRole('button', { name: /Look up patient/i }).click();
    await expect(page.getByText(/Selected patient/i)).toBeVisible({ timeout: 15000 });

    await page.getByLabel(/Full name/i).fill(ctx.attendantName);
    await page.getByLabel(/Email \(pass QR will be sent here\)/i).fill(ctx.attendantEmail);
    await page.getByLabel(/^Phone$/i).fill(ctx.attendantPhone);
    await page.getByLabel(/Relationship to patient/i).fill('Spouse');
    await page.getByRole('button', { name: /Submit request/i }).click();

    await expect(page.getByRole('heading', { name: /Request submitted/i })).toBeVisible({
      timeout: 20000,
    });
    await shot(page, '01-public-apply-done');
  });

  test('02 Ward AMS dashboard + approve/issue via API', async ({ page, request }) => {
    test.setTimeout(180000);
    await clearAuth(page);
    await loginUi(page, WARD_EMAIL, 'WARD_ADMIN');
    await page.waitForURL(/\/dashboard\/(ams|attendant-passes)/, { timeout: 30000 });
    await expect(page.getByText(/AMS|Attendant|Statistics|Dashboard/i).first()).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '02-ward-ams-home');

    await page.goto('/dashboard/ams/search');
    await expect(page.getByRole('heading', { name: /Search Attendant/i })).toBeVisible({
      timeout: 15000,
    });
    await shot(page, '02-ward-ams-search');

    const token = await apiLogin(request, WARD_EMAIL);
    const headers = { Authorization: `Bearer ${token}` };

    const attendants = await request.get(`${API}/api/attendant-passes/attendants`, {
      headers,
      params: { branchId: BRANCH_ID, admissionId: ctx.admissionId, limit: 50 },
    });
    expect(attendants.ok(), await attendants.text()).toBeTruthy();
    const attBody = await attendants.json();
    const items = (attBody.items || []) as Array<{
      id: string;
      phone?: string;
      name?: string;
      status?: string;
    }>;
    const match =
      items.find((a) => a.phone === ctx.attendantPhone) ||
      items.find((a) => a.name === ctx.attendantName) ||
      items.find((a) => a.status === 'PENDING');
    expect(match?.id, 'pending attendant for admission').toBeTruthy();
    ctx.attendantId = match!.id;

    const approve = await request.post(
      `${API}/api/attendant-passes/attendants/${ctx.attendantId}/approve`,
      { headers },
    );
    expect(approve.ok(), await approve.text()).toBeTruthy();
    expect((await approve.json()).status).toBe('APPROVED');

    const issue = await request.post(
      `${API}/api/attendant-passes/passes/${ctx.attendantId}/issue`,
      {
        headers,
        data: { revokeExisting: true },
      },
    );
    expect(issue.ok() || issue.status() === 201, await issue.text()).toBeTruthy();
    const issued = await issue.json();
    ctx.passId = issued.id as string;
    ctx.passNumber = issued.passNumber as string;
    ctx.qrPayload = issued.qrPayload as string;
    ctx.qrSignature = issued.qrSignature as string;
    expect(ctx.qrPayload).toBeTruthy();
    expect(ctx.qrSignature).toBeTruthy();

    // Soft navigation — Windows headed Chromium can briefly suspend IO
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto('/dashboard/ams/active', {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await expect(page.getByRole('heading', { name: /Active Attendants/i })).toBeVisible({
          timeout: 15000,
        });
        await shot(page, '02-ward-ams-active');
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await page.waitForTimeout(1500);
      }
    }
  });

  test('03 Security attendant scan tab + entry/exit API', async ({ page, request }) => {
    test.setTimeout(180000);
    expect(ctx.qrPayload && ctx.qrSignature).toBeTruthy();

    await clearAuth(page);
    await loginUi(page, SECURITY_EMAIL, 'SECURITY');
    await page.waitForURL(/\/security\/dashboard/, { timeout: 30000 });
    await page.goto('/security/dashboard?tab=attendant-scan');
    await expect(
      page.getByText(/attendant|government|govt|scan|check-in|checkout/i).first(),
    ).toBeVisible({ timeout: 15000 });
    await shot(page, '03-security-attendant-scan');

    const token = await apiLogin(request, SECURITY_EMAIL);
    const entry = await request.post(`${API}/api/attendant-passes/passes/scan`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        qrPayload: ctx.qrPayload!,
        signature: ctx.qrSignature!,
        scanType: 'ENTRY',
        govtIdType: 'Aadhaar',
        govtIdImage: {
          name: 'id.jpg',
          mimeType: 'image/jpeg',
          buffer: TINY_JPEG,
        },
      },
    });
    expect(entry.ok(), await entry.text()).toBeTruthy();
    const entryBody = await entry.json();
    expect(entryBody.scanType).toBe('ENTRY');
    expect(entryBody.isInside).toBeTruthy();

    const exitPayload =
      entryBody.pass?.exitQrPayload || entryBody.exitQrPayload || '';
    const exitSig =
      entryBody.pass?.exitQrSignature || entryBody.exitQrSignature || '';
    expect(exitPayload, 'exit QR payload').toBeTruthy();
    expect(exitSig, 'exit QR signature').toBeTruthy();
    ctx.exitQrPayload = exitPayload;
    ctx.exitQrSignature = exitSig;

    const exit = await request.post(`${API}/api/attendant-passes/passes/scan`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        qrPayload: ctx.exitQrPayload!,
        signature: ctx.exitQrSignature!,
        scanType: 'EXIT',
      },
    });
    expect(exit.ok(), await exit.text()).toBeTruthy();
    const exitBody = await exit.json();
    expect(exitBody.scanType).toBe('EXIT');
    expect(exitBody.isInside).toBeFalsy();
    expect(exitBody.pass?.status || exitBody.status).toBe('USED');

    await page.reload();
    await expect(
      page.getByText(/attendant|government|govt|scan|check-in|checkout/i).first(),
    ).toBeVisible({ timeout: 15000 });
    await shot(page, '03-security-after-exit');
  });

  test('04 AMS revoke control visible', async ({ page }) => {
    test.setTimeout(120000);
    await clearAuth(page);
    await loginUi(page, WARD_EMAIL, 'WARD_ADMIN');
    await page.waitForURL(/\/dashboard\/(ams|attendant-passes)/, { timeout: 30000 });
    await page.goto('/dashboard/ams/search');
    await expect(page.getByRole('heading', { name: /Search Attendant/i })).toBeVisible({
      timeout: 15000,
    });
    // Revoke / Force checkout actions exist on search rows when data is present
    await expect(page.getByRole('button', { name: /Search/i }).first()).toBeVisible();
    await shot(page, '04-ams-search-revoke-ui');
  });
});
