export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * When true, all API calls are served from in-browser mock data (no backend).
 * Set NEXT_PUBLIC_USE_MOCK_API=true explicitly; demo mode alone still uses the real API.
 */
export const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export const DEMO_USER_ID_STORAGE_KEY = 'demoUserId';

export const DEFAULT_DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';

export const DEMO_BRANCH_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const DEMO_DEPARTMENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
export const DEMO_SUB_DEPARTMENT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

export type DemoRole =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'SUB_DEPARTMENT_ADMIN'
  | 'CHAIN_ADMIN'
  | 'BRANCH_ADMIN'
  | 'SECURITY'
  | 'STAFF';

export interface DemoPersona {
  id: string;
  label: string;
  role: DemoRole;
  sub: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  hospitalChainId: string | null;
  branchId: string | null;
  departmentId: string | null;
  subDepartmentId: string | null;
  hospitalChainName?: string;
  branchName?: string;
  departmentName?: string;
  subDepartmentName?: string;
  hospitalChain: { name: string } | null;
  branch: { name: string } | null;
  userType?:
    | 'DOCTOR'
    | 'NURSE'
    | 'SURGEON'
    | 'RECEPTIONIST'
    | 'PHARMACIST'
    | 'LAB_TECHNICIAN'
    | 'DEPARTMENT_HEAD'
    | 'IT_SUPPORT'
    | null;
  department?:
    | 'IT_SUPPORT'
    | 'GENERAL_MEDICINE'
    | 'CARDIOLOGY'
    | 'NEUROLOGY'
    | 'ORTHOPEDICS'
    | 'RADIOLOGY'
    | 'PHARMACY'
    | 'ADMINISTRATION'
    | null;
  location?: string | null;
  createdAt?: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    label: 'Super Admin',
    role: 'SUPER_ADMIN',
    sub: '11111111-1111-1111-1111-111111111111',
    name: 'Sushobhit Kundra',
    email: 'superadmin@hvts.com',
    phone: '6987456321',
    isActive: true,
    hospitalChainId: null,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    hospitalChain: null,
    branch: null,
  },
  {
    id: '55554444-4444-4444-4444-444444444444',
    label: 'Hospital Admin · Electronic City',
    role: 'HOSPITAL_ADMIN',
    sub: '55554444-4444-4444-4444-444444444444',
    name: 'Priya Sharma',
    email: 'hospital.admin@connitor-elcity.com',
    phone: '9123456780',
    isActive: true,
    hospitalChainId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    branchId: DEMO_BRANCH_ID,
    departmentId: null,
    subDepartmentId: null,
    hospitalChainName: 'Conninter Health Network',
    branchName: 'Conninter Hospital (Electronic City)',
    hospitalChain: { name: 'Conninter Health Network' },
    branch: { name: 'Conninter Hospital (Electronic City)' },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    label: 'Department Admin · Cardiology',
    role: 'DEPARTMENT_ADMIN',
    sub: '22222222-2222-2222-2222-222222222222',
    name: 'Rajesh Kumar',
    email: 'dept.admin@connitor-elcity.com',
    phone: '8482022111',
    isActive: true,
    hospitalChainId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    branchId: DEMO_BRANCH_ID,
    departmentId: DEMO_DEPARTMENT_ID,
    subDepartmentId: null,
    hospitalChainName: 'Conninter Health Network',
    branchName: 'Conninter Hospital (Electronic City)',
    departmentName: 'Cardiology',
    hospitalChain: { name: 'Conninter Health Network' },
    branch: { name: 'Conninter Hospital (Electronic City)' },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    label: 'Sub-Dept Admin · ICU Cardiology',
    role: 'SUB_DEPARTMENT_ADMIN',
    sub: '33333333-3333-3333-3333-333333333333',
    name: 'Anil Patel',
    email: 'subdept.admin@connitor-elcity.com',
    phone: '7980427511',
    isActive: true,
    hospitalChainId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    branchId: DEMO_BRANCH_ID,
    departmentId: DEMO_DEPARTMENT_ID,
    subDepartmentId: DEMO_SUB_DEPARTMENT_ID,
    hospitalChainName: 'Conninter Health Network',
    branchName: 'Conninter Hospital (Electronic City)',
    departmentName: 'Cardiology',
    subDepartmentName: 'ICU Cardiology',
    hospitalChain: { name: 'Conninter Health Network' },
    branch: { name: 'Conninter Hospital (Electronic City)' },
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    label: 'Staff · Security',
    role: 'SECURITY',
    sub: '99999999-9999-9999-9999-999999999999',
    name: 'Security Desk',
    email: 'security@connitor-elcity.com',
    phone: '9883578111',
    isActive: true,
    hospitalChainId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    branchId: DEMO_BRANCH_ID,
    departmentId: DEMO_DEPARTMENT_ID,
    subDepartmentId: DEMO_SUB_DEPARTMENT_ID,
    hospitalChainName: 'Conninter Health Network',
    branchName: 'Conninter Hospital (Electronic City)',
    departmentName: 'Cardiology',
    subDepartmentName: 'ICU Cardiology',
    hospitalChain: { name: 'Conninter Health Network' },
    branch: { name: 'Conninter Hospital (Electronic City)' },
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    label: 'Staff · Doctor',
    role: 'STAFF',
    sub: '88888888-8888-8888-8888-888888888888',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@connitor-elcity.com',
    phone: '7003636111',
    isActive: true,
    hospitalChainId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    branchId: DEMO_BRANCH_ID,
    departmentId: DEMO_DEPARTMENT_ID,
    subDepartmentId: DEMO_SUB_DEPARTMENT_ID,
    hospitalChainName: 'Conninter Health Network',
    branchName: 'Conninter Hospital (Electronic City)',
    departmentName: 'Cardiology',
    subDepartmentName: 'ICU Cardiology',
    hospitalChain: { name: 'Conninter Health Network' },
    branch: { name: 'Conninter Hospital (Electronic City)' },
    userType: 'DOCTOR',
    department: 'CARDIOLOGY',
    location: 'OPD Room 3, Electronic City',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

/** @deprecated Use getDemoPersona() instead */
export const DEMO_USER = DEMO_PERSONAS[0];

import { getStoredAuthToken as readAuthToken } from '@/lib/auth-storage';

/** @deprecated Use getStoredAuthToken from `@/lib/auth-storage` */
export function getStoredAuthToken(): string | null {
  return readAuthToken();
}

/** True when demo flag is on but the user signed in with email + password (JWT). */
export function hasRealAuthSession(): boolean {
  return Boolean(getStoredAuthToken());
}

/** Demo personas apply only before a real JWT login. */
export function shouldUseDemoIdentity(): boolean {
  return IS_DEMO_MODE && !hasRealAuthSession();
}

export function getDemoPersonaById(id: string): DemoPersona {
  return DEMO_PERSONAS.find((persona) => persona.id === id) ?? DEMO_PERSONAS[0];
}

export function getStoredDemoUserId(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_DEMO_USER_ID;
  }

  return sessionStorage.getItem(DEMO_USER_ID_STORAGE_KEY) ?? DEFAULT_DEMO_USER_ID;
}

export function getDemoPersona(): DemoPersona {
  return getDemoPersonaById(getStoredDemoUserId());
}

export function getDemoHomePath(role: string): string {
  switch (role) {
    case 'SECURITY':
      return '/security/dashboard/?tab=check-in';
    case 'STAFF':
      return '/dashboard/';
    default:
      return '/dashboard';
  }
}
