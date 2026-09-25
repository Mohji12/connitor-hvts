/**
 * Test user fixtures for E2E testing.
 * These users are seeded in the backend and have fixed credentials for testing.
 */

export interface TestUser {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'SUPER_ADMIN' | 'CHAIN_ADMIN' | 'BRANCH_ADMIN' | 'STAFF' | 'SECURITY' | 'RECEPTIONIST' | 'VISITOR';
  description?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  // From PROJECT_STATE.md - Deterministic seeded users
  SUPER_ADMIN: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Sushobhit Kundra',
    phoneNumber: '6987456321',
    role: 'SUPER_ADMIN',
    description: 'Super Admin user with full system access',
  },
  CHAIN_ADMIN: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Rajesh Kumar',
    phoneNumber: '8482022111',
    role: 'CHAIN_ADMIN',
    description: 'Chain Admin for Apollo Hospitals',
  },
  BRANCH_ADMIN: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Chennai Branch Admin',
    phoneNumber: '7980427511',
    role: 'BRANCH_ADMIN',
    description: 'Branch Admin for Chennai Apollo',
  },
  STAFF: {
    id: '88888888-8888-8888-8888-888888888888',
    name: 'Dr. Arjun Desai',
    phoneNumber: '7003636111',
    role: 'STAFF',
    description: 'Staff user - Doctor',
  },
  SECURITY: {
    id: '99999999-9999-9999-9999-999999999999',
    name: 'Rameshwar Tiwari',
    phoneNumber: '9883578111',
    role: 'SECURITY',
    description: 'Security personnel',
  },
  INVALID_USER: {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Non-existent User',
    phoneNumber: '0000000000',
    role: 'VISITOR',
    description: 'Phone number not in database',
  },
};

export const E2E_FIXED_OTP = '123456';
