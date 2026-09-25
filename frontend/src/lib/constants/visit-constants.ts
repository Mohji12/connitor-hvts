export enum VisitCategory {
  MEETING = 'MEETING',
  DELIVERY = 'DELIVERY',
}

export const MEETING_SUB_TYPES = {
  MEDICAL_REPRESENTATIVE: {
    key: 'MEDICAL_REPRESENTATIVE',
    label: 'Medical Representative',
    description: 'Pharma, medical equipment, or healthcare products',
    icon: '💊',
  },
  SALES_MARKETING: {
    key: 'SALES_MARKETING',
    label: 'Sales & Marketing',
    description: 'Vendor sales, business proposals',
    icon: '📊',
  },
  SERVICE_MAINTENANCE: {
    key: 'SERVICE_MAINTENANCE',
    label: 'Service & Maintenance',
    description: 'AMC, equipment service, IT support',
    icon: '🔧',
  },
    CONSULTANT: {
    key: 'CONSULTANT',
    label: 'Consultant',
    description: 'External consultant, auditor, advisor',
    icon: '💼',
  },
  GENERAL_VISITOR: {
    key: 'GENERAL_VISITOR',
    label: 'General Visitor',
    description: 'Personal visit, interview, other',
    icon: '👤',
  },
} as const;

export const VISITOR_KINDS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'SALES_REPRESENTATIVE', label: 'Sales Representative' },
  { value: 'VENDOR', label: 'Vendor' },
] as const;

export type VisitorKind = (typeof VISITOR_KINDS)[number]['value'];

export const MEETING_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  started: 'Started',
  not_attended: 'Not attended',
  auto_expired: 'Auto-expired',
};

export const DELIVERY_SUB_TYPES = {
  PROFESSIONAL_GOODS: {
    key: 'PROFESSIONAL_GOODS',
    label: 'Professional Goods / Equipment',
    description: 'Medical supplies, equipment, scheduled deliveries',
    icon: '📦',
  },
  PACKAGE_COURIER: {
    key: 'PACKAGE_COURIER',
    label: 'Package / Courier / Documents',
    description: 'Amazon, Blue Dart, DTDC, courier packages',
    icon: '📬',
  },
  FOOD_DELIVERY: {
    key: 'FOOD_DELIVERY',
    label: 'Food Delivery',
    description: 'Swiggy, Zomato, Dominos',
    icon: '🍔',
  },
} as const;

export const DELIVERY_PLATFORMS = [
  'Swiggy',
  'Zomato',
  'Amazon',
  'Flipkart',
  'Blue Dart',
  'DTDC',
  'Delhivery',
  'Shadowfax',
  'Dunzo',
] as const;

export type MeetingSubTypeKey = keyof typeof MEETING_SUB_TYPES;
export type DeliverySubTypeKey = keyof typeof DELIVERY_SUB_TYPES;
export type DeliveryPlatform = (typeof DELIVERY_PLATFORMS)[number];

const FOOD_PLATFORMS = new Set(['Swiggy', 'Zomato', 'Dominos', 'Uber Eats', 'Blinkit']);
const PACKAGE_PLATFORMS = new Set(['Amazon', 'Flipkart', 'Blue Dart', 'DTDC', 'Delhivery', 'Shadowfax', 'Dunzo']);

/** Map delivery platform chip to visitSubType for API persistence. */
export function mapDeliveryPlatformToSubType(platform: string): DeliverySubTypeKey {
  if (FOOD_PLATFORMS.has(platform)) return 'FOOD_DELIVERY';
  if (PACKAGE_PLATFORMS.has(platform)) return 'PACKAGE_COURIER';
  return 'PROFESSIONAL_GOODS';
}
export function isProfileCompleteForMeeting(visitor: {
  email?: string | null;
  company?: string | null;
  designation?: string | null;
}): boolean {
  return Boolean(visitor.email && visitor.company && visitor.designation);
}
