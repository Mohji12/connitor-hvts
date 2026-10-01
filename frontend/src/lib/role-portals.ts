import { getDashboardPathForRole } from '@/lib/auth-routing';

export type PortalRole =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'SUB_DEPARTMENT_ADMIN'
  | 'SECURITY'
  | 'STAFF';

export interface RolePortal {
  role: PortalRole;
  label: string;
  description: string;
  dashboardPath: string;
  /** Demo / seed email shown as login ID hint on the sign-in form */
  demoEmail: string;
}

export const HOSPITAL_ROLE_PORTALS: RolePortal[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Hospital-wide setup: chains, departments, users, and analytics.',
    dashboardPath: getDashboardPathForRole('SUPER_ADMIN'),
    demoEmail: 'superadmin@hvts.com',
  },
  {
    role: 'HOSPITAL_ADMIN',
    label: 'Hospital Admin',
    description: 'Manage your hospital site: departments, users, visitors, and appointments.',
    dashboardPath: getDashboardPathForRole('HOSPITAL_ADMIN'),
    demoEmail: 'hospital.admin@connitor-elcity.com',
  },
  {
    role: 'DEPARTMENT_ADMIN',
    label: 'Department Admin',
    description: 'Manage a clinical department, sub-sections, staff, and appointments.',
    dashboardPath: getDashboardPathForRole('DEPARTMENT_ADMIN'),
    demoEmail: 'dept.admin@connitor-elcity.com',
  },
  {
    role: 'SUB_DEPARTMENT_ADMIN',
    label: 'Sub-Department Admin',
    description: 'Manage your section staff and monitor section appointments.',
    dashboardPath: getDashboardPathForRole('SUB_DEPARTMENT_ADMIN'),
    demoEmail: 'subdept.admin@connitor-elcity.com',
  },
  {
    role: 'STAFF',
    label: 'Staff (Doctor & clinical)',
    description: 'Review visitor requests, approve appointments, and track your visitors.',
    dashboardPath: getDashboardPathForRole('STAFF'),
    demoEmail: 'priya.nair@connitor-elcity.com',
  },
  {
    role: 'SECURITY',
    label: 'Security',
    description: 'Verify IDs, check visitors in with OTP, view logs, and check out.',
    dashboardPath: getDashboardPathForRole('SECURITY'),
    demoEmail: 'security@connitor-elcity.com',
  },
];

export function getLoginPathForRole(role: PortalRole): string {
  if (role === 'SECURITY') return '/security/login';
  return '/staff/login';
}

export function findRolePortal(role: string | null | undefined): RolePortal | undefined {
  if (!role) return undefined;
  return HOSPITAL_ROLE_PORTALS.find((portal) => portal.role === role);
}

export function isPortalRole(value: string | null): value is PortalRole {
  return HOSPITAL_ROLE_PORTALS.some((portal) => portal.role === value);
}

export interface DeliveryPortal {
  id: 'DISTRIBUTOR';
  label: string;
  description: string;
  loginPath: string;
  dashboardPath: string;
  demoEmail?: string;
}

export const DELIVERY_PORTALS: DeliveryPortal[] = [
  {
    id: 'DISTRIBUTOR',
    label: 'Distributor',
    description: 'Book hospital deliveries, manage drivers and vehicles, and track shipments.',
    loginPath: '/delivery/login',
    dashboardPath: '/vendor/deliveries',
    demoEmail: 'distributor@citygen.demo',
  },
];

export function findDeliveryPortal(id: string | null | undefined): DeliveryPortal | undefined {
  if (!id) return undefined;
  return DELIVERY_PORTALS.find((portal) => portal.id === id);
}
