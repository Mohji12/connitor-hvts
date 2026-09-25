import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Code,
  Database,
  FileSpreadsheet,
  GitBranch,
  Mail,
  MessageCircle,
  MessageSquare,
  Monitor,
  PackageCheck,
  PenLine,
  QrCode,
  ScanLine,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Snowflake,
  Store,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

/** Scroll-trigger animation phases (seconds), tuned to spec choreography */
export const HOW_IT_PHASES = {
  header: 0,
  leftPanel: 0.3,
  leftConnectors: 0.9,
  centerPanel: 1.1,
  rightConnectors: 2.0,
  rightPanel: 2.2,
  trustStrip: 2.8,
} as const;

export const STAGGER_SOURCE = 0.08;
export const STAGGER_OUTPUT = 0.08;
export const STAGGER_PIPELINE = 0.1;

/** Short choreography used when switching modules after the first reveal */
const QUICK_PHASES = {
  header: 0,
  leftPanel: 0,
  leftConnectors: 0.1,
  centerPanel: 0.05,
  rightConnectors: 0.15,
  rightPanel: 0.1,
  trustStrip: 0,
} as const;

export type Choreography = {
  phases: { [K in keyof typeof HOW_IT_PHASES]: number };
  stagger: number;
  pipelineStagger: number;
};

export function getChoreography(quick: boolean): Choreography {
  return quick
    ? { phases: QUICK_PHASES, stagger: 0.04, pipelineStagger: 0.05 }
    : { phases: HOW_IT_PHASES, stagger: STAGGER_SOURCE, pipelineStagger: STAGGER_PIPELINE };
}

export type PulseDot = "blue" | "green" | "purple" | null;

export type SourceItem = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  name: string;
  subtitle: string;
  pulseDot: PulseDot;
  featured?: boolean;
  nameHighlight?: boolean;
};

const visitorSources: SourceItem[] = [
  {
    icon: Briefcase,
    iconBg: "bg-[#EEF4FF]",
    iconColor: "text-[#4A90E2]",
    name: "Pharma CRM",
    subtitle: "Veeva · Salesforce · SAP",
    pulseDot: "blue",
  },
  {
    icon: Smartphone,
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#16A34A]",
    name: "Conninter Mobile App",
    subtitle: "iOS · Android · PWA",
    pulseDot: "green",
  },
  {
    icon: Building2,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-[#7C3AED]",
    name: "Hospital Admin Portal",
    subtitle: "Slot management · Rules",
    pulseDot: "purple",
  },
  {
    icon: FileSpreadsheet,
    iconBg: "bg-[#F1F5F9]",
    iconColor: "text-[#64748B]",
    name: "Excel / CSV Upload",
    subtitle: "Bulk rep schedules",
    pulseDot: null,
  },
  {
    icon: MessageCircle,
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#16A34A]",
    name: "WhatsApp Bot",
    subtitle: "Field rep requests",
    pulseDot: "green",
    featured: true,
  },
  {
    icon: Users,
    iconBg: "bg-[#EEF4FF]",
    iconColor: "text-[#4A90E2]",
    name: "Pre-registered Reps",
    subtitle: "2,400+ verified reps",
    pulseDot: "blue",
    nameHighlight: true,
  },
];

export type PipelineStatus = "done" | "active" | "pending";

export type PipelineStep = {
  icon: LucideIcon;
  name: string;
  bg: string;
  status: PipelineStatus;
};

const visitorPipeline: PipelineStep[] = [
  { icon: Search, name: "Search", bg: "bg-[#EEF4FF]", status: "done" },
  { icon: GitBranch, name: "Match", bg: "bg-[#EEF4FF]", status: "done" },
  { icon: CalendarCheck, name: "Book", bg: "bg-[#DBEAFE]", status: "active" },
  { icon: Shield, name: "Verify", bg: "bg-[#F1F5F9]", status: "pending" },
  { icon: CheckCircle, name: "Confirm", bg: "bg-[#F1F5F9]", status: "pending" },
];

export type IntelligenceCell = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

const visitorIntelligence: IntelligenceCell[] = [
  { icon: SlidersHorizontal, title: "140+ Parameters", detail: "Smart matching algorithm" },
  { icon: Brain, title: "Conflict Resolution", detail: "Auto-resolves overlaps" },
  { icon: Clock, title: "Real-Time Sync", detail: "Live slot updates" },
  { icon: ShieldCheck, title: "Rule Enforcement", detail: "Hospital visit policies" },
];

export type OutputItem = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  name: string;
  subtitle: string;
};

const visitorOutputs: OutputItem[] = [
  { icon: Mail, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "Email Notifications", subtitle: "Reps · Hospital staff" },
  { icon: MessageSquare, iconBg: "bg-[#ECFDF5]", iconColor: "text-[#16A34A]", name: "WhatsApp Alerts", subtitle: "Instant confirmations" },
  { icon: Calendar, iconBg: "bg-[#FFF7ED]", iconColor: "text-[#EA580C]", name: "Google Calendar", subtitle: "Auto-sync appointments" },
  { icon: Monitor, iconBg: "bg-[#F3E8FF]", iconColor: "text-[#7C3AED]", name: "Hospital Dashboard", subtitle: "Visitor management UI" },
  { icon: Database, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "Pharma CRM Sync", subtitle: "Activity logs · Veeva · SF" },
  { icon: BarChart3, iconBg: "bg-[#ECFDF5]", iconColor: "text-[#16A34A]", name: "Analytics & Reports", subtitle: "Visit compliance · trends" },
  { icon: Code, iconBg: "bg-[#F1F5F9]", iconColor: "text-[#64748B]", name: "Webhooks / API", subtitle: "Custom integrations" },
];

const deliverySources: SourceItem[] = [
  {
    icon: Store,
    iconBg: "bg-[#F0FDFA]",
    iconColor: "text-[#0D9488]",
    name: "Vendor Portal",
    subtitle: "Book · Fleet · Wallet",
    pulseDot: "green",
  },
  {
    icon: Truck,
    iconBg: "bg-[#FFFBEB]",
    iconColor: "text-[#D97706]",
    name: "Distributor Booking",
    subtitle: "Scheduled consignments",
    pulseDot: "blue",
  },
  {
    icon: ClipboardList,
    iconBg: "bg-[#F1F5F9]",
    iconColor: "text-[#64748B]",
    name: "ERP Purchase Orders",
    subtitle: "SAP · Oracle · Tally",
    pulseDot: null,
  },
  {
    icon: QrCode,
    iconBg: "bg-[#F0FDFA]",
    iconColor: "text-[#0D9488]",
    name: "Security Gate QR Scan",
    subtitle: "Vehicle & driver check-in",
    pulseDot: "green",
    featured: true,
  },
  {
    icon: Warehouse,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-[#7C3AED]",
    name: "Hospital Stores / Receiving",
    subtitle: "Dock capacity · Rules",
    pulseDot: "purple",
  },
  {
    icon: BadgeCheck,
    iconBg: "bg-[#FFFBEB]",
    iconColor: "text-[#D97706]",
    name: "Registered Vendors",
    subtitle: "Verified fleet & drivers",
    pulseDot: "blue",
    nameHighlight: true,
  },
];

const deliveryPipeline: PipelineStep[] = [
  { icon: CalendarCheck, name: "Book", bg: "bg-[#F0FDFA]", status: "done" },
  { icon: ScanLine, name: "Scan", bg: "bg-[#F0FDFA]", status: "done" },
  { icon: ShieldCheck, name: "Verify", bg: "bg-[#FEF3C7]", status: "active" },
  { icon: PackageCheck, name: "Receive", bg: "bg-[#F1F5F9]", status: "pending" },
  { icon: PenLine, name: "Handover", bg: "bg-[#F1F5F9]", status: "pending" },
];

const deliveryIntelligence: IntelligenceCell[] = [
  { icon: Warehouse, title: "Dock Slot Allocation", detail: "Balances dock capacity across vendors" },
  { icon: Truck, title: "Driver Checks", detail: "Verifies vehicle and driver at the gate" },
  { icon: Snowflake, title: "Cold-chain Priority", detail: "Fast-tracks temperature-sensitive goods" },
  { icon: ClipboardCheck, title: "PO Matching", detail: "Matches consignments to purchase orders" },
];

const deliveryOutputs: OutputItem[] = [
  { icon: Mail, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "Vendor SMS / Email", subtitle: "Slot & gate pass" },
  { icon: MessageSquare, iconBg: "bg-[#ECFDF5]", iconColor: "text-[#16A34A]", name: "WhatsApp ETA Alerts", subtitle: "Stores · Security" },
  { icon: Monitor, iconBg: "bg-[#F0FDFA]", iconColor: "text-[#0D9488]", name: "Receiving Dashboard", subtitle: "Today's deliveries" },
  { icon: ShieldCheck, iconBg: "bg-[#F3E8FF]", iconColor: "text-[#7C3AED]", name: "Security Gate Log", subtitle: "Entry · exit audit" },
  { icon: Database, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "ERP / Inventory Sync", subtitle: "GRN · stock updates" },
  { icon: Wallet, iconBg: "bg-[#FFFBEB]", iconColor: "text-[#D97706]", name: "Vendor Wallet & Billing", subtitle: "Slot fees · invoices" },
  { icon: BarChart3, iconBg: "bg-[#ECFDF5]", iconColor: "text-[#16A34A]", name: "Analytics & Reports", subtitle: "On-time rate · dwell time" },
];

export type FlowModule = {
  header: { title: string; subtitle: string };
  sourcesTitle: string;
  sources: SourceItem[];
  engineLabel: string;
  pipeline: PipelineStep[];
  intelligence: IntelligenceCell[];
  controlNote: string;
  outputs: OutputItem[];
};

export const visitorFlow: FlowModule = {
  header: {
    title: "Unified Scheduling Platform. Faster Hospital Access.",
    subtitle:
      "Plug Conninter into your existing CRM, spreadsheets, and hospital systems — and let the platform run your visit scheduling end-to-end.",
  },
  sourcesTitle: "DATA & SCHEDULING SOURCES",
  sources: visitorSources,
  engineLabel: "LIVE SCHEDULING WORKFLOW",
  pipeline: visitorPipeline,
  intelligence: visitorIntelligence,
  controlNote: "You control the scheduling rules and parameters",
  outputs: visitorOutputs,
};

export const deliveryFlow: FlowModule = {
  header: {
    title: "Unified Receiving Platform. Faster Hospital Deliveries.",
    subtitle:
      "Connect vendors, the security gate, and hospital stores — and let Conninter run every delivery from slot booking to signed receipt.",
  },
  sourcesTitle: "VENDOR & RECEIVING SOURCES",
  sources: deliverySources,
  engineLabel: "LIVE DELIVERY WORKFLOW",
  pipeline: deliveryPipeline,
  intelligence: deliveryIntelligence,
  controlNote: "You control dock capacity and receiving rules",
  outputs: deliveryOutputs,
};

export const trustBadges = [
  "NABH Compliant",
  "200+ Partner Hospitals",
  "2,400+ Verified Reps",
  "Real-Time Availability",
  "99.9% Uptime",
  "End-to-End Encrypted",
] as const;
