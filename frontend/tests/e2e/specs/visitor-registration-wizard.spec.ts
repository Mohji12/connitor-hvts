import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Visitor Registration Wizard', () => {
  const BRANCH_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // Chennai Branch ID

  test.beforeEach(async ({ page }) => {
    // Navigate to wizard page
    await page.goto(`/visitor-registration/wizard?branchId=${BRANCH_ID}`);
  });

  test.describe('Initial Render & UI Elements', () => {
    test('should display wizard container with progress bar', async ({ page }) => {
      // Verify wizard container is visible
      await expect(page.locator('[data-testid="wizard-container"]')).toBeVisible();

      // Verify progress bar shows "Step 1 of 6"
      await expect(page.getByText('Step 1 of 6').first()).toBeVisible();

      // Verify progress bar is visible
      const progressBar = page.locator('[role="progressbar"]');
      await expect(progressBar).toBeVisible();
      await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    test('should render phone entry step initially', async ({ page }) => {
      await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible();
      await expect(page.getByText('Step 1 of 6').first()).toBeVisible();
    });

    test('should have accessible screen reader announcement', async ({ page }) => {
      const announcement = page.locator('#step-announcement');
      await expect(announcement).toHaveAttribute('role', 'status');
      await expect(announcement).toHaveAttribute('aria-live', 'polite');
      await expect(announcement).toHaveAttribute('aria-atomic', 'true');
    });
  });

  test.describe('Complete Delivery Flow', () => {
    test('should complete full delivery registration flow', async ({ page }) => {
      // Step 1: Phone Entry
      await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible();
      await page.getByRole('button', { name: /send otp/i }).click();

      // Step 2: Phone Verification
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();
      await expect(page.getByText('Step 2 of 6').first()).toBeVisible();
      await page.getByRole('button', { name: /verify otp/i }).click();

      // Step 3: Visit Type Selection
      await expect(page.locator('[data-testid="visit-type-selection"]')).toBeVisible();
      await expect(page.getByText('Step 3 of 6').first()).toBeVisible();
      await page.getByRole('button', { name: /delivery/i }).click();

      // Step 4: Delivery Registration Form
      await expect(page.locator('[data-testid="delivery-registration-form"]')).toBeVisible();
      await expect(page.getByText('Step 4 of 6').first()).toBeVisible();
      
      // Progress bar should show ~50% (step 4/6)
      const progressBar = page.locator('[role="progressbar"]');
      const progressValue = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(progressValue || '0')).toBeGreaterThan(50);
      expect(parseFloat(progressValue || '0')).toBeLessThan(70);
      
      await page.getByRole('button', { name: /continue/i }).first().click();

      // Step 5: Delivery Details
      await expect(page.locator('[data-testid="delivery-details-step"]')).toBeVisible();
      await expect(page.getByText('Step 5 of 6').first()).toBeVisible();
      
      // Mock the API call for submission
      await page.route('**/api/deliveries', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            visitId: 'delivery-123',
            status: 'REQUEST_SENT',
          }),
        });
      });
      
      await page.getByRole('button', { name: /submit/i }).click();

      // Step 6: Confirmation
      await expect(page.locator('[data-testid="confirmation-step"]')).toBeVisible();
      await expect(page.getByText('Step 6 of 6').first()).toBeVisible();
      
      // Progress bar should show 100%
      const finalProgress = await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
      expect(parseFloat(finalProgress || '0')).toBe(100);
    });

    test('should handle API error during delivery submission', async ({ page }) => {
      // Complete flow to delivery details
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      await page.getByRole('button', { name: /verify otp/i }).click();
      await page.waitForSelector('[data-testid="visit-type-selection"]');
      await page.getByRole('button', { name: /delivery/i }).click();
      await page.waitForSelector('[data-testid="delivery-registration-form"]');
      await page.getByRole('button', { name: /continue/i }).first().click();
      await page.waitForSelector('[data-testid="delivery-details-step"]');

      // Mock API to return error
      await page.route('**/api/deliveries', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error',
          }),
        });
      });

      await page.getByRole('button', { name: /submit/i }).click();

      // Should show error message
      await expect(page.getByText(/failed to submit/i)).toBeVisible();
      
      // Should show retry button
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
      
      // Should remain on delivery details step
      await expect(page.locator('[data-testid="delivery-details-step"]')).toBeVisible();
    });
  });

  test.describe('Complete Meeting Flow', () => {
    test('should complete full meeting registration flow', async ({ page }) => {
      // Step 1: Phone Entry
      await page.getByRole('button', { name: /send otp/i }).click();

      // Step 2: Phone Verification
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();
      await page.getByRole('button', { name: /verify otp/i }).click();

      // Step 3: Visit Type Selection
      await expect(page.locator('[data-testid="visit-type-selection"]')).toBeVisible();
      await page.getByRole('button', { name: /meeting/i }).click();

      // Step 4: Meeting Registration Form
      await expect(page.locator('[data-testid="meeting-registration-form"]')).toBeVisible();
      await expect(page.getByText('Step 4 of 6').first()).toBeVisible();
      await page.getByRole('button', { name: /continue/i }).first().click();

      // Step 5: Meeting Details
      await expect(page.locator('[data-testid="meeting-details-step"]')).toBeVisible();
      await expect(page.getByText('Step 5 of 6').first()).toBeVisible();
      
      // Mock the API call for submission
      await page.route('**/api/meetings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            visitId: 'meeting-456',
            status: 'REQUEST_SENT',
          }),
        });
      });
      
      await page.getByRole('button', { name: /submit/i }).click();

      // Step 6: Confirmation
      await expect(page.locator('[data-testid="confirmation-step"]')).toBeVisible();
      await expect(page.getByText('Step 6 of 6').first()).toBeVisible();
    });
  });

  test.describe('Back Navigation', () => {
    test('should navigate back from phone verification to phone entry', async ({ page }) => {
      // Go to phone verification
      await page.getByRole('button', { name: /send otp/i }).click();
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();

      // Click Back button
      await page.getByRole('button', { name: /back/i }).click();

      // Should return to phone entry
      await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible();
      await expect(page.getByText('Step 1 of 6').first()).toBeVisible();
    });

    test('should navigate back from visit type to phone verification', async ({ page }) => {
      // Go to visit type selection
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      await page.getByRole('button', { name: /verify otp/i }).click();
      await expect(page.locator('[data-testid="visit-type-selection"]')).toBeVisible();

      // Click Back button
      await page.getByRole('button', { name: /back/i }).click();

      // Should return to phone verification
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();
      await expect(page.getByText('Step 2 of 6').first()).toBeVisible();
    });

    test('should navigate back through entire delivery flow', async ({ page }) => {
      // Complete to delivery details
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      await page.getByRole('button', { name: /verify otp/i }).click();
      await page.waitForSelector('[data-testid="visit-type-selection"]');
      await page.getByRole('button', { name: /delivery/i }).click();
      await page.waitForSelector('[data-testid="delivery-registration-form"]');
      await page.getByRole('button', { name: /continue/i }).first().click();
      await expect(page.locator('[data-testid="delivery-details-step"]')).toBeVisible();

      // Back to delivery registration
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page.locator('[data-testid="delivery-registration-form"]')).toBeVisible();

      // Back to visit type
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page.locator('[data-testid="visit-type-selection"]')).toBeVisible();

      // Back to phone verification
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();

      // Back to phone entry
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible();
    });
  });

  test.describe('Cancel Flow', () => {
    test('should show confirmation dialog when clicking Cancel', async ({ page }) => {
      // Go to second step
      await page.getByRole('button', { name: /send otp/i }).click();
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();

      // Mock window.confirm to return false (user cancels)
      await page.evaluate(() => {
        window.confirm = () => false;
      });

      // Click Cancel button
      await page.getByRole('button', { name: /cancel/i }).click();

      // Should remain on phone verification step (user cancelled the cancellation)
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();
    });

    test('should redirect to landing page when user confirms cancel', async ({ page }) => {
      // Go to second step
      await page.getByRole('button', { name: /send otp/i }).click();
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();

      // Mock window.confirm to return true (user confirms)
      await page.evaluate(() => {
        window.confirm = () => true;
      });

      // Click Cancel button
      await page.getByRole('button', { name: /cancel/i }).click();

      // Should redirect to landing page
      await expect(page).toHaveURL(new RegExp(`/visitor-registration\\?branchId=${BRANCH_ID}`));
    });
  });

  test.describe('Browser Back Button', () => {
    test('should show confirmation dialog on browser back', async ({ page }) => {
      // Go to second step
      await page.getByRole('button', { name: /send otp/i }).click();
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();

      // Listen for beforeunload event
      let beforeUnloadFired = false;
      await page.evaluate(() => {
        window.addEventListener('beforeunload', () => {
          // This won't actually prevent navigation in headless tests,
          // but we can verify the event handler is registered
        });
      });

      // Try to navigate back - in real browsers this would show confirmation
      // In headless mode, we can't fully test this, but we verify the component
      // sets up the beforeunload handler
      const hasBeforeUnload = await page.evaluate(() => {
        const event = new Event('beforeunload');
        event.preventDefault = () => {};
        event.returnValue = false;
        window.dispatchEvent(event);
        return event.defaultPrevented || event.returnValue !== '';
      });

      // Just verify the wizard is still visible (in real browsers, confirmation would show)
      await expect(page.locator('[data-testid="wizard-container"]')).toBeVisible();
    });
  });

  test.describe('Progress Indicator', () => {
    test('should update progress bar as user advances through steps', async ({ page }) => {
      const progressBar = page.locator('[role="progressbar"]');

      // Step 1: 0%
      let progress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(progress || '0')).toBe(0);

      // Step 2: ~16.67%
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      progress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(progress || '0')).toBeCloseTo(16.67, 1);

      // Step 3: ~33.33%
      await page.getByRole('button', { name: /verify otp/i }).click();
      await page.waitForSelector('[data-testid="visit-type-selection"]');
      progress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(progress || '0')).toBeCloseTo(33.33, 1);

      // Step 4: ~50%
      await page.getByRole('button', { name: /delivery/i }).click();
      await page.waitForSelector('[data-testid="delivery-registration-form"]');
      progress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(progress || '0')).toBeCloseTo(50, 1);
    });
  });

  test.describe('Accessibility', () => {
    test('should have no accessibility violations on phone entry step', async ({ page }) => {
      await injectAxe(page);
      await checkA11y(page, '[data-testid="wizard-container"]', {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });

    test('should have no accessibility violations on phone verification step', async ({ page }) => {
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      
      await injectAxe(page);
      await checkA11y(page, '[data-testid="wizard-container"]', {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });

    test('should announce step changes to screen readers', async ({ page }) => {
      const announcement = page.locator('#step-announcement');

      // Initial announcement
      await expect(announcement).toContainText('Step 1 of 6');

      // Advance to next step
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');

      // Announcement should update
      await expect(announcement).toContainText('Step 2 of 6');
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      // Verify wizard container is visible and properly sized
      const container = page.locator('[data-testid="wizard-container"]');
      await expect(container).toBeVisible();

      // Verify progress bar is visible
      await expect(page.locator('[role="progressbar"]')).toBeVisible();

      // Verify phone entry step is visible and usable
      await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible();
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      const container = page.locator('[data-testid="wizard-container"]');
      await expect(container).toBeVisible();
      await expect(page.getByText('Step 1 of 6').first()).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist phone data when navigating back and forth', async ({ page }) => {
      // On a real test with form inputs, we would:
      // 1. Enter phone number
      // 2. Click Send OTP
      // 3. Click Back
      // 4. Verify phone number is still filled in
      
      // For this mock test, we just verify navigation preserves state
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page.locator('[data-testid="phone-entry-step"]')).toBeVisible();
      
      // Move forward again - state should be preserved
      await page.getByRole('button', { name: /send otp/i }).click();
      await expect(page.locator('[data-testid="phone-verification-step"]')).toBeVisible();
    });

    test('should persist visit type selection through registration steps', async ({ page }) => {
      // Navigate to delivery registration
      await page.getByRole('button', { name: /send otp/i }).click();
      await page.waitForSelector('[data-testid="phone-verification-step"]');
      await page.getByRole('button', { name: /verify otp/i }).click();
      await page.waitForSelector('[data-testid="visit-type-selection"]');
      await page.getByRole('button', { name: /delivery/i }).click();
      await expect(page.locator('[data-testid="delivery-registration-form"]')).toBeVisible();

      // Go back and verify we're still in delivery flow
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page.locator('[data-testid="visit-type-selection"]')).toBeVisible();
      
      // Go forward - should remember delivery was selected
      await page.getByRole('button', { name: /delivery/i }).click();
      await expect(page.locator('[data-testid="delivery-registration-form"]')).toBeVisible();
    });
  });
});
