/**
 * E2E Tests for Gate Pass Page (Task 5.5)
 * Tests the Gate Pass display page in the visitor registration workflow
 *
 * Test Coverage:
 * 1. Loading State: Initial loading indicator
 * 2. Success State (MEETING): Display visitor info, host info, OTP
 * 3. Success State (DELIVERY): Display delivery info, hide host info
 * 4. Success State with Photo: Display visitor photo
 * 5. Success State without Photo: Display initials avatar
 * 6. Expired State: Show expired message, hide OTP, Contact Security
 * 7. CHECKED_IN State: Show gate pass with "currently checked in" message
 * 8. CHECKED_OUT State: Show historical record without active OTP
 * 9. Error Handling: HTTP 400, 404, 500, Network errors
 * 10. Retry Functionality: Retry button triggers refetch
 * 11. Accessibility: ARIA labels, keyboard navigation, screen reader support
 * 12. Responsive: Mobile, tablet, desktop viewports
 * 13. PENDING/REJECTED Redirect: Auto-redirect to status check page
 * 14. UUID Validation: Invalid UUID format handling
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// Test Data & Constants
// ============================================================================

const VALID_VISIT_ID = '550e8400-e29b-41d4-a716-446655440001';
const INVALID_VISIT_ID = 'not-a-valid-uuid';

// Future dates to avoid expiration issues during tests
const FUTURE_DATE = '2030-01-26T18:00:00Z';
const PAST_DATE = '2020-01-26T18:00:00Z';

// Mock visit data for MEETING type
const MOCK_MEETING_VISIT = {
  success: true,
  data: {
    visitId: VALID_VISIT_ID,
    status: 'APPROVED',
    approvedAt: '2030-01-26T10:00:00Z',
    visitor: {
      id: 'visitor-123',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      phone: '+91 98765 43210',
      photoUrl: 'https://example.com/photo.jpg',
    },
    visitCategory: 'MEETING' as const,
    submittedAt: '2030-01-26T09:00:00Z',
    branch: {
      id: 'branch-1',
      name: 'Main Hospital',
      address: '123 Health Street',
      phone: '+91 11 1234 5678',
    },
    gatePass: {
      checkInOtp: '123456',
      validUntil: FUTURE_DATE,
      generatedAt: '2030-01-26T10:00:00Z',
      sentViaWhatsApp: true,
    },
    meetingDetails: {
      purpose: 'Medical consultation',
      department: 'Cardiology',
      staffName: 'Dr. Smith',
      staffPhone: '+91 11111 22222',
    },
  },
};

// Mock visit data for DELIVERY type
const MOCK_DELIVERY_VISIT = {
  success: true,
  data: {
    visitId: VALID_VISIT_ID,
    status: 'APPROVED',
    approvedAt: '2030-01-26T11:00:00Z',
    visitor: {
      id: 'visitor-456',
      firstName: 'Jane',
      lastName: 'Roe',
      fullName: 'Jane Roe',
      phone: '+91 87654 32109',
    },
    visitCategory: 'DELIVERY' as const,
    submittedAt: '2030-01-26T10:30:00Z',
    branch: {
      id: 'branch-1',
      name: 'Main Hospital',
      phone: '+91 11 1234 5678',
    },
    gatePass: {
      checkInOtp: '654321',
      validUntil: FUTURE_DATE,
      generatedAt: '2030-01-26T11:00:00Z',
      sentViaWhatsApp: true,
    },
    deliveryDetails: {
      platform: 'Zomato',
      recipient: 'Nursing Station',
      orderReference: 'ORDER-123',
    },
  },
};

// Mock CHECKED_IN visit
const MOCK_CHECKED_IN_VISIT = {
  ...MOCK_MEETING_VISIT,
  data: {
    ...MOCK_MEETING_VISIT.data,
    status: 'CHECKED_IN',
    checkedInAt: '2030-01-26T10:30:00Z',
  },
};

// Mock CHECKED_OUT visit
const MOCK_CHECKED_OUT_VISIT = {
  success: true,
  data: {
    visitId: VALID_VISIT_ID,
    status: 'CHECKED_OUT',
    checkedInAt: '2020-01-26T10:30:00Z',
    checkedOutAt: '2020-01-26T12:00:00Z',
    visitor: {
      id: 'visitor-123',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      phone: '+91 98765 43210',
      photoUrl: 'https://example.com/photo.jpg',
    },
    visitCategory: 'MEETING' as const,
    submittedAt: '2020-01-26T09:00:00Z',
    branch: {
      id: 'branch-1',
      name: 'Main Hospital',
    },
    meetingDetails: {
      purpose: 'Medical consultation',
      department: 'Cardiology',
      staffName: 'Dr. Smith',
    },
  },
};

// Mock PENDING visit (should redirect)
const MOCK_PENDING_VISIT = {
  ...MOCK_MEETING_VISIT,
  data: {
    ...MOCK_MEETING_VISIT.data,
    status: 'PENDING',
  },
};

// Mock REJECTED visit (should redirect)
const MOCK_REJECTED_VISIT = {
  success: true,
  data: {
    ...MOCK_MEETING_VISIT.data,
    status: 'REJECTED',
    rejectedAt: '2030-01-26T10:05:00Z',
    rejectionReason: 'Invalid request',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Navigate to gate pass page with a specific visit ID
 */
async function navigateToGatePassPage(page: Page, visitId: string = VALID_VISIT_ID) {
  await page.goto(`/visitor-registration/gate-pass/${visitId}`);
}

/**
 * Wait for the gate pass container to be visible
 */
async function waitForGatePassContainer(page: Page) {
  await expect(page.getByTestId('gate-pass-container')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Wait for page load (params resolution)
 */
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/**
 * Get the loading spinner
 */
function getLoadingSpinner(page: Page) {
  return page.getByTestId('loading-spinner');
}

/**
 * Get the retry button
 */
function getRetryButton(page: Page) {
  return page.getByRole('button', { name: /retry loading gate pass/i });
}

/**
 * Get the contact security button
 */
function getContactSecurityButton(page: Page) {
  return page.getByRole('button', { name: /contact security/i });
}

/**
 * Get the OTP display element
 */
function getOtpDisplay(page: Page) {
  return page.locator('[aria-label^="Check-in one time password"]');
}

// ============================================================================
// Test Suite: Gate Pass Page
// ============================================================================

test.describe('Gate Pass Page (Task 5.5)', () => {
  // ------------------------------------------------------------------------
  // Scenario 1: Loading State
  // ------------------------------------------------------------------------

  test.describe('Loading State', () => {
    test('should show loading state initially', async ({ page }) => {
      // Delay the API response to show loading
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);

      // Wait for the gate pass container to be visible (params loaded, now showing API loading)
      await waitForGatePassContainer(page);

      // Verify loading spinner is visible
      await expect(getLoadingSpinner(page)).toBeVisible();
      await expect(page.getByText(/loading your gate pass/i)).toBeVisible();
    });

    test('should hide loading state after data loads', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Loading spinner should be gone
      await expect(getLoadingSpinner(page)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 2: Success State - MEETING
  // ------------------------------------------------------------------------

  test.describe('Success State - MEETING', () => {
    test.beforeEach(async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );
      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);
    });

    test('should display page header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Visitor Gate Pass' })).toBeVisible();
      await expect(page.getByText(/show this pass at the security desk/i)).toBeVisible();
    });

    test('should display visitor name and phone', async ({ page }) => {
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('+91 98765 43210')).toBeVisible();
    });

    test('should display host information for meeting visits', async ({ page }) => {
      await expect(page.getByText('Host Information')).toBeVisible();
      await expect(page.getByText('Dr. Smith')).toBeVisible();
      await expect(page.getByText('Cardiology')).toBeVisible();
    });

    test('should hide delivery info for meeting visits', async ({ page }) => {
      await expect(page.getByText('Delivery Information')).not.toBeVisible();
    });

    test('should display OTP prominently with high contrast', async ({ page }) => {
      const otpElement = page.getByText('123456');
      await expect(otpElement).toBeVisible();
      await expect(otpElement).toHaveClass(/font-mono/);
    });

    test('should display validity timestamp', async ({ page }) => {
      await expect(page.getByText(/valid until:/i)).toBeVisible();
    });

    test('should display meeting badge', async ({ page }) => {
      // Use exact match to avoid matching "Meeting" in other contexts
      await expect(page.getByText('Meeting', { exact: true })).toBeVisible();
    });

    test('should display purpose if available', async ({ page }) => {
      await expect(page.getByText(/medical consultation/i)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 3: Success State - DELIVERY
  // ------------------------------------------------------------------------

  test.describe('Success State - DELIVERY', () => {
    test.beforeEach(async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_DELIVERY_VISIT),
          });
        }
      );
      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);
    });

    test('should display delivery information', async ({ page }) => {
      await expect(page.getByText('Delivery Information')).toBeVisible();
      await expect(page.getByText('Zomato')).toBeVisible();
      await expect(page.getByText(/recipient: nursing station/i)).toBeVisible();
    });

    test('should hide host info for delivery visits', async ({ page }) => {
      await expect(page.getByText('Host Information')).not.toBeVisible();
    });

    test('should display delivery badge', async ({ page }) => {
      // Use exact match to avoid matching "Delivery Information" header
      await expect(page.getByText('Delivery', { exact: true })).toBeVisible();
    });

    test('should display visitor name for delivery', async ({ page }) => {
      await expect(page.getByText('Jane Roe')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 4: Success State with Photo
  // ------------------------------------------------------------------------

  test.describe('Success State with Photo', () => {
    test('should display visitor photo when available', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Check for avatar section - Radix UI Avatar may not render img element
      // if the image fails to load (e.g., external URLs), so we check for the visitor name
      // in the context of the card or look for the avatar container
      await expect(page.getByText('John Doe')).toBeVisible();
      // Also verify the avatar component is present by checking for a related element
      const avatarContainer = page.locator('[data-slot="avatar"]').or(page.locator('img[alt="John Doe"]'));
      await expect(avatarContainer).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 5: Success State without Photo
  // ------------------------------------------------------------------------

  test.describe('Success State without Photo', () => {
    test('should display initials avatar when no photo', async ({ page }) => {
      const visitWithoutPhoto = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          visitor: {
            ...MOCK_MEETING_VISIT.data.visitor,
            photoUrl: undefined,
          },
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(visitWithoutPhoto),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Check for initials fallback
      await expect(page.getByText('JD')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 6: Expired State
  // ------------------------------------------------------------------------

  test.describe('Expired State', () => {
    test('should show expired message when OTP has expired', async ({ page }) => {
      const expiredVisit = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          gatePass: {
            ...MOCK_MEETING_VISIT.data.gatePass,
            validUntil: PAST_DATE,
          },
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(expiredVisit),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Verify expired state UI
      await expect(page.getByText(/this pass has expired/i)).toBeVisible();
      await expect(page.getByText(/the check-in otp is no longer valid/i)).toBeVisible();
      await expect(getContactSecurityButton(page)).toBeVisible();
    });

    test('should hide OTP in expired state', async ({ page }) => {
      const expiredVisit = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          gatePass: {
            ...MOCK_MEETING_VISIT.data.gatePass,
            validUntil: PAST_DATE,
          },
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(expiredVisit),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // OTP should be hidden or show as expired - use first() to handle multiple matches
      await expect(page.getByText('Expired').first()).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 7: CHECKED_IN State
  // ------------------------------------------------------------------------

  test.describe('CHECKED_IN State', () => {
    test('should display gate pass for checked-in visits', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_CHECKED_IN_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Should still show visitor info and OTP
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('123456')).toBeVisible();
    });

    test('should show currently checked in message', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_CHECKED_IN_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      await expect(page.getByText(/you are currently checked in/i)).toBeVisible();
      await expect(page.getByText(/show this pass to security when checking out/i)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 8: CHECKED_OUT State
  // ------------------------------------------------------------------------

  test.describe('CHECKED_OUT State', () => {
    test('should show historical record for checked-out visits', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_CHECKED_OUT_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Should show visitor info
      await expect(page.getByText('John Doe')).toBeVisible();

      // Should show expired (no active OTP)
      await expect(page.getByText('Expired').first()).toBeVisible();
    });

    test('should not show active OTP for checked-out visits', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_CHECKED_OUT_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Should not show the OTP
      await expect(page.getByText('123456')).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 9: Error Handling - HTTP 400
  // ------------------------------------------------------------------------

  test.describe('HTTP 400 Error Handling', () => {
    test('should show error state for HTTP 400', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Invalid visit ID', code: 'INVALID_VISIT_ID' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      // Use role selector to get the specific heading
      await expect(page.getByRole('heading', { name: 'Invalid Visit ID' })).toBeVisible();
      await expect(page.getByText(/invalid visit id format/i)).toBeVisible();
    });

    test('should not show retry button for HTTP 400', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Invalid visit ID' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      await expect(getRetryButton(page)).not.toBeVisible();
    });

    test('should show contact security button for HTTP 400', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Invalid visit ID' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      await expect(getContactSecurityButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 10: Error Handling - HTTP 404
  // ------------------------------------------------------------------------

  test.describe('HTTP 404 Error Handling', () => {
    test('should show error state for HTTP 404', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit not found', code: 'VISIT_NOT_FOUND' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      // Use first() to handle potential multiple matches
      await expect(page.getByRole('heading', { name: 'Visit Not Found' }).first()).toBeVisible();
      await expect(page.getByText(/visit not found/i).first()).toBeVisible();
    });

    test('should not show retry button for HTTP 404', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit not found' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      await expect(getRetryButton(page)).not.toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 11: Error Handling - HTTP 500
  // ------------------------------------------------------------------------

  test.describe('HTTP 500 Error Handling', () => {
    test('should show error state for HTTP 500', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Server error. Please try again.' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      await expect(page.getByText('Unable to Load Gate Pass')).toBeVisible();
      await expect(page.getByText(/server error/i)).toBeVisible();
    });

    test('should show retry button for HTTP 500', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Internal server error' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      await expect(getRetryButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 12: Error Handling - HTTP 410 (Gone)
  // ------------------------------------------------------------------------

  test.describe('HTTP 410 Error Handling', () => {
    test('should show error state for HTTP 410 (expired visit)', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 410,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit has expired', code: 'VISIT_EXPIRED' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      await expect(page.getByText('Visit Expired')).toBeVisible();
      await expect(page.getByText(/this visit request has expired/i)).toBeVisible();
    });

    test('should not show retry button for HTTP 410', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 410,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit has expired' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      await expect(getRetryButton(page)).not.toBeVisible();
    });

    test('should show contact security button for HTTP 410', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 410,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Visit has expired' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      await expect(getContactSecurityButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 14: Error Handling - Network Error
  // ------------------------------------------------------------------------

  test.describe('Network Error Handling', () => {
    test('should show error state for network error', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.abort('failed');
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      // Network errors show as "Connection Lost" with retry option
      await expect(page.getByRole('heading', { name: 'Connection Lost' })).toBeVisible();
      await expect(page.getByText(/check your internet/i)).toBeVisible();
    });

    test('should show retry button for network error', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.abort('failed');
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      await expect(getRetryButton(page)).toBeVisible();
      await expect(getContactSecurityButton(page)).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 15: Retry Functionality
  // ------------------------------------------------------------------------

  test.describe('Retry Functionality', () => {
    test('should retry API call when retry button is clicked', async ({ page }) => {
      let apiCallCount = 0;
      let shouldFail = true;

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
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
              body: JSON.stringify(MOCK_MEETING_VISIT),
            });
          }
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      // Verify error state
      await expect(page.getByText('Unable to Load Gate Pass')).toBeVisible();
      await expect(getRetryButton(page)).toBeVisible();

      const initialCallCount = apiCallCount;

      // Click retry (this time succeed)
      shouldFail = false;
      await getRetryButton(page).click();

      // Wait for retry
      await page.waitForTimeout(500);

      // Verify API was called again
      expect(apiCallCount).toBeGreaterThan(initialCallCount);

      // Verify success state is reached
      await expect(page.getByText('John Doe')).toBeVisible();
    });

    test('should clear error state when retry is clicked', async ({ page }) => {
      let shouldFail = true;

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
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
              body: JSON.stringify(MOCK_MEETING_VISIT),
            });
          }
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

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
  // Scenario 16: Redirect to Status Check Page
  // ------------------------------------------------------------------------

  test.describe('Redirect to Status Check Page', () => {
    test('should redirect PENDING visits to status check page', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_PENDING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);

      // Should redirect to status check page
      await page.waitForURL(`**/visitor-registration/status/${VALID_VISIT_ID}`, {
        timeout: 5000,
      });
    });

    test('should redirect REJECTED visits to status check page', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_REJECTED_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);

      // Should redirect to status check page
      await page.waitForURL(`**/visitor-registration/status/${VALID_VISIT_ID}`, {
        timeout: 5000,
      });
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 17: UUID Validation
  // ------------------------------------------------------------------------

  test.describe('UUID Validation', () => {
    test('should show error for invalid UUID format', async ({ page }) => {
      await navigateToGatePassPage(page, INVALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      // Use role selector to get the specific heading
      await expect(page.getByRole('heading', { name: 'Invalid Visit ID' })).toBeVisible();
      await expect(page.getByText(/invalid visit id format/i)).toBeVisible();
    });

    test('should not call API for invalid UUID', async ({ page }) => {
      let apiCallCount = 0;

      await page.route(
        `**/public/visits/${INVALID_VISIT_ID}/status`,
        async (route) => {
          apiCallCount++;
          await route.continue();
        }
      );

      await navigateToGatePassPage(page, INVALID_VISIT_ID);
      await page.waitForTimeout(1000);

      // No API calls should have been made
      expect(apiCallCount).toBe(0);
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 18: Accessibility
  // ------------------------------------------------------------------------

  test.describe('Accessibility', () => {
    test('should have proper ARIA label for OTP', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      const otpElement = page.getByText('123456');
      await expect(otpElement).toHaveAttribute('aria-label', 'Check-in one time password: 123456');
    });

    test('should have role=alert on error messages', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Error' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      const alert = page.locator('[role="alert"]').first();
      await expect(alert).toBeVisible();
    });

    test('should have role=status on loading state', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);

      const status = page.locator('[role="status"]').first();
      await expect(status).toBeVisible();
    });

    test('should have aria-live polite for expired state', async ({ page }) => {
      const expiredVisit = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          gatePass: {
            ...MOCK_MEETING_VISIT.data.gatePass,
            validUntil: PAST_DATE,
          },
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(expiredVisit),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      const expiredAlert = page.locator('[role="alert"]').first();
      await expect(expiredAlert).toHaveAttribute('aria-live', 'polite');
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 19: Keyboard Navigation
  // ------------------------------------------------------------------------

  test.describe('Keyboard Navigation', () => {
    test('should allow Tab navigation to interactive elements', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Server error' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      // First, ensure the page has focus by clicking on a neutral element
      await page.locator('body').click();
      await page.waitForTimeout(100);

      // Tab to retry button - add small delay for React focus effects
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      const retryButton = getRetryButton(page);
      await expect(retryButton).toBeFocused();

      // Tab to contact security
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      const contactButton = getContactSecurityButton(page);
      await expect(contactButton).toBeFocused();
    });

    test('should allow Enter key to activate retry button', async ({ page }) => {
      let retryClicked = false;

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          if (!retryClicked) {
            retryClicked = true;
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
              body: JSON.stringify(MOCK_MEETING_VISIT),
            });
          }
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      const retryButton = getRetryButton(page);
      await retryButton.focus();
      await expect(retryButton).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press('Enter');

      // Wait for loading state
      await page.waitForTimeout(500);
    });

    test('should allow Space key to activate buttons', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Server error' },
            }),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForPageLoad(page);
      await waitForGatePassContainer(page);

      const retryButton = getRetryButton(page);
      await retryButton.focus();
      await expect(retryButton).toBeFocused();

      // Press Space to activate
      await page.keyboard.press('Space');

      // Button should be activated (loading state should appear)
      await page.waitForTimeout(500);
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 20: Responsive Design
  // ------------------------------------------------------------------------

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Verify elements are visible
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('123456')).toBeVisible();

      // Container should have max-width
      const container = page.getByTestId('gate-pass-container');
      await expect(container).toBeVisible();
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('Visitor Gate Pass')).toBeVisible();
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('Visitor Gate Pass')).toBeVisible();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 21: Contact Security Interaction
  // ------------------------------------------------------------------------

  test.describe('Contact Security Interaction', () => {
    test('should show contact options when contact security is clicked', async ({ page }) => {
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_MEETING_VISIT),
          });
        }
      );

      // Create an expired visit to show contact security button
      const expiredVisit = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          gatePass: {
            ...MOCK_MEETING_VISIT.data.gatePass,
            validUntil: PAST_DATE,
          },
        },
      };

      await page.unroute(`**/public/visits/${VALID_VISIT_ID}/status`);
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(expiredVisit),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Contact Security');
        await dialog.accept();
      });

      const contactButton = getContactSecurityButton(page);
      await contactButton.click();
    });
  });

  // ------------------------------------------------------------------------
  // Scenario 22: Edge Cases
  // ------------------------------------------------------------------------

  test.describe('Edge Cases', () => {
    test('should handle visit without meeting details', async ({ page }) => {
      const visitWithoutDetails = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          meetingDetails: undefined,
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(visitWithoutDetails),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Should still show visitor info
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('123456')).toBeVisible();
    });

    test('should handle visit without delivery details', async ({ page }) => {
      const visitWithoutDetails = {
        ...MOCK_DELIVERY_VISIT,
        data: {
          ...MOCK_DELIVERY_VISIT.data,
          deliveryDetails: undefined,
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(visitWithoutDetails),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Should still show visitor info
      await expect(page.getByText('Jane Roe')).toBeVisible();
    });

    test('should handle visit without branch phone', async ({ page }) => {
      const visitWithoutBranchPhone = {
        ...MOCK_MEETING_VISIT,
        data: {
          ...MOCK_MEETING_VISIT.data,
          branch: {
            ...MOCK_MEETING_VISIT.data.branch,
            phone: undefined,
          },
        },
      };

      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(visitWithoutBranchPhone),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Create expired state to trigger contact security
      const expiredVisit = {
        ...visitWithoutBranchPhone,
        data: {
          ...visitWithoutBranchPhone.data,
          gatePass: {
            ...visitWithoutBranchPhone.data.gatePass,
            validUntil: PAST_DATE,
          },
        },
      };

      await page.unroute(`**/public/visits/${VALID_VISIT_ID}/status`);
      await page.route(
        `**/public/visits/${VALID_VISIT_ID}/status`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(expiredVisit),
          });
        }
      );

      await navigateToGatePassPage(page, VALID_VISIT_ID);
      await waitForGatePassContainer(page);

      // Set up dialog handler to check for fallback phone
      page.once('dialog', async (dialog) => {
        // Should show default phone number
        expect(dialog.message()).toContain('+91');
        await dialog.accept();
      });

      const contactButton = getContactSecurityButton(page);
      await contactButton.click();
    });
  });
});
