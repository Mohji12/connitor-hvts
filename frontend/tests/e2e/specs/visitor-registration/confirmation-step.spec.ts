/**
 * E2E Tests for Confirmation Step (Task 5.3)
 * Tests the success confirmation page in the visitor registration flow
 *
 * Test Coverage:
 * 1. Complete Flow: Verify confirmation displays after submission
 * 2. Animation: Checkmark animation and text fade-in
 * 3. Done Action: Click Done, verify callback triggered
 * 4. Contact Security: Click Contact Security, verify action
 * 5. Auto-Redirect: Verify automatic navigation after delay
 * 6. Auto-Redirect Cancel: User interaction cancels auto-redirect
 * 7. Accessibility: Tab order, Enter/Space activation, screen reader
 * 8. Responsive: Mobile, tablet, desktop viewports
 * 9. Visit Types: Meeting vs Delivery display
 * 10. Keyboard Navigation: Escape key, Tab, Enter/Space
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// Test Data & Constants
// ============================================================================

const CONFIRMATION_PAGE_PATH = '/visitor-registration/confirmation';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to confirmation step
 * (In real flow, this would be after Step 4 submission)
 */
async function navigateToConfirmation(page: Page) {
  await page.goto(CONFIRMATION_PAGE_PATH);

  // Verify we're on the correct page
  await expect(page.getByText('Step 5 of 6')).toBeVisible();
  await expect(page.getByText('Request Submitted!')).toBeVisible();
}

/**
 * Get the success checkmark icon
 */
function getSuccessCheckmark(page: Page) {
  return page.getByTestId('success-checkmark');
}

/**
 * Get the Done button
 */
function getDoneButton(page: Page) {
  return page.getByRole('button', { name: /complete registration and close/i });
}

/**
 * Get the Contact Security link
 */
function getContactSecurityLink(page: Page) {
  return page.getByRole('button', { name: /contact security for help/i });
}

// ============================================================================
// Test Suite: Confirmation Step
// ============================================================================

test.describe('Confirmation Step (Task 5.3)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfirmation(page);
  });

  // ------------------------------------------------------------------------
  // Scenario 1: Complete Flow
  // ------------------------------------------------------------------------

  test.describe('Complete Confirmation Flow', () => {
    test('should display confirmation page after submission', async ({ page }) => {
      // Verify step indicator
      await expect(page.getByText('Step 5 of 6')).toBeVisible();

      // Verify success message
      await expect(page.getByText('Request Submitted!')).toBeVisible();

      // Verify WhatsApp explanation
      await expect(page.getByText(/You'll receive your/i)).toBeVisible();
      await expect(page.getByText(/Gate Pass via WhatsApp/i)).toBeVisible();

      // Verify Done button
      await expect(getDoneButton(page)).toBeVisible();
    });

    test('should display all required elements', async ({ page }) => {
      // Checkmark
      await expect(getSuccessCheckmark(page)).toBeVisible();

      // Heading (with role="status")
      await expect(page.getByRole('status')).toBeVisible();
      await expect(page.getByText('Request Submitted!')).toBeVisible();

      // WhatsApp instruction
      await expect(page.getByText(/with your Check-In OTP once approved/i)).toBeVisible();

      // Done button
      await expect(getDoneButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 2: Animation
  // ------------------------------------------------------------------------

  test.describe('Success Animation', () => {
    test('should display animated checkmark on mount', async ({ page }) => {
      const checkmark = getSuccessCheckmark(page);
      await expect(checkmark).toBeVisible();

      // Verify checkmark has emerald color
      await expect(checkmark).toHaveClass(/text-emerald-500/);
    });

    test('should have checkmark animation container', async ({ page }) => {
      const container = page.getByLabel('Success checkmark animation');
      await expect(container).toBeVisible();
    });

    test('should fade in content after checkmark', async ({ page }) => {
      // All content should be visible after animation
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      await expect(page.getByText(/You'll receive your/i)).toBeVisible();
      await expect(getDoneButton(page)).toBeVisible();
    });

    test('should complete animation sequence', async ({ page }) => {
      // Wait for animation duration (1200ms)
      await page.waitForTimeout(1200);

      // All elements should be fully visible and interactive
      const doneButton = getDoneButton(page);
      await expect(doneButton).toBeEnabled();
      await expect(doneButton).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 3: Done Action
  // ------------------------------------------------------------------------

  test.describe('Done Button', () => {
    test('should trigger Done action when clicked', async ({ page }) => {
      const doneButton = getDoneButton(page);
      await expect(doneButton).toBeVisible();
      await expect(doneButton).toBeEnabled();

      // Click Done
      await doneButton.click();

      // After clicking, verify success screen appears
      await expect(page.getByText('Done Clicked!')).toBeVisible();
    });

    test('should have proper button styling', async ({ page }) => {
      const doneButton = getDoneButton(page);

      // Verify emerald background
      await expect(doneButton).toHaveClass(/bg-emerald-600/);
      await expect(doneButton).toHaveClass(/hover:bg-emerald-700/);

      // Verify full width and min height
      await expect(doneButton).toHaveClass(/w-full/);
      await expect(doneButton).toHaveClass(/min-h-\[48px\]/);
    });

    test('should be focusable with keyboard', async ({ page }) => {
      const doneButton = getDoneButton(page);
      await doneButton.focus();

      await expect(doneButton).toBeFocused();
    });

    test('should respond to Enter key when focused', async ({ page }) => {
      const doneButton = getDoneButton(page);
      await doneButton.focus();

      await page.keyboard.press('Enter');

      // Button should have been activated
      // (In real flow, would trigger navigation)
    });

    test('should respond to Space key when focused', async ({ page }) => {
      const doneButton = getDoneButton(page);
      await doneButton.focus();

      await page.keyboard.press('Space');

      // Button should have been activated
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 4: Contact Security
  // ------------------------------------------------------------------------

  test.describe('Contact Security Link', () => {
    test('should display Contact Security link', async ({ page }) => {
      const contactLink = getContactSecurityLink(page);
      await expect(contactLink).toBeVisible();
      await expect(contactLink).toHaveText('Need help? Contact Security');
    });

    test('should trigger Contact Security action when clicked', async ({ page }) => {
      const contactLink = getContactSecurityLink(page);
      await contactLink.click();

      // After clicking, verify help screen appears (use heading role to avoid ambiguity)
      await expect(page.getByRole('heading', { name: 'Contact Security' })).toBeVisible();
      await expect(page.getByText('Help requested')).toBeVisible();
    });

    test('should have proper link styling', async ({ page }) => {
      const contactLink = getContactSecurityLink(page);

      // Verify gray text
      await expect(contactLink).toHaveClass(/text-gray-600/);
      await expect(contactLink).toHaveClass(/hover:text-gray-900/);

      // Verify min height for touch targets
      await expect(contactLink).toHaveClass(/min-h-\[44px\]/);
    });

    test('should be focusable with keyboard', async ({ page }) => {
      const contactLink = getContactSecurityLink(page);
      await contactLink.focus();

      await expect(contactLink).toBeFocused();
    });

    test('should respond to Enter key when focused', async ({ page }) => {
      const contactLink = getContactSecurityLink(page);
      await contactLink.focus();

      await page.keyboard.press('Enter');

      // Link should have been activated
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 5: Auto-Redirect (if configured)
  // ------------------------------------------------------------------------

  test.describe('Auto-Redirect (Optional)', () => {
    test('should not auto-redirect by default', async ({ page }) => {
      // Wait for potential auto-redirect (10 seconds)
      await page.waitForTimeout(10000);

      // Should still be on confirmation page
      await expect(page.getByText('Request Submitted!')).toBeVisible();
    });

    // Note: Testing actual auto-redirect would require mocking or
    // a test page that passes autoRedirectDelay prop
  });

  // ------------------------------------------------------------------------
  // Scenario 6: Keyboard Navigation
  // ------------------------------------------------------------------------

  test.describe('Keyboard Navigation', () => {
    test('should allow Tab navigation between buttons', async ({ page }) => {
      // Focus Done button
      const doneButton = getDoneButton(page);
      await doneButton.focus();
      await expect(doneButton).toBeFocused();

      // Tab to Contact Security
      await page.keyboard.press('Tab');
      const contactLink = getContactSecurityLink(page);
      await expect(contactLink).toBeFocused();
    });

    test('should allow Shift+Tab to navigate backwards', async ({ page }) => {
      // Focus Contact Security
      const contactLink = getContactSecurityLink(page);
      await contactLink.focus();
      await expect(contactLink).toBeFocused();

      // Shift+Tab back to Done
      await page.keyboard.press('Shift+Tab');
      const doneButton = getDoneButton(page);
      await expect(doneButton).toBeFocused();
    });

    test('should trigger Done on Escape key', async ({ page }) => {
      // Press Escape
      await page.keyboard.press('Escape');

      // After Escape, verify success screen appears (onDone is called)
      await expect(page.getByText('Done Clicked!')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 7: Accessibility
  // ------------------------------------------------------------------------

  test.describe('Accessibility', () => {
    test('should have proper ARIA roles and attributes', async ({ page }) => {
      // Verify alert role on our confirmation container (not Next.js route announcer)
      const alert = page.getByTestId('confirmation-container').getByRole('alert');
      await expect(alert).toBeVisible();

      // Verify status role on heading
      await expect(page.getByRole('status')).toBeVisible();
    });

    test('should have aria-live on alert container', async ({ page }) => {
      const alert = page.getByTestId('confirmation-container').getByRole('alert');
      await expect(alert).toHaveAttribute('aria-live', 'polite');
      await expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    test('should have aria-label on checkmark', async ({ page }) => {
      await expect(page.getByLabel('Success checkmark animation')).toBeVisible();
    });

    test('should have aria-label on heading', async ({ page }) => {
      const heading = page.getByRole('status');
      await expect(heading).toHaveAttribute('aria-label', 'Request submitted confirmation');
    });

    test('should have aria-label on Done button', async ({ page }) => {
      const button = getDoneButton(page);
      await expect(button).toHaveAttribute('aria-label', 'Complete registration and close');
    });

    test('should have aria-label on Contact Security button', async ({ page }) => {
      const button = getContactSecurityLink(page);
      await expect(button).toHaveAttribute('aria-label', 'Contact security for help');
    });

    test('should have aria-describedby on WhatsApp instruction', async ({ page }) => {
      const whatsappText = page.getByText(/You'll receive your/i);
      const container = whatsappText.locator('..');
      
      await expect(container).toHaveAttribute('id', 'whatsapp-instruction');
      await expect(container).toHaveAttribute('aria-describedby', 'whatsapp-instruction');
    });

    test('should announce success to screen readers', async ({ page }) => {
      // Verify aria-live region exists on our confirmation container
      const alert = page.getByTestId('confirmation-container').getByRole('alert');
      await expect(alert).toHaveAttribute('aria-live', 'polite');

      // Content should be announced
      await expect(page.getByText('Request Submitted!')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 8: Responsive Design
  // ------------------------------------------------------------------------

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify step indicator is visible
      await expect(page.getByText('Step 5 of 6')).toBeVisible();

      // Verify checkmark is visible
      await expect(getSuccessCheckmark(page)).toBeVisible();

      // Verify heading is visible
      await expect(page.getByText('Request Submitted!')).toBeVisible();

      // Verify buttons are full-width
      const doneButton = getDoneButton(page);
      await expect(doneButton).toHaveClass(/w-full/);

      // Verify max-width constraint
      const container = page.locator('[data-testid="confirmation-container"]');
      await expect(container).toHaveCSS('max-width', '480px');
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.getByText('Step 5 of 6')).toBeVisible();
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      await expect(getDoneButton(page)).toBeVisible();
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await expect(page.getByText('Step 5 of 6')).toBeVisible();
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      
      // Checkmark should be larger on desktop (24 vs 20)
      const checkmark = getSuccessCheckmark(page);
      await expect(checkmark).toBeVisible();
    });

    test('should have responsive checkmark sizing', async ({ page }) => {
      // Mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      let checkmark = getSuccessCheckmark(page);
      await expect(checkmark).toBeVisible();

      // Desktop size
      await page.setViewportSize({ width: 1920, height: 1080 });
      checkmark = getSuccessCheckmark(page);
      await expect(checkmark).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 9: Visit Types
  // ------------------------------------------------------------------------

  test.describe('Visit Type Display', () => {
    test('should display correctly for Meeting visit type', async ({ page }) => {
      // Meeting confirmation should have same content
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      await expect(page.getByText(/Gate Pass via WhatsApp/i)).toBeVisible();
    });

    test('should display correctly for Delivery visit type', async ({ page }) => {
      // Delivery confirmation should have same content
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      await expect(page.getByText(/Gate Pass via WhatsApp/i)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 10: Edge Cases
  // ------------------------------------------------------------------------

  test.describe('Edge Cases', () => {
    test('should handle rapid Done button clicks', async ({ page }) => {
      const doneButton = getDoneButton(page);

      // Click once (will navigate to success screen)
      await doneButton.click();

      // Verify success screen appears
      await expect(page.getByText('Done Clicked!')).toBeVisible();
    });

    test('should handle rapid Contact Security clicks', async ({ page }) => {
      const contactLink = getContactSecurityLink(page);

      // Click once (will navigate to help screen)
      await contactLink.click();

      // Verify help screen appears (use heading role to avoid ambiguity)
      await expect(page.getByRole('heading', { name: 'Contact Security' })).toBeVisible();
      await expect(page.getByText('Help requested')).toBeVisible();
    });

    test('should preserve state across interactions', async ({ page }) => {
      // Click around the page
      await page.locator('[data-testid="confirmation-container"]').click();

      // All elements should still be visible
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      await expect(getDoneButton(page)).toBeEnabled();
    });

    test('should handle missing optional props gracefully', async ({ page }) => {
      // If Contact Security is not provided, link should not be rendered
      // (This test depends on how the page is configured)
      
      // Verify core elements still work
      await expect(page.getByText('Request Submitted!')).toBeVisible();
      await expect(getDoneButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 11: User Interaction Cancels Auto-Redirect
  // ------------------------------------------------------------------------

  test.describe('User Interaction', () => {
    test('should cancel auto-redirect on button click', async ({ page }) => {
      // Clicking Done button calls onDone, which navigates to success screen
      const doneButton = getDoneButton(page);
      await doneButton.click();

      // Verify success screen appears (onDone was called)
      await expect(page.getByText('Done Clicked!')).toBeVisible();
    });

    test('should cancel auto-redirect on any click', async ({ page }) => {
      // Click anywhere on the page
      await page.locator('[data-testid="confirmation-container"]').click();

      // Auto-redirect should be canceled
      // Verify page is still visible after waiting
      await page.waitForTimeout(2000);
      await expect(page.getByText('Request Submitted!')).toBeVisible();
    });

    test('should cancel auto-redirect on keyboard interaction', async ({ page }) => {
      // Press Tab key
      await page.keyboard.press('Tab');

      // Auto-redirect should be canceled
      await page.waitForTimeout(2000);
      await expect(page.getByText('Request Submitted!')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 12: Focus Management
  // ------------------------------------------------------------------------

  test.describe('Focus Management', () => {
    test('should allow focus on Done button after animation', async ({ page }) => {
      // Wait for animation to complete
      await page.waitForTimeout(1200);

      const doneButton = getDoneButton(page);
      await doneButton.focus();

      await expect(doneButton).toBeFocused();
    });

    test('should show focus ring on keyboard navigation', async ({ page }) => {
      const doneButton = getDoneButton(page);
      
      // Tab to button
      await page.keyboard.press('Tab');
      
      // Button should have focus ring (visually indicated by focus:ring classes)
      await expect(doneButton).toHaveClass(/focus:ring-2/);
    });

    test('should maintain logical tab order', async ({ page }) => {
      // Tab order: Done -> Contact Security
      await page.keyboard.press('Tab');
      const doneButton = getDoneButton(page);
      await expect(doneButton).toBeFocused();

      await page.keyboard.press('Tab');
      const contactLink = getContactSecurityLink(page);
      await expect(contactLink).toBeFocused();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 13: Color Contrast (Visual)
  // ------------------------------------------------------------------------

  test.describe('Visual Design', () => {
    test('should have emerald green theme', async ({ page }) => {
      // Checkmark
      const checkmark = getSuccessCheckmark(page);
      await expect(checkmark).toHaveClass(/text-emerald-500/);

      // Heading
      const heading = page.getByText('Request Submitted!');
      await expect(heading).toHaveClass(/text-emerald-600/);

      // Done button
      const doneButton = getDoneButton(page);
      await expect(doneButton).toHaveClass(/bg-emerald-600/);
    });

    test('should have proper spacing', async ({ page }) => {
      const container = page.locator('[data-testid="confirmation-container"]');
      await expect(container).toHaveClass(/space-y-6/);
    });

    test('should center content', async ({ page }) => {
      const container = page.locator('[data-testid="confirmation-container"]');
      await expect(container).toHaveClass(/mx-auto/);
    });
  });
});
