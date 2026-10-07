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
  WARD_ADMIN: '/dashboard/ams',
  PRODUCT_ADMIN: '/dashboard/product-logs',
};

export function getDashboardPathForRole(role: string): string {
  return ROLE_DASHBOARD_PATHS[role] ?? '/dashboard/';
}

/** Path without query, with the trailing slash Next expects. Used to warm the route before navigation. */
export function getDashboardPrefetchPath(role?: string | null): string {
  const raw = role ? getDashboardPathForRole(role) : '/dashboard/';
  const path = raw.split('?')[0] || '/dashboard/';
  if (path.length > 1 && !path.endsWith('/')) {
    return `${path}/`;
  }
  return path;
}

export interface DecodedUser {
  sub?: string;
  id?: string;
  role: string;
  name?: string;
  email?: string;
}
