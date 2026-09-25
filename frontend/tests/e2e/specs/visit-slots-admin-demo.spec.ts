/**
 * Headed demo: login as hospital admin and show Visit slots allotted for tomorrow.
 * Run: npx playwright test tests/e2e/specs/visit-slots-admin-demo.spec.ts --headed --project=chromium
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'hospital.admin@connitor-elcity.com';
const ADMIN_PASSWORD = 'Connitor@123';
const SLOT_DATE = '2026-08-22';

test.describe('Admin visit slots demo', () => {
  test('login and show admin-allotted slots on Visit slots page', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/auth/login/');
    await page.getByTestId('email-input').fill(ADMIN_EMAIL);
    await page.getByTestId('password-input').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    await page.goto('/dashboard/visit-slots/');
    await expect(page.getByRole('heading', { name: /visit slots/i })).toBeVisible({
      timeout: 20000,
    });

    const dateInput = page.locator('#date');
    await dateInput.fill(SLOT_DATE);

    await expect(page.getByRole('cell', { name: /AI Doctor Priya/i })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('cell', { name: /14:00–15:00|14:00-15:00/ })).toBeVisible();
    await expect(page.getByText('14:00, 14:20, 14:40')).toBeVisible();

    // Hold so the headed window is visible during the demo
    await page.waitForTimeout(10000);
  });
});
