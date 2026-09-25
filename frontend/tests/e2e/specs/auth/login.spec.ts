import { test, expect } from '@playwright/test';
import { TEST_USERS, E2E_FIXED_OTP } from '../../fixtures/test-users';
import { loginAs, loginAsUser } from '../../utils/auth-helpers';

test.describe('Authentication: Login Smoke Test', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    const user = TEST_USERS.SUPER_ADMIN;

    await loginAsUser(page, user, E2E_FIXED_OTP);

    // Assertions
    await expect(page).toHaveURL(/.*dashboard|home/);
    await expect(page.getByTestId('dashboard-container')).toBeVisible();
    // Optional: Check for user name in header
    // await expect(page.locator('header')).toContainText(user.name);
  });

  test('should successfully login as Chain Admin', async ({ page }) => {
    const user = TEST_USERS.CHAIN_ADMIN;

    await loginAs(page, user.phoneNumber, E2E_FIXED_OTP);

    // Assert successful login (e.g., URL change or dashboard presence)
    await expect(page).toHaveURL(/dashboard|home/);
  });

  test('should show error for unregistered phone number', async ({ page }) => {
    const user = TEST_USERS.INVALID_USER;

    await page.goto('/auth/login');
    await page.getByTestId('phone-input').pressSequentially(user.phoneNumber);
    await page.getByTestId('login-submit').click();

    // Check for error toast or message
    const errorMsg = page.getByTestId('login-error');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    await expect(errorMsg).toContainText(/not found|invalid|no user/i);
  });

  test('should show error for incorrect OTP', async ({ page }) => {
    const user = TEST_USERS.SUPER_ADMIN;
    const wrongOtp = '000000';

    await page.goto('/auth/login');
    await page.getByTestId('phone-input').pressSequentially(user.phoneNumber);
    await page.getByTestId('login-submit').click();

    // Wait for OTP input to appear
    await expect(page.getByTestId('otp-input')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('otp-input').fill(wrongOtp);
    await page.getByTestId('otp-submit').click();

    const errorMsg = page.getByTestId('login-error');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    await expect(errorMsg).toContainText(/invalid|incorrect|wrongJ|expired/i);
  });

  test('should redirect to login when accessing dashboard without auth', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
  });
});
