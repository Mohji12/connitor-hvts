export type Audience = "hospitals" | "companies";
export type PricingFocus = "visit" | "delivery" | "visitor";
export type Billing = "monthly" | "annual";
export type PlanTier = "standard" | "popular" | "enterprise" | "contact";
export type FeatureKind = "included" | "highlight" | "muted" | "unavailable";

export type CtaVariant = "outline" | "gradient" | "outline-primary";

export interface PlanFeature {
  text: string;
  kind: FeatureKind;
  showNewBadge?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  audienceTag: string;
  tier: PlanTier;
  popular: boolean;
  monthlyAmount: number | null;
  annualMonthlyEquivalent: number | null;
  annualTotal: number | null;
  annualSavingsLabel: string | null;
  /** Contact / sales-led plans */
  contactLabel?: string;
  contactHeadline?: string;
  inheritsFrom?: string;
  features: PlanFeature[];
  socialProof: string;
  cta: { variant: CtaVariant; text: string };
  /** Hospital card artwork */
  headerImage?: string;
  accent?: string;
  accentButton?: string;
  accentTint?: string;
  suitedFor?: string;
  icon?: "user" | "building" | "users" | "hospital";
}

/** Annual price is 20% below the monthly charge. */
function annualFromMonthly(monthly: number): Pick<
  PricingPlan,
  "monthlyAmount" | "annualMonthlyEquivalent" | "annualTotal" | "annualSavingsLabel"
> {
  const annualMonthlyEquivalent = Math.round(monthly * 0.8);
  const annualTotal = annualMonthlyEquivalent * 12;
  const saved = monthly * 12 - annualTotal;
  return {
    monthlyAmount: monthly,
    annualMonthlyEquivalent,
    annualTotal,
    annualSavingsLabel: `Save ₹${saved.toLocaleString("en-IN")}/yr`,
  };
}

export type ComparisonCell =
  | { type: "check" }
  | { type: "cross" }
  | { type: "text"; value: string };

export interface ComparisonCategory {
  label: string;
  rows: { feature: string; cells: ComparisonCell[] }[];
}

export interface ComparisonData {
  planNames: string[];
  popularColumnIndex: number;
  categories: ComparisonCategory[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export const hospitalPlans: PricingPlan[] = [
  {
    id: "h-clinic",
    name: "Clinic",
    audienceTag: "MR & HCP Interaction Management",
    tier: "standard",
    popular: false,
    ...annualFromMonthly(1499),
    suitedFor: "Clinics & individual practices",
    headerImage: "/images/pricing/clinic.png",
    accent: "#0F9F6E",
    accentButton: "#0B7A52",
    accentTint: "#E7F8F1",
    icon: "user",
    features: [
      { text: "HCP availability management", kind: "included" },
      { text: "MR appointment scheduling", kind: "included" },
      { text: "In-person & virtual meetings", kind: "included" },
      { text: "Visitor registration", kind: "included" },
      { text: "Check-in / Check-out", kind: "included" },
      { text: "Basic interaction reports", kind: "included" },
    ],
    socialProof: "Best suited for Clinics & individual practices",
    cta: { variant: "gradient", text: "Get Started" },
  },
  {
    id: "h-advanced",
    name: "Advanced",
    audienceTag: "Visitor & Delivery Management",
    tier: "standard",
    popular: false,
    ...annualFromMonthly(4999),
    inheritsFrom: "Clinic",
    suitedFor: "Standalone & small hospitals",
    headerImage: "/images/pricing/advanced.png",
    accent: "#2563EB",
    accentButton: "#1D4ED8",
    accentTint: "#E8F1FF",
    icon: "building",
    features: [
      { text: "Everything in Clinic", kind: "included" },
      { text: "Visitor Management System (VMS)", kind: "included" },
      { text: "Delivery Management System (DMS)", kind: "included" },
      { text: "Delivery tracking", kind: "included" },
      { text: "Security workflow", kind: "included" },
      { text: "Hospital operational dashboard", kind: "included" },
    ],
    socialProof: "Best suited for Standalone & small hospitals",
    cta: { variant: "gradient", text: "Get Started" },
  },
  {
    id: "h-pro",
    name: "Pro",
    audienceTag: "Hospital Access Operations",
    tier: "standard",
    popular: false,
    ...annualFromMonthly(10999),
    inheritsFrom: "Advanced",
    suitedFor: "Large hospitals",
    headerImage: "/images/pricing/pro.png",
    accent: "#7C3AED",
    accentButton: "#6D28D9",
    accentTint: "#F3E8FF",
    icon: "users",
    features: [
      { text: "Everything in Advanced", kind: "included" },
      { text: "Attendant Management System (AMS)", kind: "included" },
      { text: "Multi-user operational access", kind: "included" },
      { text: "Unit-level dashboard", kind: "included" },
      { text: "Advanced analytics", kind: "included" },
      { text: "Audit trails & role-based access", kind: "included" },
    ],
    socialProof: "Best suited for Large hospitals",
    cta: { variant: "gradient", text: "Get Started" },
  },
  {
    id: "h-premium",
    name: "Premium",
    audienceTag: "Multi-Hospital Intelligence",
    tier: "enterprise",
    popular: false,
    ...annualFromMonthly(15999),
    inheritsFrom: "Pro",
    suitedFor: "Hospital groups & chains",
    headerImage: "/images/pricing/premium.png",
    accent: "#F59E0B",
    accentButton: "#D97706",
    accentTint: "#FEF3C7",
    icon: "hospital",
    features: [
      { text: "Everything in Pro", kind: "included" },
      { text: "Multi-hospital management", kind: "included" },
      { text: "Centralised administration", kind: "included" },
      { text: "Group-level dashboard", kind: "included" },
      { text: "Hospital-wise analytics", kind: "included" },
      { text: "Consolidated reports & insights", kind: "included" },
    ],
    socialProof: "Best suited for Hospital groups & chains",
    cta: { variant: "gradient", text: "Talk to Sales" },
  },
];

export const companyPlans: PricingPlan[] = [
  {
    id: "c-basic",
    name: "Basic",
    audienceTag: "For small teams",
    tier: "standard",
    popular: false,
    monthlyAmount: 2999,
    annualMonthlyEquivalent: 2399,
    annualTotal: 28788,
    annualSavingsLabel: "Save ₹7,200/yr",
    features: [
      { text: "Up to 10 reps", kind: "included" },
      { text: "50 bookings/month", kind: "included" },
      { text: "Basic visit tracking", kind: "included" },
      { text: "Email support", kind: "included" },
      { text: "Rep scheduling calendar", kind: "included" },
      { text: "Analytics dashboard", kind: "unavailable" },
      { text: "CRM integration", kind: "unavailable" },
    ],
    socialProof: "✓ Trusted by 200+ pharma teams",
    cta: { variant: "outline", text: "Start Free Trial" },
  },
  {
    id: "c-growth",
    name: "Growth",
    audienceTag: "For scaling teams",
    tier: "popular",
    popular: true,
    monthlyAmount: 8999,
    annualMonthlyEquivalent: 7199,
    annualTotal: 86388,
    annualSavingsLabel: "Save ₹21,600/yr",
    inheritsFrom: "Basic",
    features: [
      { text: "Up to 30 reps", kind: "included" },
      { text: "200 bookings/month", kind: "included" },
      { text: "Visit analytics dashboard", kind: "highlight", showNewBadge: true },
      { text: "Priority support", kind: "included" },
      { text: "Calendar sync", kind: "included" },
      { text: "Territory mapping", kind: "highlight", showNewBadge: true },
      { text: "Rep performance tracking", kind: "included" },
    ],
    socialProof: "✓ Chosen by 340+ scaling teams",
    cta: { variant: "gradient", text: "Start Free Trial →" },
  },
  {
    id: "c-business",
    name: "Business",
    audienceTag: "For large sales forces",
    tier: "enterprise",
    popular: false,
    monthlyAmount: 19999,
    annualMonthlyEquivalent: 15999,
    annualTotal: 191988,
    annualSavingsLabel: "Save ₹48,000/yr",
    inheritsFrom: "Growth",
    features: [
      { text: "Up to 100 reps", kind: "included" },
      { text: "Unlimited bookings", kind: "included" },
      { text: "Advanced reporting", kind: "highlight", showNewBadge: true },
      { text: "Dedicated CSM", kind: "highlight", showNewBadge: true },
      { text: "Territory management", kind: "included" },
      { text: "CRM integration", kind: "included" },
    ],
    socialProof: "✓ Trusted by 45+ enterprise accounts",
    cta: { variant: "outline", text: "Start Free Trial" },
  },
  {
    id: "c-enterprise",
    name: "Enterprise",
    audienceTag: "For pharma at scale",
    tier: "contact",
    popular: false,
    monthlyAmount: null,
    annualMonthlyEquivalent: null,
    annualTotal: null,
    annualSavingsLabel: null,
    contactLabel: "Enterprise",
    contactHeadline: "Contact Sales",
    inheritsFrom: "Business",
    features: [
      { text: "Unlimited reps & bookings", kind: "included" },
      { text: "Custom workflows", kind: "highlight", showNewBadge: true },
      { text: "API + SSO", kind: "highlight", showNewBadge: true },
      { text: "Audit logs", kind: "included" },
      { text: "Multi-brand support", kind: "included" },
      { text: "Dedicated infrastructure", kind: "included" },
    ],
    socialProof: "✓ Powering India's top 10 pharma networks",
    cta: { variant: "outline-primary", text: "Talk to Sales →" },
  },
];

/** Column order matches plan arrays */
export const hospitalComparison: ComparisonData = {
  planNames: ["Clinic", "Advanced", "Pro", "Premium"],
  popularColumnIndex: 1,
  categories: [
    {
      label: "Meetings",
      rows: [
        { feature: "HCP availability", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "MR appointment scheduling", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "In-person & virtual meetings", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Basic interaction reports", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Visitor & delivery",
      rows: [
        { feature: "Visitor registration", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Check-in / Check-out", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Visitor Management System", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Delivery tracking", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Security workflow", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Hospital operations",
      rows: [
        { feature: "Operational dashboard", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Attendant management", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
        { feature: "Unit-level dashboard", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
        { feature: "Advanced analytics", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
        { feature: "Audit trails & role-based access", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Groups & chains",
      rows: [
        { feature: "Multi-hospital management", cells: [{ type: "cross" }, { type: "cross" }, { type: "cross" }, { type: "check" }] },
        { feature: "Centralised administration", cells: [{ type: "cross" }, { type: "cross" }, { type: "cross" }, { type: "check" }] },
        { feature: "Group-level dashboard", cells: [{ type: "cross" }, { type: "cross" }, { type: "cross" }, { type: "check" }] },
        { feature: "Hospital-wise analytics", cells: [{ type: "cross" }, { type: "cross" }, { type: "cross" }, { type: "check" }] },
      ],
    },
  ],
};

export const companyComparison: ComparisonData = {
  planNames: ["Basic", "Growth", "Business", "Enterprise"],
  popularColumnIndex: 1,
  categories: [
    {
      label: "Scheduling",
      rows: [
        { feature: "Reps included", cells: [{ type: "text", value: "10" }, { type: "text", value: "30" }, { type: "text", value: "100" }, { type: "text", value: "Unlimited" }] },
        { feature: "Bookings/month", cells: [{ type: "text", value: "50" }, { type: "text", value: "200" }, { type: "text", value: "Unlimited" }, { type: "text", value: "Unlimited" }] },
        { feature: "Territory mapping", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Analytics & Reporting",
      rows: [
        { feature: "Visit tracking", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Analytics dashboard", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Advanced reporting", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Support",
      rows: [
        { feature: "Email support", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Priority / CSM", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "text", value: "Dedicated" }] },
      ],
    },
    {
      label: "Integrations",
      rows: [
        { feature: "CRM integration", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
        { feature: "API + SSO", cells: [{ type: "cross" }, { type: "cross" }, { type: "cross" }, { type: "check" }] },
      ],
    },
  ],
};

export const pricingFaqs: FaqItem[] = [
  {
    q: "Can I switch between plans anytime?",
    a: "Yes. You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the end of your current billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Every plan comes with a 14-day free trial — no credit card required. You'll have full access to all features in your chosen plan during the trial period.",
  },
  {
    q: "What happens when I exceed my appointment limit?",
    a: "We'll notify you at 80% and 100% capacity. You can upgrade your plan instantly or purchase additional appointment packs at ₹99 per appointment.",
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes. Annual billing is 20% less than the monthly charge. Clinic is ₹1,199 per month instead of ₹1,499, and Premium is ₹12,799 per month instead of ₹15,999, billed once a year.",
  },
  {
    q: "Can I get a custom plan for my hospital chain?",
    a: "Absolutely. Our Custom plan is designed for multi-location hospital networks and large pharma companies. Contact our sales team for a tailored proposal.",
  },
];

export const testimonial = {
  quote:
    "Conninter reduced our hospital visit scheduling time by 73%. What used to take our team 2 days now takes 20 minutes.",
  name: "Vikram Krishnan",
  title: "National Sales Manager, Cipla Pharmaceuticals",
  initials: "VK",
};

export interface DeliveryPriceOption {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  amount: number;
  features: string[];
  accent: string;
  image: string;
}

export const deliveryPrices: DeliveryPriceOption[] = [
  {
    id: "two-wheeler",
    title: "Two Wheeler",
    subtitle: "Bike",
    minutes: 10,
    amount: 49,
    accent: "#00B4D8",
    image: "/images/pricing/delivery-bike.png",
    features: ["Samples & documents", "Small packages", "Quick handover"],
  },
  {
    id: "three-wheeler",
    title: "Three Wheeler",
    subtitle: "Tata Ace / 3W",
    minutes: 20,
    amount: 99,
    accent: "#3B82F6",
    image: "/images/pricing/delivery-auto.png",
    features: ["Small consumables", "Fast-moving items", "Single drop location"],
  },
  {
    id: "scv",
    title: "SCV",
    subtitle: "Pickup / Small CV",
    minutes: 30,
    amount: 299,
    accent: "#22C55E",
    image: "/images/pricing/delivery-scv.png",
    features: ["Routine deliveries", "Medium consignments", "Normal unloading"],
  },
  {
    id: "lcv",
    title: "LCV",
    subtitle: "Tata 407 / Light CV",
    minutes: 45,
    amount: 499,
    accent: "#2563EB",
    image: "/images/pricing/delivery-lcv.png",
    features: ["Medium-volume supplies", "Multi-item consignments", "Planned unloading"],
  },
  {
    id: "hcv",
    title: "HCV",
    subtitle: "Heavy commercial vehicle",
    minutes: 60,
    amount: 999,
    accent: "#7C3AED",
    image: "/images/pricing/delivery-hcv.png",
    features: ["High-volume stock", "Bulk consignments", "Dock allocation required"],
  },
];

export interface VisitorSessionRate {
  label: string;
  amount: string;
}

export interface VisitorPricePlan {
  id: string;
  indexLabel: string;
  title: string;
  subtitle: string;
  price: string;
  unit: string;
  summary: string;
  features: string[];
  accent: string;
  image: string;
  cta: string;
  href: string;
  sessions?: VisitorSessionRate[];
}

export const visitorPrices: VisitorPricePlan[] = [
  {
    id: "professional",
    indexLabel: "01",
    title: "Professional",
    subtitle: "On-site Platform Access",
    price: "₹199",
    unit: "/ platform request",
    summary: "For managing an on-site professional engagement workflow",
    accent: "#10B981",
    image: "/images/pricing/visitor-professional.png",
    cta: "Use Platform",
    href: "/book-appointment",
    features: [
      "HCP availability-based scheduling",
      "Digital appointment confirmation",
      "QR / visitor pass for hospital entry",
      "Hospital check-in & check-out workflow",
      "Interaction record & audit trail",
      "Compliance ready workflow",
    ],
  },
  {
    id: "team",
    indexLabel: "02",
    title: "Team",
    subtitle: "Digital Platform Access",
    price: "₹599",
    unit: "/ platform request",
    summary: "For managing a digital 1:1 engagement workflow",
    accent: "#2563EB",
    image: "/images/pricing/visitor-team.png",
    cta: "Use Platform",
    href: "/book-appointment",
    features: [
      "HCP availability-based scheduling",
      "Secure digital meeting workflow",
      "Appointment confirmation",
      "Attendance & interaction record",
      "Audit trail & reporting",
      "Compliance ready workflow",
    ],
  },
  {
    id: "business",
    indexLabel: "03",
    title: "Business",
    subtitle: "Group Platform Access",
    price: "From ₹799",
    unit: "/ session",
    summary: "For managing a digital group engagement workflow",
    accent: "#7C3AED",
    image: "/images/pricing/visitor-business.png",
    cta: "Use Platform",
    href: "/book-appointment",
    sessions: [
      { label: "Up to 15 minutes", amount: "₹799" },
      { label: "16–30 minutes", amount: "₹999" },
      { label: "31–45 minutes", amount: "₹1,499" },
      { label: "46–60 minutes", amount: "₹1,999" },
      { label: "60+ minutes", amount: "Custom" },
    ],
    features: [
      "Group session scheduling",
      "Multiple participant invitations",
      "Secure digital meeting platform",
      "Attendance tracking & session record",
      "Audit trail & post-session reporting",
      "Compliance ready workflow",
    ],
  },
  {
    id: "enterprise",
    indexLabel: "04",
    title: "Enterprise",
    subtitle: "Custom Engagement Platform",
    price: "Custom Solutions",
    unit: "",
    summary: "For Pharma, MedTech & Healthcare Organisations",
    accent: "#F97316",
    image: "/images/pricing/visitor-enterprise.png",
    cta: "Reach Out",
    href: "/portal?intent=register",
    features: [
      "Organisation-wide user management",
      "Multiple teams & territories",
      "Multi-hospital workflows",
      "Advanced analytics & reporting",
      "API / system integrations",
      "Custom workflow configuration",
      "Dedicated enterprise support",
    ],
  },
];

export function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN");
}

export function getPlans(audience: Audience): PricingPlan[] {
  return audience === "hospitals" ? hospitalPlans : companyPlans;
}

export function getComparison(audience: Audience): ComparisonData {
  return audience === "hospitals" ? hospitalComparison : companyComparison;
}
