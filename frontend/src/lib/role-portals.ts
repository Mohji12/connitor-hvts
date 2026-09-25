import { getDashboardPathForRole } from '@/lib/auth-routing';

export type PortalRole =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'SUB_DEPARTMENT_ADMIN'
  | 'SECURITY'
  | 'STAFF'
  | 'WARD_ADMIN';

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

/** Attendant Management System (AMS) — not listed under general hospital staff tile */
export const WARD_ADMIN_PORTAL: RolePortal = {
  role: 'WARD_ADMIN',
  label: 'Ward / AMS staff',
  description: 'Issue attendant passes, register family visitors, and manage ward access.',
  dashboardPath: getDashboardPathForRole('WARD_ADMIN'),
  demoEmail: 'ward.admin@connitor-elcity.com',
};

export function getLoginPathForRole(role: PortalRole): string {
  if (role === 'SECURITY') return '/security/login';
  return `/auth/login?role=${role}`;
}

/** Shareable URLs — no role picker on the hub */
export const PORTAL_HOSPITAL_STAFF_LOGIN_PATH = '/portal/hospital-staff';
export const PORTAL_DELIVERY_LOGIN_PATH = '/portal/delivery';
export const PORTAL_DELIVERY_DRIVER_LOGIN_PATH = '/portal/delivery/driver';
export const PORTAL_SECURITY_LOGIN_PATH = '/security/login';

export interface AttendantHubLink {
  id: 'attendant-apply' | 'attendant-ams-login';
  label: string;
  description: string;
  href: string;
}

export const ATTENDANT_HUB_LINKS: AttendantHubLink[] = [
  {
    id: 'attendant-apply',
    label: 'Apply for family visit pass',
    description: 'Public flow for attendants visiting an admitted patient (MRN required).',
    href: '/attendant-pass',
  },
  {
    id: 'attendant-ams-login',
    label: 'Hospital AMS staff login',
    description: 'Ward staff sign-in to register attendants and manage visit passes.',
    href: '/auth/login?role=WARD_ADMIN',
  },
];

export interface DeliveryHubLink {
  id: 'distributor-login' | 'distributor-register' | 'driver-login';
  label: string;
  description: string;
  href: string;
}

export interface VisitorHubLink {
  id: string;
  label: string;
  description: string;
  href: string;
  /** OAuth and other full-page redirects */
  external?: boolean;
}

export const VISITOR_HUB_LINKS: VisitorHubLink[] = [
  {
    id: 'visitor-sign-in',
    label: 'Sign in to your profile',
    description: 'Email or mobile + password; Google and LinkedIn also on the sign-in page.',
    href: '/visitor/login',
  },
  {
    id: 'visitor-register',
    label: 'Create visitor account',
    description: 'Register a Conninter visitor profile to book and track visits.',
    href: '/visitor/register',
  },
  {
    id: 'visitor-book',
    label: 'Book an appointment',
    description: 'Public booking flow for hospital visits.',
    href: '/book-appointment',
  },
  {
    id: 'visitor-legacy-otp',
    label: 'Email OTP (booked without a profile)',
    description: 'Legacy sign-in after booking without creating an account.',
    href: '/visitor/login?mode=legacy-otp',
  },
  {
    id: 'visitor-google',
    label: 'Continue with Google',
    description: 'OAuth sign-in with your Google account.',
    href: '/api/public/visitor-auth/google',
    external: true,
  },
  {
    id: 'visitor-linkedin',
    label: 'Continue with LinkedIn',
    description: 'OAuth sign-in with your LinkedIn account.',
    href: '/api/public/visitor-auth/linkedin',
    external: true,
  },
];

export const DELIVERY_HUB_LINKS: DeliveryHubLink[] = [
  {
    id: 'distributor-login',
    label: 'Distributor sign in',
    description: 'Book hospital deliveries, manage fleet, and track gate status.',
    href: '/delivery/login',
  },
  {
    id: 'distributor-register',
    label: 'Create distributor account',
    description: 'Apply to onboard as a delivery partner with a hospital.',
    href: '/vendor/register',
  },
  {
    id: 'driver-login',
    label: 'Driver sign in',
    description: 'View assigned runs, gate QR, and delivery instructions.',
    href: '/delivery/driver/login',
  },
];

export function findRolePortal(role: string | null | undefined): RolePortal | undefined {
  if (!role) return undefined;
  if (role === 'WARD_ADMIN') return WARD_ADMIN_PORTAL;
  return HOSPITAL_ROLE_PORTALS.find((portal) => portal.role === role);
}

export function isPortalRole(value: string | null): value is PortalRole {
  return HOSPITAL_ROLE_PORTALS.some((portal) => portal.role === value);
}

export interface DeliveryPortal {
  id: 'DISTRIBUTOR' | 'DRIVER';
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
  {
    id: 'DRIVER',
    label: 'Driver',
    description: 'See today’s assigned deliveries, gate QR, and route instructions.',
    loginPath: '/delivery/driver/login',
    dashboardPath: '/driver/deliveries',
    demoEmail: 'driver@citygen.demo',
  },
];

/** Maps auth role or portal id to delivery portal metadata (login form chrome). */
export function resolveDeliveryPortal(roleOrId: string | null | undefined): DeliveryPortal | undefined {
  if (!roleOrId) return undefined;
  if (roleOrId === 'DELIVERY_AGENT') return findDeliveryPortal('DRIVER');
  return findDeliveryPortal(roleOrId);
}

export function findDeliveryPortal(id: string | null | undefined): DeliveryPortal | undefined {
  if (!id) return undefined;
  return DELIVERY_PORTALS.find((portal) => portal.id === id);
}
