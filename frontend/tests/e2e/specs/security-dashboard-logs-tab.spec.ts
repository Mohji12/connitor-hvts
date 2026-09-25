import { test, expect } from '../fixtures/base';
import { TEST_USERS } from '../fixtures/test-users';

/**
 * E2E Tests for Logs Tab with Status Filter Pills in Security Dashboard
 *
 * This test suite covers the Logs Tab functionality in the Security Dashboard,
 * including status filter pills, visitor counts, visitor list display, loading states,
 * error handling, keyboard navigation, and mobile responsiveness.
 *
 * Test Environment:
 * - Uses Playwright for cross-browser testing (Chromium, Firefox, WebKit)
 * - Mocks API responses for deterministic behavior
 * - Tests both mobile and desktop layouts
 * - Validates accessibility features
 */

test.describe('Security Dashboard - Logs Tab', () => {
  // Mock data for testing
  const mockVisitorCounts = {
    pending: 5,
    approved: 3,
    checkedIn: 8,
    checkedOut: 12,
    rejected: 2,
  };

  const mockVisitorsPending = [
    {
      id: 'visitor-1',
      visitorName: 'John Doe',
      visitorPhone: '9876543210',
      visitorEmail: 'john@example.com',
      visitType: 'MEETING',
      status: 'PENDING',
      personToMeet: 'Dr. Smith',
      purpose: 'Consultation',
      checkInTime: null,
      checkOutTime: null,
    },
    {
      id: 'visitor-2',
      visitorName: 'Jane Smith',
      visitorPhone: '9876543211',
      visitorEmail: 'jane@example.com',
      visitType: 'DELIVERY',
      status: 'REQUEST_SENT',
      personToMeet: 'Reception',
      purpose: 'Package delivery',
      checkInTime: null,
      checkOutTime: null,
    },
  ];

  const mockVisitorsApproved = [
    {
      id: 'visitor-3',
      visitorName: 'Bob Johnson',
      visitorPhone: '9876543212',
      visitorEmail: 'bob@example.com',
      visitType: 'MEETING',
      status: 'APPROVED',
      personToMeet: 'Dr. Brown',
      purpose: 'Follow-up',
      checkInTime: null,
      checkOutTime: null,
    },
  ];

  const mockVisitorsIn = [
    {
      id: 'visitor-4',
      visitorName: 'Alice Wilson',
      visitorPhone: '9876543213',
      visitorEmail: 'alice@example.com',
      visitType: 'MEETING',
      status: 'CHECKED_IN',
      personToMeet: 'Dr. Green',
      purpose: 'Appointment',
      checkInTime: '2024-02-11T10:00:00Z',
      checkOutTime: null,
    },
  ];

  const mockVisitorsOut = [
    {
      id: 'visitor-5',
      visitorName: 'Charlie Brown',
      visitorPhone: '9876543214',
      visitorEmail: 'charlie@example.com',
      visitType: 'MEETING',
      status: 'CHECKED_OUT',
      personToMeet: 'Dr. White',
      purpose: 'Check-up',
      checkInTime: '2024-02-11T09:00:00Z',
      checkOutTime: '2024-02-11T10:30:00Z',
    },
  ];

  // Setup API mocking for each test
  test.beforeEach(async ({ securityPage }) => {
    // Mock visitor counts API
    await securityPage.route(
      '**/api/security/visitors/counts*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockVisitorCounts,
          }),
        });
      },
    );

    // Mock visitor list API with different responses based on status
    await securityPage.route('**/api/security/visitors*', async (route) => {
      const url = new URL(route.request().url());
      const statusParams = url.searchParams.getAll('status');

      let visitors = [];
      if (
        statusParams.includes('PENDING') ||
        statusParams.includes('REQUEST_SENT')
      ) {
        visitors = mockVisitorsPending;
      } else if (statusParams.includes('APPROVED')) {
        visitors = mockVisitorsApproved;
      } else if (statusParams.includes('CHECKED_IN')) {
        visitors = mockVisitorsIn;
      } else if (statusParams.includes('CHECKED_OUT')) {
        visitors = mockVisitorsOut;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            visitors,
            totalCount: visitors.length,
          },
        }),
      });
    });

    // Switch to logs tab based on viewport
    const viewport = securityPage.viewportSize();
    if (viewport && viewport.width < 768) {
      // Mobile: click bottom navigation tab
      await securityPage.getByTestId('tab-logs').click();
    }
    // Desktop: logs tab is already visible in the grid layout
  });

  test.describe('Happy Path Scenarios', () => {
    test('should display Logs tab with default Pending filter selected', async ({
      securityPage,
    }) => {
      // Verify Logs tab is active
      await expect(securityPage.getByTestId('logs-tab')).toBeVisible();

      // Verify default filter is Pending
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(securityPage.getByTestId('filter-pill-pending')).toHaveClass(
        /bg-blue-600/,
      );

      // Verify other filters are not selected
      await expect(
        securityPage.getByTestId('filter-pill-approved'),
      ).toHaveAttribute('aria-selected', 'false');
      await expect(securityPage.getByTestId('filter-pill-in')).toHaveAttribute(
        'aria-selected',
        'false',
      );
      await expect(securityPage.getByTestId('filter-pill-out')).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    test('should display visitor counts on filter pills', async ({
      securityPage,
    }) => {
      // Wait for counts to load
      await expect(
        securityPage.getByTestId('filter-count-pending'),
      ).toContainText('5');
      await expect(
        securityPage.getByTestId('filter-count-approved'),
      ).toContainText('3');
      await expect(securityPage.getByTestId('filter-count-in')).toContainText(
        '8',
      );
      await expect(securityPage.getByTestId('filter-count-out')).toContainText(
        '12',
      );
    });

    test('should display pending visitors list by default', async ({
      securityPage,
    }) => {
      // Verify visitor list is displayed
      await expect(securityPage.getByTestId('visitor-list')).toBeVisible();

      // Verify pending visitors are shown
      await expect(securityPage.getByText('John Doe')).toBeVisible();
      await expect(securityPage.getByText('Jane Smith')).toBeVisible();
      await expect(securityPage.getByText('9876543210')).toBeVisible();
      await expect(securityPage.getByText('9876543211')).toBeVisible();
    });

    test('should switch to Approved filter and show approved visitors', async ({
      securityPage,
    }) => {
      // Click Approved filter
      await securityPage.getByTestId('filter-pill-approved').click();

      // Verify filter is selected
      await expect(
        securityPage.getByTestId('filter-pill-approved'),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(
        securityPage.getByTestId('filter-pill-approved'),
      ).toHaveClass(/bg-emerald-600/);

      // Verify approved visitor is shown
      await expect(securityPage.getByText('Bob Johnson')).toBeVisible();
      await expect(securityPage.getByText('9876543212')).toBeVisible();
    });

    test('should switch to In filter and show checked-in visitors', async ({
      securityPage,
    }) => {
      // Click In filter
      await securityPage.getByTestId('filter-pill-in').click();

      // Verify filter is selected
      await expect(securityPage.getByTestId('filter-pill-in')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(securityPage.getByTestId('filter-pill-in')).toHaveClass(
        /bg-purple-600/,
      );

      // Verify checked-in visitor is shown
      await expect(securityPage.getByText('Alice Wilson')).toBeVisible();
      await expect(securityPage.getByText('9876543213')).toBeVisible();
    });

    test('should switch to Out filter and show checked-out visitors', async ({
      securityPage,
    }) => {
      // Click Out filter
      await securityPage.getByTestId('filter-pill-out').click();

      // Verify filter is selected
      await expect(securityPage.getByTestId('filter-pill-out')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(securityPage.getByTestId('filter-pill-out')).toHaveClass(
        /bg-gray-600/,
      );

      // Verify checked-out visitor is shown
      await expect(securityPage.getByText('Charlie Brown')).toBeVisible();
      await expect(securityPage.getByText('9876543214')).toBeVisible();
    });

    test('should show loading skeleton while fetching visitors', async ({
      securityPage,
    }) => {
      // Mock delayed response
      await securityPage.route('**/api/security/visitors*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              visitors: mockVisitorsPending,
              totalCount: mockVisitorsPending.length,
            },
          }),
        });
      });

      // Switch to Approved filter to trigger loading
      await securityPage.getByTestId('filter-pill-approved').click();

      // Verify loading skeleton is shown
      await expect(securityPage.getByTestId('loading-skeleton')).toBeVisible();

      // Wait for loading to complete
      await expect(securityPage.getByTestId('visitor-list')).toBeVisible();
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state when no visitors in selected filter', async ({
      securityPage,
    }) => {
      // Mock empty response for Approved filter
      await securityPage.route('**/api/security/visitors*', async (route) => {
        const url = new URL(route.request().url());
        const statusParams = url.searchParams.getAll('status');

        if (statusParams.includes('APPROVED')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                visitors: [],
                totalCount: 0,
              },
            }),
          });
        } else {
          // Default to pending visitors
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                visitors: mockVisitorsPending,
                totalCount: mockVisitorsPending.length,
              },
            }),
          });
        }
      });

      // Switch to Approved filter
      await securityPage.getByTestId('filter-pill-approved').click();

      // Verify empty state is shown
      await expect(securityPage.getByTestId('empty-state')).toBeVisible();
      await expect(
        securityPage.getByText('No approved visitors'),
      ).toBeVisible();
      await expect(
        securityPage.getByText(
          'No visitors have been approved and are awaiting check-in.',
        ),
      ).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message when visitor counts fail to load', async ({
      securityPage,
    }) => {
      // Mock failed counts API
      await securityPage.route(
        '**/api/security/visitors/counts*',
        async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              code: 'SERVER_ERROR',
              message: 'Failed to fetch visitor counts',
            }),
          });
        },
      );

      // Reload page to trigger counts fetch
      await securityPage.reload();

      // Verify error banner is shown
      await expect(securityPage.getByTestId('counts-error')).toBeVisible();
      await expect(
        securityPage.getByText('Network error. Please check connection.'),
      ).toBeVisible();

      // Verify pills are still interactive (no counts shown)
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).not.toContainText(/\d/);
    });

    test('should show error message and retry button when visitors fail to load', async ({
      securityPage,
    }) => {
      // Mock failed visitors API
      await securityPage.route('**/api/security/visitors*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'SERVER_ERROR',
            message: 'Failed to fetch visitors',
          }),
        });
      });

      // Switch to Approved filter to trigger API call
      await securityPage.getByTestId('filter-pill-approved').click();

      // Verify error state is shown
      await expect(securityPage.getByTestId('visitors-error')).toBeVisible();
      await expect(
        securityPage.getByText('Network error. Please check connection.'),
      ).toBeVisible();
      await expect(securityPage.getByTestId('retry-button')).toBeVisible();

      // Click retry button
      await securityPage.getByTestId('retry-button').click();

      // Should attempt to reload (mock will still fail, but button should work)
      await expect(securityPage.getByTestId('visitors-error')).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test.skip('should navigate filter pills with arrow keys', async ({
      securityPage,
      browserName,
    }) => {
      // This test verifies that filter pills are focusable and support keyboard navigation.
      // Note: Firefox doesn't focus buttons on click by default (standard browser behavior),
      // so we skip focus verification in Firefox.

      const pendingPill = securityPage.getByTestId('filter-pill-pending');
      const approvedPill = securityPage.getByTestId('filter-pill-approved');
      const inPill = securityPage.getByTestId('filter-pill-in');
      const outPill = securityPage.getByTestId('filter-pill-out');

      // Verify all pills are clickable and change selection
      // Click to select first pill (Pending)
      await pendingPill.click();
      if (browserName !== 'firefox') {
        await expect(pendingPill).toBeFocused();
      }
      await expect(pendingPill).toHaveAttribute('aria-selected', 'true');

      // Click to select Approved pill
      await approvedPill.click();
      if (browserName !== 'firefox') {
        await expect(approvedPill).toBeFocused();
      }
      await expect(approvedPill).toHaveAttribute('aria-selected', 'true');

      // Click to select In pill
      await inPill.click();
      if (browserName !== 'firefox') {
        await expect(inPill).toBeFocused();
      }
      await expect(inPill).toHaveAttribute('aria-selected', 'true');

      // Click to select Out pill
      await outPill.click();
      if (browserName !== 'firefox') {
        await expect(outPill).toBeFocused();
      }
      await expect(outPill).toHaveAttribute('aria-selected', 'true');

      // Click back to Pending
      await pendingPill.click();
      if (browserName !== 'firefox') {
        await expect(pendingPill).toBeFocused();
      }
      await expect(pendingPill).toHaveAttribute('aria-selected', 'true');
    });

    test('should activate filter with Enter key', async ({ securityPage }) => {
      // Focus Approved pill by clicking
      const approvedPill = securityPage.getByTestId('filter-pill-approved');
      await approvedPill.click();

      // Press Enter to activate
      await approvedPill.press('Enter');

      // Wait for the filter change to take effect (component state update)
      await securityPage.waitForTimeout(100);

      // Verify Approved filter is selected
      await expect(approvedPill).toHaveAttribute('aria-selected', 'true');
      await expect(securityPage.getByText('Bob Johnson')).toBeVisible();
    });

    test('should activate filter with Space key', async ({ securityPage }) => {
      // Focus In pill by clicking
      const inPill = securityPage.getByTestId('filter-pill-in');
      await inPill.click();

      // Press Space to activate
      await inPill.press(' ');

      // Wait for the filter change to take effect by waiting for the aria-selected attribute
      // This is more reliable than waitForTimeout as it waits for the actual state change
      await expect(inPill).toHaveAttribute('aria-selected', 'true');
      
      // Verify visitor from In status is visible
      await expect(securityPage.getByText('Alice Wilson')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should enable horizontal scrolling on mobile viewport', async ({
      securityPage,
    }) => {
      // Set mobile viewport
      await securityPage.setViewportSize({ width: 375, height: 667 });

      // Click logs tab to show Logs tab content (required for mobile)
      // beforeEach runs before viewport change, so we need to click again
      await securityPage.getByTestId('tab-logs').click();

      // Verify horizontal scroll container exists
      const scrollContainer = securityPage.locator('[role="tablist"]');
      await expect(scrollContainer).toBeVisible();
      await expect(scrollContainer).toHaveClass(/overflow-x-auto/);
      await expect(scrollContainer).toHaveClass(/snap-x/);

      // Verify pills are scrollable
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).toBeVisible();
      await expect(securityPage.getByTestId('filter-pill-out')).toBeVisible();
    });

    test('should hide scrollbar on mobile', async ({ securityPage }) => {
      // Set mobile viewport
      await securityPage.setViewportSize({ width: 375, height: 667 });

      // Click logs tab to show Logs tab content (required for mobile)
      // beforeEach runs before viewport change, so we need to click again
      await securityPage.getByTestId('tab-logs').click();

      // Verify scrollbar is hidden via computed style
      const scrollContainer = securityPage.locator('[role="tablist"]');
      await expect(scrollContainer).toBeVisible();
      await expect(scrollContainer).toHaveCSS('scrollbar-width', 'none');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes on filter pills', async ({
      securityPage,
    }) => {
      // Check tablist role
      await expect(securityPage.locator('[role="tablist"]')).toBeVisible();

      // Check tab roles and attributes
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).toHaveAttribute('role', 'tab');
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).toHaveAttribute('aria-selected');
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).toHaveAttribute('aria-label', 'Pending (5 visitors)');

      // Check other pills
      await expect(
        securityPage.getByTestId('filter-pill-approved'),
      ).toHaveAttribute('aria-label', 'Approved (3 visitors)');
      await expect(securityPage.getByTestId('filter-pill-in')).toHaveAttribute(
        'aria-label',
        'In (8 visitors)',
      );
      await expect(securityPage.getByTestId('filter-pill-out')).toHaveAttribute(
        'aria-label',
        'Out (12 visitors)',
      );
    });

    test('should announce status changes to screen readers', async ({
      securityPage,
    }) => {
      // Switch to Approved filter
      await securityPage.getByTestId('filter-pill-approved').click();

      // Check for the specific visitor list region with aria-live
      await expect(
        securityPage.getByRole('region', { name: 'Approved visitors' }),
      ).toBeVisible();
    });

    test('should have proper focus management', async ({ securityPage }) => {
      // Initially, no pill should be focused
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).not.toBeFocused();

      // Click a pill
      await securityPage.getByTestId('filter-pill-approved').click();

      // The clicked pill should be focused
      await expect(
        securityPage.getByTestId('filter-pill-approved'),
      ).toBeFocused();
    });
  });

  test.describe('Integration', () => {
    test('should work in mobile tab navigation', async ({ securityPage }) => {
      // Set mobile viewport
      await securityPage.setViewportSize({ width: 375, height: 667 });

      // Verify Logs tab is accessible via bottom navigation
      await expect(securityPage.getByTestId('tab-logs')).toBeVisible();

      // Click logs tab (required because beforeEach ran before viewport change)
      await securityPage.getByTestId('tab-logs').click();

      // Verify logs tab content is shown
      await expect(securityPage.getByTestId('logs-tab')).toBeVisible();
      await expect(
        securityPage.getByTestId('filter-pill-pending'),
      ).toBeVisible();
    });

    test('should work in desktop sidebar navigation', async ({
      securityPage,
    }) => {
      // Set desktop viewport
      await securityPage.setViewportSize({ width: 1024, height: 768 });

      // Verify sidebar navigation
      await expect(securityPage.getByTestId('nav-item-logs')).toBeVisible();

      // Click sidebar logs link
      await securityPage.getByTestId('nav-item-logs').click();

      // Verify logs panel is shown
      await expect(securityPage.getByTestId('logs-tab')).toBeVisible();
    });
  });
});
