import {
  BadgeCheck,
  BookOpen,
  Building,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  GitBranch,
  Home,
  IdCard,
  Layers,
  LogIn,
  Package,
  QrCode,
  ScanLine,
  Settings,
  ShieldAlert,
  Store,
  Truck,
  UserCircle,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MobileNavGroup {
  title?: string;
  items: MobileNavItem[];
}

export interface MobileNavConfig {
  tabs: MobileNavItem[];
  more: MobileNavGroup[];
}

const settings: MobileNavItem = { label: 'Profile', href: '/dashboard/settings', icon: UserCircle };
const account: MobileNavGroup = { title: 'Account', items: [settings] };

const amsTools: MobileNavGroup = {
  title: 'Attendant passes',
  items: [
    { label: 'Allot pass', href: '/dashboard/ams/register', icon: UserPlus },
    { label: 'Search pass', href: '/dashboard/ams/search', icon: Users },
    { label: 'People inside', href: '/dashboard/ams/active', icon: LogIn },
    { label: 'Shift change', href: '/dashboard/ams/shift-change', icon: Users },
    { label: 'Emergency pass', href: '/dashboard/ams/emergency', icon: ShieldAlert },
    { label: 'Reports', href: '/dashboard/ams/reports', icon: BookOpen },
    { label: 'AMS settings', href: '/dashboard/ams/settings', icon: Settings },
  ],
};

const securityTabs: MobileNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Scan', href: '/security/dashboard?tab=check-in', icon: ScanLine },
  { label: 'Today', href: '/security/dashboard?tab=appointments', icon: CalendarCheck },
  { label: 'Deliveries', href: '/security/dashboard?tab=deliveries', icon: Package },
];

const securityMore: MobileNavGroup[] = [
  {
    title: 'Gate',
    items: [
      { label: 'Visitor logs', href: '/security/dashboard?tab=logs', icon: BookOpen },
      { label: 'On-spot visitor QR', href: '/security/dashboard?tab=on-spot', icon: QrCode },
      { label: 'Visitor passes', href: '/security/dashboard?tab=visitor-passes', icon: IdCard },
      { label: 'All appointments', href: '/dashboard/appointments', icon: CalendarDays },
    ],
  },
  account,
];

export const MOBILE_NAV: Record<string, MobileNavConfig> = {
  SUPER_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Hospitals', href: '/dashboard/hospital-chains', icon: Building2 },
      { label: 'Users', href: '/dashboard/users', icon: Users },
      { label: 'Delivery', href: '/dashboard/delivery', icon: Truck },
    ],
    more: [
      {
        title: 'Organisation',
        items: [
          { label: 'Branches', href: '/dashboard/branches', icon: Building },
          { label: 'Departments', href: '/dashboard/departments', icon: Layers },
          { label: 'Sub-departments', href: '/dashboard/sub-departments', icon: GitBranch },
          { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
        ],
      },
      {
        title: 'Delivery',
        items: [
          { label: 'Delivery slots', href: '/dashboard/delivery-slots', icon: CalendarClock },
          { label: 'Vendors', href: '/dashboard/delivery/vendors', icon: Store },
        ],
      },
      account,
    ],
  },
  HOSPITAL_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
      { label: 'Passes', href: '/dashboard/ams', icon: IdCard },
      { label: 'Delivery', href: '/dashboard/delivery', icon: Truck },
    ],
    more: [
      {
        title: 'Hospital',
        items: [
          { label: 'Visitors', href: '/dashboard/visitors', icon: UserPlus },
          { label: 'Visitor passes', href: '/dashboard/visitor-passes', icon: BadgeCheck },
          { label: 'Visit slots', href: '/dashboard/visit-slots', icon: CalendarClock },
          { label: 'Departments', href: '/dashboard/departments', icon: Layers },
          { label: 'Sub-departments', href: '/dashboard/sub-departments', icon: GitBranch },
          { label: 'Users', href: '/dashboard/users', icon: Users },
        ],
      },
      amsTools,
      {
        title: 'Delivery',
        items: [
          { label: 'Delivery slots', href: '/dashboard/delivery-slots', icon: CalendarClock },
          { label: 'Vendors', href: '/dashboard/delivery/vendors', icon: Store },
        ],
      },
      account,
    ],
  },
  CHAIN_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Branches', href: '/dashboard/branches', icon: Building },
      { label: 'Users', href: '/dashboard/users', icon: Users },
    ],
    more: [account],
  },
  BRANCH_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Visitors', href: '/dashboard/visitors', icon: UserPlus },
      { label: 'Passes', href: '/dashboard/visitor-passes', icon: BadgeCheck },
      { label: 'Users', href: '/dashboard/users', icon: Users },
    ],
    more: [
      { items: [{ label: 'Visit slots', href: '/dashboard/visit-slots', icon: CalendarClock }] },
      account,
    ],
  },
  DEPARTMENT_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
      { label: 'Users', href: '/dashboard/users', icon: Users },
    ],
    more: [
      { items: [{ label: 'Sub-departments', href: '/dashboard/sub-departments', icon: GitBranch }] },
      account,
    ],
  },
  SUB_DEPARTMENT_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
      { label: 'Staff', href: '/dashboard/users', icon: Users },
    ],
    more: [account],
  },
  SECURITY: { tabs: securityTabs, more: securityMore },
  SECURITY_SUPERVISOR: { tabs: securityTabs, more: securityMore },
  STAFF: {
    tabs: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Appointments', href: '/dashboard/my-visitors', icon: CalendarDays },
      { label: 'Profile', href: '/dashboard/settings', icon: UserCircle },
    ],
    more: [],
  },
  WARD_ADMIN: {
    tabs: [
      { label: 'Home', href: '/dashboard/ams', icon: Home },
      { label: 'Allot', href: '/dashboard/ams/register', icon: UserPlus },
      { label: 'Inside', href: '/dashboard/ams/active', icon: LogIn },
      { label: 'Search', href: '/dashboard/ams/search', icon: Users },
    ],
    more: [
      {
        title: 'Attendant passes',
        items: amsTools.items.filter(
          (item) =>
            !['/dashboard/ams/register', '/dashboard/ams/active', '/dashboard/ams/search'].includes(item.href),
        ),
      },
      account,
    ],
  },
  RECEIVING: {
    tabs: [{ label: 'Receiving', href: '/dashboard/receiving', icon: Package }],
    more: [account],
  },
  PURCHASE: {
    tabs: [{ label: 'Deliveries', href: '/dashboard/delivery', icon: Truck }],
    more: [account],
  },
  DISTRIBUTOR: {
    tabs: [
      { label: 'Deliveries', href: '/vendor/deliveries', icon: Package },
      { label: 'Book', href: '/vendor/deliveries/book', icon: Truck },
      { label: 'Wallet', href: '/vendor/wallet', icon: Wallet },
      { label: 'Fleet', href: '/vendor/fleet', icon: Users },
    ],
    more: [
      {
        title: 'Account',
        items: [
          { label: 'Company profile', href: '/vendor/profile', icon: Building2 },
          { label: 'My account', href: '/dashboard/settings', icon: UserCircle },
        ],
      },
    ],
  },
  PRODUCT_ADMIN: {
    tabs: [{ label: 'Logs', href: '/dashboard/product-logs', icon: ClipboardList }],
    more: [account],
  },
};

const FALLBACK_NAV: MobileNavConfig = {
  tabs: [{ label: 'Home', href: '/dashboard', icon: Home }],
  more: [account],
};

export function getMobileNav(role: string): MobileNavConfig {
  return MOBILE_NAV[role] ?? FALLBACK_NAV;
}

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

/** Security tabs that live under the single mobile "Scan" tab (switched by a segmented control). */
export const SECURITY_SCAN_TABS = new Set(['check-in', 'delivery-scan', 'attendant-scan']);

function hrefMatchScore(pathname: string, search: URLSearchParams, href: string): number {
  const [rawPath, rawQuery = ''] = href.split('?');
  const target = normalizePath(rawPath);
  const current = normalizePath(pathname);

  if (rawQuery) {
    if (current !== target) return -1;
    const expected = new URLSearchParams(rawQuery);
    for (const [key, value] of expected.entries()) {
      const actual = search.get(key);
      const isScanTab =
        key === 'tab' && value === 'check-in' && (!actual || SECURITY_SCAN_TABS.has(actual));
      if (actual !== value && !isScanTab) return -1;
    }
    return target.length + 1;
  }

  if (current === target) return target.length + 1;
  // Root homes ("/dashboard") only match exactly; deeper paths also own their detail pages.
  const isRoot = target.split('/').filter(Boolean).length <= 1;
  if (!isRoot && current.startsWith(`${target}/`)) return target.length;
  return -1;
}

/** Href of the single nav item that best matches the current URL. */
export function findActiveHref(
  items: MobileNavItem[],
  pathname: string,
  search: URLSearchParams,
): string | null {
  let best: { href: string; score: number } | null = null;
  for (const item of items) {
    const score = hrefMatchScore(pathname, search, item.href);
    if (score >= 0 && (!best || score > best.score)) {
      best = { href: item.href, score };
    }
  }
  return best?.href ?? null;
}

const TITLE_OVERRIDES: Record<string, string> = {
  '/dashboard': 'Home',
  '/dashboard/settings': 'My profile',
  '/dashboard/my-visitors': 'My appointments',
  '/dashboard/visitors/check-in': 'Check in visitor',
  '/dashboard/visitors/visitors-logs': 'Visitor logs',
  '/dashboard/ams': 'Attendant passes',
  '/vendor/deliveries/book': 'Book delivery',
  '/vendor/profile': 'Company profile',
  '/vendor/deliveries': 'Deliveries',
};

const SECURITY_TAB_TITLES: Record<string, string> = {
  'check-in': 'Scan at gate',
  appointments: "Today's appointments",
  deliveries: "Today's deliveries",
  logs: 'Visitor logs',
  'visitor-passes': 'Visitor passes',
  'delivery-scan': 'Scan at gate',
  'attendant-scan': 'Scan at gate',
  'on-spot': 'On-spot visitor QR',
};

export function getMobilePageTitle(
  config: MobileNavConfig,
  pathname: string,
  search: URLSearchParams,
): string {
  const path = normalizePath(pathname);
  if (path === '/security/dashboard') {
    return SECURITY_TAB_TITLES[search.get('tab') ?? 'check-in'] ?? 'Security';
  }
  if (TITLE_OVERRIDES[path]) return TITLE_OVERRIDES[path];
  const all = [...config.tabs, ...config.more.flatMap((g) => g.items)];
  const exact = all.find((item) => normalizePath(item.href.split('?')[0]) === path);
  if (exact) return exact.label;
  if (/^\/(dashboard|vendor)\/deliver(y|ies)\/[^/]+$/.test(path)) return 'Delivery details';
  const owner = findActiveHref(all, pathname, search);
  const ownerItem = all.find((item) => item.href === owner);
  return ownerItem?.label ?? 'Conninter';
}

/** Show a back button on pages that are not one of the bottom tabs. */
export function isTabRoot(config: MobileNavConfig, pathname: string, search: URLSearchParams): boolean {
  const path = normalizePath(pathname);
  return config.tabs.some((tab) => {
    const [rawPath, rawQuery] = tab.href.split('?');
    if (normalizePath(rawPath) !== path) return false;
    return rawQuery ? hrefMatchScore(pathname, search, tab.href) >= 0 : true;
  });
}
