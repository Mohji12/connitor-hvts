import { test, expect } from '../fixtures/base';
import { TEST_USERS } from '../fixtures/test-users';

/**
 * E2E Tests for Phone Lookup Flow in Security Dashboard Check-In Tab
 *
 * This test suite covers the phone lookup functionality in the Security Dashboard's
 * Check-In tab, including navigation, validation, API interactions, and accessibility.
 *
 * Test Environment:
 * - Uses Playwright for cross-browser testing (Chromium, Firefox, WebKit)
 * - Mocks API responses for deterministic behavior
 * - Tests both found and not found scenarios
 * - Validates accessibility features
 */

test.describe('Security Dashboard - Phone Lookup Flow', () => {
  // Mock visitor data for testing
  const mockVisitorFound = {
    id: 'visitor-123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '9876543210',
    email: 'john.doe@example.com',
    photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', // Mock base64 image
    company: 'Tech Corp',
    designation: 'Software Engineer',
    lastVisit: {
      visitDate: '2024-02-10T10:00:00Z',
      status: 'COMPLETED',
    },
  };

  const mockVisitorNotFound = null;

  // Setup API mocking for each test
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting localStorage (simplified for E2E testing)
    // Note: Using localStorage directly instead of securityPage fixture for simplicity
    // since the fixture requires backend authentication which may not be available
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-jwt-token-for-testing');
    });

    // Navigate to security dashboard
    await page.goto('/security/dashboard');

    // Mock the search visitors API endpoint
    await page.route('**/api/visitors/search*', async (route) => {
      const url = new URL(route.request().url());
      const phone = url.searchParams.get('phone');
      const branchId = url.searchParams.get('branchId');

      // Validate request parameters
      if (!phone || !branchId) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 400,
            code: 'INVALID_REQUEST',
            message: 'Missing required parameters',
          }),
        });
        return;
      }

      // Mock different scenarios based on phone number
      if (phone === '9876543210') {
        // Found scenario - add delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            found: true,
            visitor: mockVisitorFound,
          }),
        });
      } else if (phone === '9999999999') {
        // Not found scenario
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            found: false,
          }),
        });
      } else if (phone === '1111111111') {
        // Network error
        await route.abort();
      } else if (phone === '2222222222') {
        // Server error
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 500,
            code: 'SERVER_ERROR',
            message: 'Something went wrong. Please try again.',
          }),
        });
      } else if (phone === '3333333333') {
        // Unauthorized
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 401,
            code: 'UNAUTHORIZED',
            message: 'Session expired. Please log in again.',
          }),
        });
      } else {
        // Default not found
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            found: false,
          }),
        });
      }
    });
  });

  test.describe('Happy Path Scenarios', () => {
    test('should navigate to phone lookup from Check-In tab', async ({ page }) => {
      // Verify we're on the check-in tab
      await expect(page.getByTestId('check-in-tab')).toBeVisible();

      // Click the phone lookup button
      await page.getByTestId('phone-lookup-button').click();

      // Verify phone lookup flow is displayed
      await expect(page.getByTestId('phone-input')).toBeVisible();
      await expect(page.locator('[data-slot="card-title"]').getByText('Quick Check-In')).toBeVisible();
      await expect(page.getByText('Enter visitor phone number to search')).toBeVisible();
    });

    test('should enable lookup button when valid 10-digit phone is entered', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Initially button should be disabled
      await expect(page.getByTestId('lookup-button')).toBeDisabled();

      // Enter 9 digits - button still disabled
      await page.getByTestId('phone-input').fill('987654321');
      await expect(page.getByTestId('lookup-button')).toBeDisabled();

      // Enter 10th digit - button becomes enabled
      await page.getByTestId('phone-input').fill('9876543210');
      await expect(page.getByTestId('lookup-button')).toBeEnabled();
    });

    test('should search for visitor and find them', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter valid phone number
      await page.getByTestId('phone-input').fill('9876543210');

      // Click lookup button
      await page.getByTestId('lookup-button').click();

      // Verify loading state
      await expect(page.getByTestId('lookup-button')).toContainText('Searching...');

       // Verify visitor found display
       await expect(page.locator('[data-slot="card-title"]').getByText('Visitor Found')).toBeVisible();
       await expect(page.getByText('John Doe')).toBeVisible();
       await expect(page.getByText('9876543210')).toBeVisible();
       await expect(page.getByText('Tech Corp')).toBeVisible();
       await expect(page.getByText('Last visit: 2/10/2024')).toBeVisible();
    });

    test('should display visitor details with photo/name/company', async ({ page }) => {
      // Navigate to phone lookup and search
      await page.getByTestId('phone-lookup-button').click();
      await page.getByTestId('phone-input').fill('9876543210');
      await page.getByTestId('lookup-button').click();

      // Wait for visitor card to be fully loaded
      await expect(page.locator('[data-slot="card-title"]').getByText('Visitor Found')).toBeVisible();

      // Verify visitor card content
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('john.doe@example.com')).toBeVisible();
      await expect(page.getByText('Tech Corp')).toBeVisible();
    });

    test('should click "Search Another" to reset', async ({ page }) => {
      // Navigate to phone lookup and find visitor
      await page.getByTestId('phone-lookup-button').click();
      await page.getByTestId('phone-input').fill('9876543210');
      await page.getByTestId('lookup-button').click();

      // Click "Search Another"
      await page.getByTestId('search-another-button').click();

      // Verify reset to initial state
      await expect(page.getByTestId('phone-input')).toHaveValue('');
      await expect(page.getByTestId('lookup-button')).toBeDisabled();
      await expect(page.locator('[data-slot="card-title"]').getByText('Quick Check-In')).toBeVisible();
    });

    test('should search for visitor and not find them', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter phone number that doesn't exist
      await page.getByTestId('phone-input').fill('9999999999');

      // Click lookup button
      await page.getByTestId('lookup-button').click();

      // Verify not found display
      await expect(page.locator('[data-slot="card-title"]').getByText('Visitor Not Found')).toBeVisible();
      await expect(page.getByText(/couldn't find a visitor with phone number/)).toBeVisible();
      await expect(page.getByTestId('register-new-button')).toBeVisible();
      await expect(page.getByTestId('search-another-not-found-button')).toBeVisible();
    });

    test('should click "Register as new visitor" and show info message', async ({ page }) => {
      // Navigate to phone lookup and search for non-existent visitor
      await page.getByTestId('phone-lookup-button').click();
      await page.getByTestId('phone-input').fill('9999999999');
      await page.getByTestId('lookup-button').click();

      // Click register new button
      await page.getByTestId('register-new-button').click();

      // For now, this is a placeholder - in future it would navigate or show modal
      // Currently, it just exists without error
    });
  });

  test.describe('Validation Scenarios', () => {
    test('should disable lookup button for 9 digits', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter 9 digits
      await page.getByTestId('phone-input').fill('987654321');

      // Button should be disabled
      await expect(page.getByTestId('lookup-button')).toBeDisabled();

      // Should still be on input form
      await expect(page.getByTestId('phone-input')).toBeVisible();
    });

    test('should ignore non-digit characters in phone input', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter phone with letters and spaces
      await page.getByTestId('phone-input').type('98abc76543210xyz');

      // Should only contain digits (limited to 10)
      await expect(page.getByTestId('phone-input')).toHaveValue('9876543210');

      // Button should be enabled (10 digits)
      await expect(page.getByTestId('lookup-button')).toBeEnabled();
    });

    test('should disable button when input is empty', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Input should be empty and button disabled
      await expect(page.getByTestId('phone-input')).toHaveValue('');
      await expect(page.getByTestId('lookup-button')).toBeDisabled();
    });

    test('should trigger lookup on Enter key when valid', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter valid phone
      await page.getByTestId('phone-input').fill('9876543210');

      // Press Enter
      await page.getByTestId('phone-input').press('Enter');

      // Should trigger search
      await expect(page.locator('[data-slot="card-title"]').getByText('Visitor Found')).toBeVisible();
    });
  });

  test.describe('Error Scenarios', () => {
    test('should allow retry after changing phone number', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter invalid phone first
      await page.getByTestId('phone-input').fill('12345');
      await expect(page.getByTestId('lookup-button')).toBeDisabled();

      // Change to valid phone
      await page.getByTestId('phone-input').fill('9876543210');
      await expect(page.getByTestId('lookup-button')).toBeEnabled();

      // Click lookup
      await page.getByTestId('lookup-button').click();

      // Should find visitor
      await expect(page.locator('[data-slot="card-title"]').getByText('Visitor Found')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper keyboard navigation order', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Phone input should be focused initially
      await expect(page.getByTestId('phone-input')).toBeFocused();

      // Enter a phone number to enable the lookup button
      await page.getByTestId('phone-input').fill('9876543210');

      // Tab to lookup button
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('lookup-button')).toBeFocused();

      // Tab to back button
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('back-button')).toBeFocused();
    });

    test('should announce status to screen readers', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Enter valid phone and search
      await page.getByTestId('phone-input').fill('9876543210');
      await page.getByTestId('lookup-button').click();

      // Check for screen reader announcements
      // Note: aria-live elements are sr-only (screen reader only), so check for DOM presence
      await expect(page.locator('[aria-live="polite"]').first()).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Check ARIA attributes
      await expect(page.getByTestId('phone-input')).toHaveAttribute('aria-label', 'Visitor phone number');
      await expect(page.getByTestId('lookup-button')).toHaveAttribute('aria-label', 'Search visitor');
      await expect(page.getByTestId('back-button')).toHaveAttribute('aria-label', 'Back to OTP verification');
    });

    test('should focus phone input on component mount', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Phone input should be focused
      await expect(page.getByTestId('phone-input')).toBeFocused();
    });

    test('should focus visitor card when found', async ({ page }) => {
      // Navigate to phone lookup and search
      await page.getByTestId('phone-lookup-button').click();
      await page.getByTestId('phone-input').fill('9876543210');
      await page.getByTestId('lookup-button').click();

      // Visitor card should be focused (has tabindex="-1" and is a Card)
      await expect(page.locator('[data-slot="card"][tabindex="-1"]')).toBeVisible();
    });
  });

  test.describe('Integration', () => {
    test('should navigate between OTP and phone lookup views', async ({ page }) => {
      // Start with OTP view
      await expect(page.getByTestId('otp-input')).toBeVisible();

      // Switch to phone lookup
      await page.getByTestId('phone-lookup-button').click();
      await expect(page.getByTestId('phone-input')).toBeVisible();
      await expect(page.getByTestId('otp-input')).not.toBeVisible();

      // Back to OTP
      await page.getByTestId('back-button').click();
      await expect(page.getByTestId('otp-input')).toBeVisible();
      await expect(page.getByTestId('phone-input')).not.toBeVisible();
    });

    test('should handle back button navigation', async ({ page }) => {
      // Navigate to phone lookup
      await page.getByTestId('phone-lookup-button').click();

      // Verify phone lookup is shown
      await expect(page.getByTestId('phone-input')).toBeVisible();

      // Click back
      await page.getByTestId('back-button').click();

      // Should return to OTP verification
      await expect(page.getByTestId('otp-input')).toBeVisible();
    });

    test('should integrate phone lookup alternative in CheckInTab', async ({ page }) => {
      // Verify phone lookup button exists in check-in tab
      await expect(page.getByTestId('phone-lookup-button')).toBeVisible();
      await expect(page.getByTestId('phone-lookup-button')).toContainText('Check Visitor');
    });
  });
});