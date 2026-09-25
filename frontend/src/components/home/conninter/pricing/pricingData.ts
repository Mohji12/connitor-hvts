export type Audience = "hospitals" | "companies";
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
    id: "h-starter",
    name: "Starter",
    audienceTag: "For small clinics",
    tier: "standard",
    popular: false,
    monthlyAmount: 4999,
    annualMonthlyEquivalent: 3999,
    annualTotal: 47988,
    annualSavingsLabel: "Save ₹12,000/yr",
    features: [
      { text: "50 appointments/month", kind: "included" },
      { text: "Basic scheduling dashboard", kind: "included" },
      { text: "Email support", kind: "included" },
      { text: "1 department listing", kind: "included" },
      { text: "Standard slot management", kind: "included" },
      { text: "Advanced analytics dashboard", kind: "unavailable" },
      { text: "API access", kind: "unavailable" },
    ],
    socialProof: "✓ Used by 120+ small clinics",
    cta: { variant: "outline", text: "Start Free Trial" },
  },
  {
    id: "h-professional",
    name: "Professional",
    audienceTag: "For growing hospitals",
    tier: "popular",
    popular: true,
    monthlyAmount: 12999,
    annualMonthlyEquivalent: 10399,
    annualTotal: 124788,
    annualSavingsLabel: "Save ₹31,200/yr",
    inheritsFrom: "Starter",
    features: [
      { text: "200 appointments/month", kind: "included" },
      { text: "Analytics dashboard", kind: "highlight", showNewBadge: true },
      { text: "Priority email & phone support", kind: "included" },
      { text: "5 department listings", kind: "included" },
      { text: "Smart slot management", kind: "highlight", showNewBadge: true },
      { text: "Calendar integration", kind: "included" },
      { text: "Visitor pre-screening", kind: "included" },
    ],
    socialProof: "✓ Chosen by 340+ hospitals",
    cta: { variant: "gradient", text: "Start Free Trial →" },
  },
  {
    id: "h-enterprise",
    name: "Enterprise",
    audienceTag: "For large hospitals",
    tier: "enterprise",
    popular: false,
    monthlyAmount: 29999,
    annualMonthlyEquivalent: 23999,
    annualTotal: 287988,
    annualSavingsLabel: "Save ₹72,000/yr",
    inheritsFrom: "Professional",
    features: [
      { text: "Unlimited appointments", kind: "included" },
      { text: "Dedicated account manager", kind: "highlight", showNewBadge: true },
      { text: "API access", kind: "highlight", showNewBadge: true },
      { text: "Unlimited departments", kind: "included" },
      { text: "Custom branding", kind: "included" },
      { text: "SLA guarantee", kind: "included" },
      { text: "SSO integration", kind: "included" },
    ],
    socialProof: "✓ Trusted by 45+ hospital chains",
    cta: { variant: "outline", text: "Start Free Trial" },
  },
  {
    id: "h-custom",
    name: "Custom",
    audienceTag: "For hospital chains",
    tier: "contact",
    popular: false,
    monthlyAmount: null,
    annualMonthlyEquivalent: null,
    annualTotal: null,
    annualSavingsLabel: null,
    contactLabel: "Custom",
    contactHeadline: "Let's Talk",
    inheritsFrom: "Enterprise",
    features: [
      { text: "Multi-location management", kind: "highlight", showNewBadge: true },
      { text: "Bulk rep onboarding", kind: "included" },
      { text: "Custom integrations", kind: "included" },
      { text: "White-label options", kind: "included" },
      { text: "Dedicated infrastructure", kind: "included" },
      { text: "24/7 premium support", kind: "included" },
      { text: "Custom SLA", kind: "included" },
    ],
    socialProof: "✓ Powering India's top 10 pharma networks",
    cta: { variant: "outline-primary", text: "Talk to Sales →" },
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
  planNames: ["Starter", "Professional", "Enterprise", "Custom"],
  popularColumnIndex: 1,
  categories: [
    {
      label: "Scheduling",
      rows: [
        { feature: "Monthly appointments", cells: [{ type: "text", value: "50/mo" }, { type: "text", value: "200/mo" }, { type: "text", value: "Unlimited" }, { type: "text", value: "Custom" }] },
        { feature: "Departments", cells: [{ type: "text", value: "1" }, { type: "text", value: "5" }, { type: "text", value: "Unlimited" }, { type: "text", value: "Unlimited" }] },
        { feature: "Smart scheduling", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Calendar sync", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Analytics & Reporting",
      rows: [
        { feature: "Basic dashboard", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Advanced analytics", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Advanced reporting", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Support",
      rows: [
        { feature: "Email support", cells: [{ type: "check" }, { type: "check" }, { type: "check" }, { type: "check" }] },
        { feature: "Priority support", cells: [{ type: "cross" }, { type: "check" }, { type: "check" }, { type: "text", value: "24/7" }] },
        { feature: "Dedicated manager", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Integrations",
      rows: [
        { feature: "API access", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
        { feature: "SSO", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
      ],
    },
    {
      label: "Security & Compliance",
      rows: [
        { feature: "SLA guarantee", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "text", value: "Custom" }] },
        { feature: "Custom branding", cells: [{ type: "cross" }, { type: "cross" }, { type: "check" }, { type: "check" }] },
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
    a: "Yes — annual billing saves you 20% compared to monthly. That's up to ₹72,000 in savings per year on our Enterprise plan.",
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

export function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN");
}

export function getPlans(audience: Audience): PricingPlan[] {
  return audience === "hospitals" ? hospitalPlans : companyPlans;
}

export function getComparison(audience: Audience): ComparisonData {
  return audience === "hospitals" ? hospitalComparison : companyComparison;
}
