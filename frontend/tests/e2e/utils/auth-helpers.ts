import { Page, expect } from '@playwright/test';
import { TestUser, E2E_FIXED_OTP } from '../fixtures/test-users';

/**
 * Performs a full login flow for a given test user.
 *
 * Logic:
 * 1. Navigate to /login
 * 2. Fill phone number input
 * 3. Click 'Send OTP'
 * 4. Wait for OTP input field to appear
 * 5. Fill fixed OTP (123456)
 * 6. Click 'Verify'
 * 7. Assert navigation to dashboard/home
 *
 * @param page Playwright Page object
 * @param user TestUser fixture
 * @param otp Optional OTP (defaults to E2E_FIXED_OTP)
 */
export async function loginAs(page: Page, phoneNumber: string, otp: string = E2E_FIXED_OTP) {
  // 1. Navigate to login
  await page.goto('/auth/login');

  // 2. Enter Phone Number
  const phoneInput = page.getByTestId('phone-input');
  await expect(phoneInput).toBeVisible();
  await phoneInput.pressSequentially(phoneNumber);

  const sendOtpButton = page.getByTestId('login-submit');
  await sendOtpButton.click();

  // 3. Wait for OTP field
  const otpInput = page.getByTestId('otp-input');
  await expect(otpInput).toBeVisible({ timeout: 5000 });
  await otpInput.fill(otp);

  // 4. Click verify button
  const verifyButton = page.getByTestId('otp-submit');
  await verifyButton.click();

    // 5. Wait for navigation to dashboard
    await page.waitForURL(/(security\/)?dashboard|home/, { timeout: 10000, waitUntil: 'commit' });
}

/**
 * Login helper that uses a TestUser object
 * @param page Playwright Page object
 * @param user TestUser fixture
 * @param otp Optional OTP (defaults to E2E_FIXED_OTP)
 */
export async function loginAsUser(page: Page, user: TestUser, otp: string = E2E_FIXED_OTP) {
  await page.goto('/auth/login');

  // Enter Phone Number
  await page.getByTestId('phone-input').pressSequentially(user.phoneNumber);
  await page.getByTestId('login-submit').click();

  // Enter OTP
  // Wait for OTP field to be visible (transition from phone entry)
  await expect(page.getByTestId('otp-input')).toBeVisible({ timeout: 5000 });
  await page.getByTestId('otp-input').fill(otp);
  await page.getByTestId('otp-submit').click();

  // Wait for navigation to dashboard
  await page.waitForURL(/dashboard|home/, { timeout: 10000 });
}

/**
 * Logout helper - navigates to logout endpoint or clicks logout button
 * @param page Playwright Page object
 */
export async function logoutAs(page: Page) {
  // Try multiple possible logout mechanisms
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
  } else {
    // Fallback: direct navigation to logout endpoint if available
    await page.goto('/auth/logout');
  }
}
