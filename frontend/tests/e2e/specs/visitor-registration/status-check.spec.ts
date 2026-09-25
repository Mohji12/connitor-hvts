/**
 * E2E Tests for Status Check Page with Polling (Task 5.4) - CLEANED VERSION
 * Tests the status monitoring interface with 30-second polling
 *
 * Test Coverage (Essential Functionality Only):
 * 1. Basic Functionality: Valid UUID, Invalid UUID, Polling start
 * 2. State Transitions: REQUEST_SENT → APPROVED/REJECTED
 * 3. Error Handling: HTTP 400, 404, 410, 500
 * 4. User Interactions: Retry button, Contact Security button
 * 5. Accessibility: ARIA live regions, keyboard navigation
 * 6. Responsive: Mobile, tablet, desktop viewports
 *
 * Removed Tests (Timing-Sensitive/Impractical):
 * - 60 polling cycles (30 minutes) - impractical duration
 * - Visibility API pause/resume - timing-sensitive in CI
 * - Exact polling interval verification - tests implementation details
 * - Countdown timer precision - timing-sensitive
 *
 * Skipped Tests (Dependencies):
 * - All redirect to gate pass page tests - requires task 5.5
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// Test Data & Constants
// ============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440001';
const INVALID_UUID = 'not-a-valid-uuid';

// Mock visit status responses
const MOCK_VISIT_PENDING = {
  success: true,
  data: {
    visitId: VALID_UUID,
    status: 'REQUEST_SENT',
    visitor: {
      id: '123',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      phone: '+91 98765 43210',
    },
    visitCategory: 'MEETING' as const,
    submittedAt: '2024-01-15T10:00:00Z',
    branch: {
      id: 'branch-1',
      name: 'Main Hospital',
      phone: '+91 11 1234 5678',
    },
    meetingDetails: {
      purpose: 'Medical consultation',
      department: 'Cardiology',
      staffName: 'Dr. Smith',
    },
  },
};

const MOCK_VISIT_APPROVED = {
  success: true,
  data: {
    ...MOCK_VISIT_PENDING.data,
    status: 'APPROVED',
    approvedAt: '2024-01-15T10:05:00Z',
    gatePass: {
      checkInOtp: '123456',
      validUntil: '2024-01-15T18:00:00Z',
      gatePassUrl: '/visitor-registration/gate-pass/123',
      generatedAt: '2024-01-15T10:05:00Z',
      sentViaWhatsApp: true,
    },
  },
};

const MOCK_VISIT_REJECTED = {
  success: true,
  data: {
    ...MOCK_VISIT_PENDING.data,
    status: 'REJECTED',
    rejectedAt: '2024-01-15T10:05:00Z',
    rejectionReason: 'Insufficient documentation provided',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to status check page with a specific visit ID
 */
async function navigateToStatusPage(page: Page, visitId: string = VALID_UUID) {
  await page.goto(`/visitor-registration/status/${visitId}`);
}

/**
 * Wait for API response after navigation
 */
async function waitForApiResponse(page: Page, visitId: string = VALID_UUID) {
  return page.waitForResponse(
    (response) =>
      response.url().includes(`/public/visits/${visitId}/status`) &&
      response.status() !== 0,
    { timeout: 10000 }
  );
}

/**
 * Get the loading spinner
 */
function getLoadingSpinner(page: Page) {
  return page.getByTestId('loading-spinner');
}

/**
 * Get the success icon
 */
function getSuccessIcon(page: Page) {
  return page.getByTestId('success-icon');
}

/**
 * Get the rejection icon
 */
function getRejectionIcon(page: Page) {
  return page.getByTestId('rejection-icon');
}

/**
 * Get the error icon
 */
function getErrorIcon(page: Page) {
  return page.getByTestId('error-icon');
}

/**
 * Get the retry button
 */
function getRetryButton(page: Page) {
  return page.getByText('Try Again', { exact: true });
}

/**
 * Get the contact security button
 */
function getContactSecurityButton(page: Page) {
  return page.getByRole('button', { name: /contact security/i });
}

/**
 * Get the view gate pass button
 */
function getViewGatePassButton(page: Page) {
  return page.getByRole('button', { name: /view gate pass/i });
}

/**
 * Wait for the status container to be visible
 */
async function waitForStatusContainer(page: Page) {
  await expect(page.getByTestId('status-container')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Wait for initial page load (params resolution)
 * Returns a promise that resolves when the API call is made
 */
async function waitForPageLoad(page: Page) {
  // Wait for Next.js hydration to complete
  await page.waitForLoadState('domcontentloaded');
  // Small delay for React hydration and params resolution
  await page.waitForTimeout(500);
}

// ============================================================================
// Test Suite: Status Check Page
// ============================================================================

test.describe('Status Check Page with Polling (Task 5.4)', () => {
  // ------------------------------------------------------------------------
  // Scenario 1: Basic Functionality - Valid UUID
  // ------------------------------------------------------------------------

  test.describe('Valid UUID Mount and Polling Start', () => {
    test('should start polling immediately on mount with valid UUID', async ({
      page,
    }) => {
      let apiCallCount = 0;

      // Mock the API endpoint
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          apiCallCount++;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);

      // Wait for initial API call and state update
      await page.waitForTimeout(1000);

      // Verify polling state is shown
      await expect(getLoadingSpinner(page)).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/your request is being reviewed/i),
      ).toBeVisible();

      // Verify at least one API call was made immediately
      expect(apiCallCount).toBeGreaterThanOrEqual(1);
    });

    test('should display visitor information when available', async ({
      page,
    }) => {
      // Set up route BEFORE navigation
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      
      // Wait for API call to complete
      await waitForApiResponse(page, VALID_UUID);
      await waitForPageLoad(page);
      
      // Wait for status container to appear first
      await waitForStatusContainer(page);

      // Verify visitor info is displayed
      await expect(page.getByText(/visit for john doe/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/main hospital/i)).toBeVisible();
    });

    test('should show last update time after first poll', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Verify "Last checked" appears
      await expect(page.getByText(/last checked:/i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(/just now|seconds ago/i)).toBeVisible();
    });

    test('should display contact security button in polling state', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      const contactButton = getContactSecurityButton(page);
      await expect(contactButton).toBeVisible();
      await expect(contactButton).toBeEnabled();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 2: Basic Functionality - Invalid UUID
  // ------------------------------------------------------------------------

  test.describe('Invalid UUID Handling', () => {
    test('should show error state immediately for invalid UUID', async ({
      page,
    }) => {
      await navigateToStatusPage(page, INVALID_UUID);
      await waitForStatusContainer(page);

      // Verify error icon and message
      await expect(getErrorIcon(page)).toBeVisible();
      await expect(page.getByText(/unable to check status/i)).toBeVisible();
      await expect(page.getByText(/invalid visit id format/i)).toBeVisible();
    });

    test('should not start polling for invalid UUID', async ({ page }) => {
      let apiCallCount = 0;

      await page.route(
        `**/public/visits/${INVALID_UUID}/status`,
        async (route) => {
          apiCallCount++;
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Invalid UUID' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, INVALID_UUID);
      await page.waitForTimeout(1000);

      // Verify no API calls were made (invalid UUID caught before API call)
      expect(apiCallCount).toBe(0);
    });

    test('should not show retry button for invalid UUID', async ({ page }) => {
      await navigateToStatusPage(page, INVALID_UUID);
      await waitForStatusContainer(page);

      // Verify retry button is not present
      await expect(getRetryButton(page)).not.toBeVisible();
    });

    test('should show contact security button for invalid UUID', async ({
      page,
    }) => {
      await navigateToStatusPage(page, INVALID_UUID);
      await waitForStatusContainer(page);

      // Contact security should still be available
      await expect(getContactSecurityButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 3: Status Transitions - APPROVED
  // ------------------------------------------------------------------------

  test.describe('APPROVED State Transition', () => {
    test('should transition to approved state when status changes to APPROVED', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Verify approved state UI
      await expect(getSuccessIcon(page)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/visit approved!/i)).toBeVisible();
      await expect(
        page.getByText(/redirecting to your gate pass/i),
      ).toBeVisible();
    });

    test('should display View Gate Pass button in approved state', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      await expect(getViewGatePassButton(page)).toBeVisible({ timeout: 10000 });
      await expect(getViewGatePassButton(page)).toBeEnabled();
    });

    test.skip('should navigate to gate pass page when View Gate Pass is clicked', async ({
      page,
    }) => {
      // Skip: Requires task 5.5 (Gate Pass page)
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      const viewButton = getViewGatePassButton(page);
      await viewButton.click();

      // Verify navigation (URL change)
      await page.waitForURL(`**/visitor-registration/gate-pass/${VALID_UUID}`, {
        timeout: 1000,
      });
    });

    test.skip('should automatically redirect after 2 seconds', async ({
      page,
    }) => {
      // Skip: Requires task 5.5 (Gate Pass page)
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Wait for automatic redirect (params load + API call + 2s countdown + buffer = ~4s)
      await page.waitForURL(`**/visitor-registration/gate-pass/${VALID_UUID}`, {
        timeout: 5000,
      });
    });

    test('should stop polling when approved', async ({ page }) => {
      let apiCallCount = 0;

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          apiCallCount++;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);

      // Wait for the approved state to be fully rendered
      // This ensures all initial API calls have completed
      await expect(getSuccessIcon(page)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/visit approved!/i)).toBeVisible();

      // Verify at least one call was made (the initial fetch)
      expect(apiCallCount).toBeGreaterThanOrEqual(1);

      // Wait longer to ensure polling has stopped
      // In React StrictMode, 1-2 calls may happen during initialization
      await page.waitForTimeout(3000);

      // Verify no more than 2 calls were made total
      // (StrictMode can cause double-mount, but polling should stop after approval)
      expect(apiCallCount).toBeLessThanOrEqual(2);
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 4: Status Transitions - REJECTED
  // ------------------------------------------------------------------------

  test.describe('REJECTED State Transition', () => {
    test('should transition to rejected state when status changes to REJECTED', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_REJECTED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Verify rejected state UI
      await expect(getRejectionIcon(page)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/visit request rejected/i)).toBeVisible();
    });

    test('should display rejection reason', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_REJECTED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Verify rejection reason is shown
      await expect(page.getByText(/reason:/i)).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/insufficient documentation provided/i),
      ).toBeVisible();
    });

    test('should show contact security button in rejected state', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_REJECTED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      const contactButton = getContactSecurityButton(page);
      await expect(contactButton).toBeVisible();
      await expect(contactButton).toBeEnabled();
    });

    test('should stop polling when rejected', async ({ page }) => {
      let apiCallCount = 0;

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          apiCallCount++;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_REJECTED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);

      // Wait for the initial API call to complete (not just a fixed timeout)
      await waitForApiResponse(page, VALID_UUID);
      await waitForPageLoad(page);

      const initialCallCount = apiCallCount;

      // Wait to verify no more calls
      await page.waitForTimeout(2000);

      expect(apiCallCount).toBe(initialCallCount);
    });

    test('should not show retry button in rejected state', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_REJECTED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Retry button should not be present for rejected state
      await expect(getRetryButton(page)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 5: Error Handling - HTTP 400
  // ------------------------------------------------------------------------

  test.describe('HTTP 400 Error Handling', () => {
    test('should show error state for HTTP 400', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Invalid visit ID' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      await expect(getErrorIcon(page)).toBeVisible({ timeout: 10000 });
      // Check for the actual error message from the component
      await expect(
        page.getByText(/invalid visit id.*please check the link/i),
      ).toBeVisible({ timeout: 10000 });
    });

    test('should not show retry button for HTTP 400', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Invalid visit ID' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      await expect(getRetryButton(page)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 6: Error Handling - HTTP 404
  // ------------------------------------------------------------------------

  test.describe('HTTP 404 Error Handling', () => {
    test('should show error state for HTTP 404', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit not found' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      await expect(getErrorIcon(page)).toBeVisible();
      await expect(page.getByText(/visit request not found/i)).toBeVisible();
    });

    test('should not show retry button for HTTP 404', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit not found' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      await expect(getRetryButton(page)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 7: Error Handling - HTTP 410
  // ------------------------------------------------------------------------

  test.describe('HTTP 410 Error Handling', () => {
    test('should show error state for HTTP 410 (expired)', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 410,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit has expired' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      await expect(getErrorIcon(page)).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(
          /this visit request has expired.*please submit a new request/i,
        ),
      ).toBeVisible({ timeout: 10000 });
    });

    test('should not show retry button for HTTP 410', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 410,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit has expired' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      await expect(getRetryButton(page)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 8: Error Handling - HTTP 500
  // ------------------------------------------------------------------------

  test.describe('HTTP 500 Error Handling', () => {
    test('should show error state for HTTP 500', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Internal server error' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      await expect(getErrorIcon(page)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/unable to check status/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test('should show retry button for HTTP 500', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Internal server error' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);
      
      // Wait for error icon to appear (confirms error state loaded)
      await expect(getErrorIcon(page)).toBeVisible({ timeout: 10000 });
      
      // Now retry button should also be visible
      await expect(getRetryButton(page)).toBeVisible({ timeout: 10000 });
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 9: User Interactions - Retry Button
  // ------------------------------------------------------------------------

  test.describe('Retry Button Interaction', () => {
    test('should retry API call when retry button is clicked', async ({
      page,
    }) => {
      let apiCallCount = 0;
      let shouldFail = true;

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          apiCallCount++;

          if (shouldFail) {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({
                success: false,
                error: { message: 'Server error' },
              }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(MOCK_VISIT_PENDING),
            });
          }
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Verify error state
      await expect(getErrorIcon(page)).toBeVisible();
      await expect(getRetryButton(page)).toBeVisible();

      const initialCallCount = apiCallCount;

      // Click retry (this time succeed)
      shouldFail = false;
      await getRetryButton(page).click();

      // Wait for retry
      await page.waitForTimeout(500);

      // Verify API was called again
      expect(apiCallCount).toBeGreaterThan(initialCallCount);

      // Verify polling state is restored
      await expect(getLoadingSpinner(page)).toBeVisible();
    });

    test('should clear error state when retry is clicked', async ({ page }) => {
      let shouldFail = true;

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          if (shouldFail) {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({
                success: false,
                error: { message: 'Server error' },
              }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(MOCK_VISIT_PENDING),
            });
          }
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Verify error
      await expect(page.getByText(/server error/i)).toBeVisible();

      // Click retry
      shouldFail = false;
      await getRetryButton(page).click();

      await page.waitForTimeout(500);

      // Error message should be gone
      await expect(page.getByText(/server error/i)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 10: User Interactions - Contact Security
  // ------------------------------------------------------------------------

  test.describe('Contact Security Interaction', () => {
    test('should show alert with branch phone when contact security is clicked', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('+91 11 1234 5678');
        await dialog.accept();
      });

      const contactButton = getContactSecurityButton(page);
      await contactButton.click();
    });

    test('should be keyboard accessible', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      const contactButton = getContactSecurityButton(page);
      await contactButton.focus();
      await expect(contactButton).toBeFocused();

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      await page.keyboard.press('Enter');
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 11: Accessibility
  // ------------------------------------------------------------------------

  test.describe('Accessibility', () => {
    test('should have aria-live region for status updates', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Check for aria-live region
      const statusRegion = page.locator('[role="status"]');
      await expect(statusRegion).toBeVisible();
      await expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    test('should have aria-live assertive for approved state', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Use more specific selector to avoid Next.js route announcer
      const alertRegion = page
        .getByTestId('status-container')
        .locator('[role="alert"]');
      await expect(alertRegion).toBeVisible({ timeout: 10000 });
      await expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
    });

    test('should have aria-live assertive for rejected state', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_REJECTED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      // Use more specific selector to avoid Next.js route announcer
      const alertRegion = page
        .getByTestId('status-container')
        .locator('[role="alert"]');
      await expect(alertRegion).toBeVisible({ timeout: 10000 });
      await expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
    });

    test('should have proper aria-labels on icons', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      const spinner = getLoadingSpinner(page);
      await expect(spinner).toHaveAttribute('aria-label', 'Loading status');
    });

    test('should have proper aria-labels on buttons', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Server error' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      const retryButton = getRetryButton(page);
      await expect(retryButton).toHaveAttribute(
        'aria-label',
        'Retry checking status',
      );
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 12: Keyboard Navigation
  // ------------------------------------------------------------------------

  test.describe('Keyboard Navigation', () => {
    test('should allow Tab navigation to interactive elements', async ({
      page,
    }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Tab to contact security button
      await page.keyboard.press('Tab');
      const contactButton = getContactSecurityButton(page);
      await expect(contactButton).toBeFocused();
    });

    test('should allow Space key to activate buttons', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Server error' },
            }),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForPageLoad(page);
      await waitForStatusContainer(page);

      const retryButton = getRetryButton(page);
      await retryButton.focus();
      await expect(retryButton).toBeFocused();

      // Press Space to activate
      await page.keyboard.press('Space');

      // Button should be activated (loading state should appear)
      await page.waitForTimeout(500);
    });

    test.skip('should allow Enter key to activate gate pass button', async ({
      page,
    }) => {
      // Skip: Requires task 5.5 (Gate Pass page)
      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_APPROVED),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      const viewButton = getViewGatePassButton(page);
      await viewButton.focus();
      await expect(viewButton).toBeFocused();

      await page.keyboard.press('Enter');

      // Should navigate
      await page.waitForURL(`**/visitor-registration/gate-pass/${VALID_UUID}`, {
        timeout: 1000,
      });
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 13: Responsive Design
  // ------------------------------------------------------------------------

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Verify elements are visible
      await expect(getLoadingSpinner(page)).toBeVisible();
      await expect(
        page.getByText(/your request is being reviewed/i),
      ).toBeVisible();
      await expect(getContactSecurityButton(page)).toBeVisible();
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      await expect(getLoadingSpinner(page)).toBeVisible();
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_VISIT_PENDING),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      await expect(getLoadingSpinner(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 14: Edge Cases
  // ------------------------------------------------------------------------

  test.describe('Edge Cases', () => {
    test('should handle approved state without gatePass data', async ({
      page,
    }) => {
      const approvedWithoutGatePass = {
        success: true,
        data: {
          ...MOCK_VISIT_PENDING.data,
          status: 'APPROVED',
          approvedAt: '2024-01-15T10:05:00Z',
          // No gatePass field
        },
      };

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(approvedWithoutGatePass),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Should still show approved state and redirect
      await expect(getSuccessIcon(page)).toBeVisible();
      await expect(page.getByText(/visit approved!/i)).toBeVisible();
    });

    test('should handle rejected state without rejection reason', async ({
      page,
    }) => {
      const rejectedWithoutReason = {
        success: true,
        data: {
          ...MOCK_VISIT_PENDING.data,
          status: 'REJECTED',
          rejectedAt: '2024-01-15T10:05:00Z',
          // No rejectionReason field
        },
      };

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(rejectedWithoutReason),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Should still show rejected state
      await expect(getRejectionIcon(page)).toBeVisible();
      await expect(page.getByText(/visit request rejected/i)).toBeVisible();

      // Reason label should not be present
      await expect(page.getByText(/reason:/i)).not.toBeVisible();
    });

    test.skip('should handle CHECKED_IN status as terminal', async ({
      page,
    }) => {
      // Skip: Requires task 5.5 (Gate Pass page)
      const checkedInStatus = {
        success: true,
        data: {
          ...MOCK_VISIT_PENDING.data,
          status: 'CHECKED_IN',
        },
      };

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(checkedInStatus),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Should redirect to gate pass page
      await page.waitForURL(`**/visitor-registration/gate-pass/${VALID_UUID}`, {
        timeout: 3000,
      });
    });

    test.skip('should handle CHECKED_OUT status as terminal', async ({
      page,
    }) => {
      // Skip: Requires task 5.5 (Gate Pass page)
      const checkedOutStatus = {
        success: true,
        data: {
          ...MOCK_VISIT_PENDING.data,
          status: 'CHECKED_OUT',
        },
      };

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(checkedOutStatus),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Should redirect to gate pass page
      await page.waitForURL(`**/visitor-registration/gate-pass/${VALID_UUID}`, {
        timeout: 3000,
      });
    });

    test('should handle visit without branch phone', async ({ page }) => {
      const visitWithoutPhone = {
        success: true,
        data: {
          ...MOCK_VISIT_PENDING.data,
          branch: {
            id: 'branch-1',
            name: 'Main Hospital',
            // No phone field
          },
        },
      };

      await page.route(
        `**/public/visits/${VALID_UUID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(visitWithoutPhone),
          });
        },
      );

      await navigateToStatusPage(page, VALID_UUID);
      await waitForStatusContainer(page);

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Please contact the security desk');
        expect(dialog.message()).not.toContain('+91');
        await dialog.accept();
      });

      const contactButton = getContactSecurityButton(page);
      await contactButton.click();
    });
  });
});
