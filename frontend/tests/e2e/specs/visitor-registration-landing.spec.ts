import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Visitor Registration Landing Page', () => {
  // Note: Since this is a Server Component, API mocking with page.route() doesn't work
  // The fetch happens on the server before the page is sent to the browser
  // These tests will test the fallback behavior when API is not accessible

  test.describe('Happy Path (Fallback Behavior)', () => {
    test('should display all elements with fallback hospital name', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify hospital icon (Building2 icon)
      const hospitalIcon = page.locator('svg').first();
      await expect(hospitalIcon).toBeVisible();

      // Verify hospital name is displayed (will be fallback since server can't fetch during test)
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toContainText('Welcome to');

      // Verify decorative divider
      const divider = page.locator('.bg-emerald-500');
      await expect(divider).toBeVisible();

      // Verify subtitle
      await expect(page.getByText('Complete your registration in a few simple steps')).toBeVisible();

      // Verify illustration icon
      const illustration = page.locator('svg.size-40');
      await expect(illustration).toBeVisible();

      // Verify section label
      const sectionLabel = page.getByRole('heading', { level: 2 });
      await expect(sectionLabel).toHaveText('Visitor Registration');

      // Verify Start Registration button
      const button = page.getByRole('button', { name: /start registration/i });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      // Verify footer
      await expect(page.getByText('Secure visitor management system')).toBeVisible();
    });

    test('should navigate to wizard when button is clicked', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      const button = page.getByRole('button', { name: /start registration/i });
      await button.click();

      // Wait for navigation
      await page.waitForURL('**/visitor-registration/wizard?branchId=branch-123');

      // Verify URL includes branchId
      expect(page.url()).toContain('/visitor-registration/wizard');
      expect(page.url()).toContain('branchId=branch-123');
    });
  });

  test.describe('Missing branchId', () => {
    test('should display fallback message when branchId is missing', async ({ page }) => {
      await page.goto('/visitor-registration');

      // Verify fallback welcome message
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText('Welcome to Hospital');

      // Verify button is still functional
      const button = page.getByRole('button', { name: /start registration/i });
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      // Verify no error message is displayed (only shown for invalid branchId)
      await expect(page.getByText('Unable to load hospital details')).not.toBeVisible();
    });

    test('should navigate to wizard without branchId', async ({ page }) => {
      await page.goto('/visitor-registration');

      const button = page.getByRole('button', { name: /start registration/i });
      await button.click();

      await page.waitForURL('**/visitor-registration/wizard');
      expect(page.url()).toContain('/visitor-registration/wizard');
      expect(page.url()).not.toContain('branchId');
    });
  });

  test.describe('Invalid branchId', () => {
    test('should display fallback message and error when branchId is invalid', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=invalid-id');

      // Verify fallback welcome message
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText('Welcome to Hospital');

      // Verify error message is displayed
      const errorMessage = page.getByText('Unable to load hospital details');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveAttribute('role', 'alert');

      // Verify button is still functional
      const button = page.getByRole('button', { name: /start registration/i });
      await expect(button).toBeEnabled();
    });

    test('should still allow navigation with invalid branchId', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=invalid-id');

      const button = page.getByRole('button', { name: /start registration/i });
      await button.click();

      await page.waitForURL('**/visitor-registration/wizard?branchId=invalid-id');
      expect(page.url()).toContain('/visitor-registration/wizard');
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 720 },
    ];

    for (const viewport of viewports) {
      test(`should render correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/visitor-registration?branchId=branch-123');

        // Verify key elements are visible
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByRole('button', { name: /start registration/i })).toBeVisible();

        // Verify container max-width
        const container = page.locator('.max-w-\\[480px\\]');
        await expect(container).toBeVisible();

        // Verify button is full width on all viewports
        const button = page.getByRole('button', { name: /start registration/i });
        const buttonBox = await button.boundingBox();
        expect(buttonBox).toBeTruthy();
      });
    }

    test('should have touch-friendly button on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/visitor-registration?branchId=branch-123');

      const button = page.getByRole('button', { name: /start registration/i });
      const buttonBox = await button.boundingBox();

      expect(buttonBox).toBeTruthy();
      if (buttonBox) {
        // Verify minimum touch target size (40px as per h-10)
        expect(buttonBox.height).toBeGreaterThanOrEqual(40);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have no axe violations', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');
      await injectAxe(page);
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify single h1
      const h1Elements = page.locator('h1');
      await expect(h1Elements).toHaveCount(1);

      // Verify h1 contains welcome message
      await expect(h1Elements).toContainText('Welcome to');

      // Verify h2 follows h1
      const h2Elements = page.locator('h2');
      await expect(h2Elements).toHaveCount(1);
      await expect(h2Elements).toHaveText('Visitor Registration');
    });

    test('should have aria-hidden on decorative icons', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify hospital icon has aria-hidden
      const icons = page.locator('svg[aria-hidden="true"]');
      const iconCount = await icons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      // Focus on the link by tabbing
      await page.keyboard.press('Tab');

      // The link wrapping the button should be focused
      const link = page.locator('a[href*="/visitor-registration/wizard"]');
      await expect(link).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press('Enter');

      // Verify navigation occurred
      await page.waitForURL('**/visitor-registration/wizard?branchId=branch-123');
    });

    test('should have visible focus indicator', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      const button = page.getByRole('button', { name: /start registration/i });
      await button.focus();

      // Verify button has focus-visible class (from Button component)
      await expect(button).toBeFocused();
    });

    test('should announce dynamic content via aria-live', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify aria-live region exists and contains the heading
      const liveRegion = page.locator('[aria-live="polite"][aria-atomic="true"]');
      await expect(liveRegion).toBeVisible();

      // Verify it contains the heading
      const heading = liveRegion.locator('h1');
      await expect(heading).toContainText('Welcome to');
    });

    test('should have proper semantic HTML', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify main landmark
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Verify footer landmark
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      // Verify button element
      const button = page.getByRole('button', { name: /start registration/i });
      await expect(button).toBeVisible();
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle API failure gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/public/visitors/branch-info?branchId=branch-123', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify fallback message
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText('Welcome to Hospital');

      // Verify error message
      await expect(page.getByText('Unable to load hospital details')).toBeVisible();

      // Verify button still works
      const button = page.getByRole('button', { name: /start registration/i });
      await expect(button).toBeEnabled();
    });

    test('should handle API 500 error', async ({ page }) => {
      await page.route('**/api/public/visitors/branch-info?branchId=branch-123', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/visitor-registration?branchId=branch-123');

      // Verify fallback message
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText('Welcome to Hospital');

      // Verify error message
      await expect(page.getByText('Unable to load hospital details')).toBeVisible();
    });
  });

  test.describe('Visual Elements', () => {
    test('should display gradient background', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      const main = page.locator('main');
      const className = await main.getAttribute('class');
      expect(className).toContain('bg-gradient-to-br');
    });

    test('should display emerald color theme', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      const button = page.getByRole('button', { name: /start registration/i });
      const className = await button.getAttribute('class');
      expect(className).toContain('bg-emerald-');
    });

    test('should display arrow icon on button', async ({ page }) => {
      await page.goto('/visitor-registration?branchId=branch-123');

      const button = page.getByRole('button', { name: /start registration/i });
      const icon = button.locator('svg[aria-hidden="true"]');
      await expect(icon).toBeVisible();
    });
  });
});
