import { test as base, Page } from '@playwright/test';
import { TEST_USERS, E2E_FIXED_OTP } from './test-users';
import { loginAs } from '../utils/auth-helpers';

type MyFixtures = {
  superAdminPage: Page;
  chainAdminPage: Page;
  branchAdminPage: Page;
  staffPage: Page;
  securityPage: Page;
};

/**
 * Mock authentication API endpoints to prevent race conditions
 * when multiple workers try to authenticate with the same user.
 */
async function mockAuthEndpoints(page: Page) {
  // Mock login endpoint
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'OTP sent successfully. Check server logs or SMS for OTP.',
      }),
    });
  });

  // Mock verify-otp endpoint
  await page.route('**/api/auth/verify-otp', async (route) => {
    const requestBody = await route.request().postData();
    const body = requestBody ? JSON.parse(requestBody) : {};

    // Accept the fixed OTP
    if (body.otp === E2E_FIXED_OTP) {
      // Return a valid JWT token payload for the user
      const userPhone = body.phone?.replace(/\D/g, '');
      let userRole = 'SECURITY';
      let userName = 'Test User';
      let userId = '00000000-0000-0000-0000-000000000000';

      // Determine user role based on phone number
      if (userPhone === TEST_USERS.SUPER_ADMIN.phoneNumber.replace(/\D/g, '')) {
        userRole = 'SUPER_ADMIN';
        userName = TEST_USERS.SUPER_ADMIN.name;
        userId = TEST_USERS.SUPER_ADMIN.id;
      } else if (userPhone === TEST_USERS.CHAIN_ADMIN.phoneNumber.replace(/\D/g, '')) {
        userRole = 'CHAIN_ADMIN';
        userName = TEST_USERS.CHAIN_ADMIN.name;
        userId = TEST_USERS.CHAIN_ADMIN.id;
      } else if (userPhone === TEST_USERS.BRANCH_ADMIN.phoneNumber.replace(/\D/g, '')) {
        userRole = 'BRANCH_ADMIN';
        userName = TEST_USERS.BRANCH_ADMIN.name;
        userId = TEST_USERS.BRANCH_ADMIN.id;
      } else if (userPhone === TEST_USERS.STAFF.phoneNumber.replace(/\D/g, '')) {
        userRole = 'STAFF';
        userName = TEST_USERS.STAFF.name;
        userId = TEST_USERS.STAFF.id;
      } else if (userPhone === TEST_USERS.SECURITY.phoneNumber.replace(/\D/g, '')) {
        userRole = 'SECURITY';
        userName = TEST_USERS.SECURITY.name;
        userId = TEST_USERS.SECURITY.id;
      }

      // Create a mock JWT token (base64 encoded payload)
      const payload = {
        sub: userId,
        name: userName,
        phone: userPhone,
        role: userRole,
        userType: 'EMPLOYEE',
        isActive: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      };

      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(payload)).toString('base64')}.mock-signature`;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: mockToken,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid OTP',
          statusCode: 401,
        }),
      });
    }
  });

  // Mock get profile endpoint
  await page.route('**/api/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test User',
        role: 'SECURITY',
        isActive: true,
      }),
    });
  });
}

export const test = base.extend<MyFixtures>({
  superAdminPage: async ({ page }, use) => {
    await mockAuthEndpoints(page);
    await loginAs(page, TEST_USERS.SUPER_ADMIN.phoneNumber);
    await use(page);
  },
  chainAdminPage: async ({ page }, use) => {
    await mockAuthEndpoints(page);
    await loginAs(page, TEST_USERS.CHAIN_ADMIN.phoneNumber);
    await use(page);
  },
  branchAdminPage: async ({ page }, use) => {
    await mockAuthEndpoints(page);
    await loginAs(page, TEST_USERS.BRANCH_ADMIN.phoneNumber);
    await use(page);
  },
  staffPage: async ({ page }, use) => {
    await mockAuthEndpoints(page);
    await loginAs(page, TEST_USERS.STAFF.phoneNumber);
    await use(page);
  },
  securityPage: async ({ page }, use) => {
    await mockAuthEndpoints(page);
    await loginAs(page, TEST_USERS.SECURITY.phoneNumber);
    await use(page);
  },
});

export { expect } from '@playwright/test';
