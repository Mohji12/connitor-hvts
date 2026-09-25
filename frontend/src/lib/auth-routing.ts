export const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/',
  CHAIN_ADMIN: '/dashboard/',
  BRANCH_ADMIN: '/dashboard/',
  HOSPITAL_ADMIN: '/dashboard/',
  DEPARTMENT_ADMIN: '/dashboard/',
  SUB_DEPARTMENT_ADMIN: '/dashboard/',
  SECURITY: '/security/dashboard/?tab=check-in',
  SECURITY_SUPERVISOR: '/security/dashboard/?tab=check-in',
  STAFF: '/dashboard/',
  RECEIVING: '/dashboard/receiving',
  PURCHASE: '/dashboard/delivery',
  DISTRIBUTOR: '/vendor/deliveries',
  DELIVERY_AGENT: '/driver/deliveries',
  WARD_ADMIN: '/dashboard/ams',
};

export function getDashboardPathForRole(role: string): string {
  return ROLE_DASHBOARD_PATHS[role] ?? '/dashboard/';
}

export interface DecodedUser {
  sub?: string;
  id?: string;
  role: string;
  name?: string;
  email?: string;
}
