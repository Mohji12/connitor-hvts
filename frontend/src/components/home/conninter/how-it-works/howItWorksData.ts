import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarCheck,
  CheckCircle,
  Clock,
  Mail,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  QrCode,
  ScanLine,
  Search,
  Shield,
  ShieldCheck,
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
    icon: Users,
    iconBg: "bg-[#EEF4FF]",
    iconColor: "text-[#4A90E2]",
    name: "Visitor",
    subtitle: "Books the doctor visit",
    pulseDot: "blue",
  },
  {
    icon: Building2,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-[#7C3AED]",
    name: "Hospital",
    subtitle: "Location · department · section",
    pulseDot: "purple",
  },
  {
    icon: CalendarCheck,
    iconBg: "bg-[#EEF4FF]",
    iconColor: "text-[#4A90E2]",
    name: "Doctor schedule",
    subtitle: "Open time slots",
    pulseDot: "blue",
  },
  {
    icon: Wallet,
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#16A34A]",
    name: "Visit fee",
    subtitle: "Wallet or online",
    pulseDot: "green",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#16A34A]",
    name: "WhatsApp",
    subtitle: "Meeting pass or rejection",
    pulseDot: "green",
    featured: true,
  },
  {
    icon: Shield,
    iconBg: "bg-[#F1F5F9]",
    iconColor: "text-[#64748B]",
    name: "Security gate",
    subtitle: "Check-in and check-out",
    pulseDot: null,
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
  { icon: Search, name: "Find", bg: "bg-[#EEF4FF]", status: "done" },
  { icon: Wallet, name: "Pay", bg: "bg-[#EEF4FF]", status: "done" },
  { icon: Clock, name: "Wait", bg: "bg-[#DBEAFE]", status: "active" },
  { icon: CheckCircle, name: "Doctor", bg: "bg-[#F1F5F9]", status: "pending" },
  { icon: QrCode, name: "Gate", bg: "bg-[#F1F5F9]", status: "pending" },
];

export type IntelligenceCell = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

const visitorIntelligence: IntelligenceCell[] = [
  { icon: Search, title: "Find a slot", detail: "Hospital, department, section, doctor, and an open time." },
  { icon: Wallet, title: "Pay the fee", detail: "Sign in, give the purpose and what they are carrying. Wallet is a hold. Online pay is taken now." },
  { icon: Clock, title: "Wait for the doctor", detail: "The booking stays pending until the doctor decides." },
  { icon: CheckCircle, title: "Doctor decides", detail: "Confirm sends the WhatsApp meeting pass. Reject releases the hold or refunds the payment." },
  { icon: QrCode, title: "Enter and leave", detail: "Security scans the QR to check in, then again to check out." },
  { icon: ShieldCheck, title: "Urgent visit", detail: "A doctor passcode is approved at the gate, so the fee is charged at booking." },
];

export type OutputItem = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  name: string;
  subtitle: string;
};

const visitorOutputs: OutputItem[] = [
  { icon: Clock, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "Pending booking", subtitle: "Until the doctor decides" },
  { icon: Wallet, iconBg: "bg-[#FFF7ED]", iconColor: "text-[#EA580C]", name: "Wallet hold", subtitle: "Charged only after confirm" },
  { icon: MessageSquare, iconBg: "bg-[#ECFDF5]", iconColor: "text-[#16A34A]", name: "Meeting pass", subtitle: "WhatsApp check-in QR" },
  { icon: Mail, iconBg: "bg-[#F1F5F9]", iconColor: "text-[#64748B]", name: "Rejection", subtitle: "Hold released or payment refunded" },
  { icon: QrCode, iconBg: "bg-[#F3E8FF]", iconColor: "text-[#7C3AED]", name: "Gate check-in", subtitle: "Security scans the pass" },
  { icon: ScanLine, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "Gate check-out", subtitle: "Same QR on the way out" },
];

const deliverySources: SourceItem[] = [
  {
    icon: Store,
    iconBg: "bg-[#F0FDFA]",
    iconColor: "text-[#0D9488]",
    name: "Distributor",
    subtitle: "Approved vendor books the slot",
    pulseDot: "green",
  },
  {
    icon: Building2,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-[#7C3AED]",
    name: "Hospital",
    subtitle: "Branch and delivery windows",
    pulseDot: "purple",
  },
  {
    icon: Truck,
    iconBg: "bg-[#FFFBEB]",
    iconColor: "text-[#D97706]",
    name: "Vehicle and driver",
    subtitle: "Assigned on the booking",
    pulseDot: "blue",
  },
  {
    icon: Wallet,
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#16A34A]",
    name: "Delivery fee",
    subtitle: "Charged from the wallet",
    pulseDot: "green",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#16A34A]",
    name: "WhatsApp",
    subtitle: "Delivery pass to the driver",
    pulseDot: "green",
    featured: true,
  },
  {
    icon: Shield,
    iconBg: "bg-[#F1F5F9]",
    iconColor: "text-[#64748B]",
    name: "Security and stores",
    subtitle: "Gate scan and receiving",
    pulseDot: null,
    nameHighlight: true,
  },
];

const deliveryPipeline: PipelineStep[] = [
  { icon: CalendarCheck, name: "Book", bg: "bg-[#F0FDFA]", status: "done" },
  { icon: Wallet, name: "Pay", bg: "bg-[#F0FDFA]", status: "done" },
  { icon: MessageSquare, name: "Pass", bg: "bg-[#FEF3C7]", status: "active" },
  { icon: QrCode, name: "Gate", bg: "bg-[#F1F5F9]", status: "pending" },
  { icon: PackageCheck, name: "Receive", bg: "bg-[#F1F5F9]", status: "pending" },
];

const deliveryIntelligence: IntelligenceCell[] = [
  { icon: CalendarCheck, title: "Book the slot", detail: "An approved distributor picks the hospital, an open window, the vehicle, the driver, and the packages." },
  { icon: Wallet, title: "Pay the fee", detail: "The fee for that vehicle comes off the wallet, and the unload minutes on the window are reserved." },
  { icon: MessageSquare, title: "Delivery pass", detail: "The booking is scheduled at once. The driver gets a WhatsApp pass with the entry QR." },
  { icon: QrCode, title: "Gate entry", detail: "Security scans the entry QR. A hold blocks entry until security releases it." },
  { icon: Warehouse, title: "Receive the goods", detail: "Hospital stores check the consignment and record the goods received note." },
  { icon: ScanLine, title: "Leave the gate", detail: "Security scans the checkout QR only after the goods have been received." },
];

const deliveryOutputs: OutputItem[] = [
  { icon: CalendarCheck, iconBg: "bg-[#F0FDFA]", iconColor: "text-[#0D9488]", name: "Scheduled delivery", subtitle: "Booked as soon as it is paid" },
  { icon: Wallet, iconBg: "bg-[#FFFBEB]", iconColor: "text-[#D97706]", name: "Wallet charge", subtitle: "Fee taken at booking" },
  { icon: MessageSquare, iconBg: "bg-[#ECFDF5]", iconColor: "text-[#16A34A]", name: "Delivery pass", subtitle: "WhatsApp entry QR for the driver" },
  { icon: QrCode, iconBg: "bg-[#F3E8FF]", iconColor: "text-[#7C3AED]", name: "Gate entry", subtitle: "Security scans the pass" },
  { icon: PackageCheck, iconBg: "bg-[#EEF4FF]", iconColor: "text-[#4A90E2]", name: "Goods received", subtitle: "Stores record the receipt" },
  { icon: ScanLine, iconBg: "bg-[#F0FDFA]", iconColor: "text-[#0D9488]", name: "Gate exit", subtitle: "Checkout QR after receiving" },
];

export type FlowModule = {
  header: { title: string; subtitle: string };
  sourcesTitle: string;
  sources: SourceItem[];
  engineLabel: string;
  pipeline: PipelineStep[];
  intelligence: IntelligenceCell[];
  controlNote: string;
  outputsTitle: string;
  outputs: OutputItem[];
};

export const visitorFlow: FlowModule = {
  header: {
    title: "A visitor visit, from the slot to the gate.",
    subtitle:
      "The visitor books a doctor and pays the visit fee. The visit stays pending until the doctor confirms it, then security scans the pass.",
  },
  sourcesTitle: "WHO TAKES PART",
  sources: visitorSources,
  engineLabel: "VISITOR VISIT WORKFLOW",
  pipeline: visitorPipeline,
  intelligence: visitorIntelligence,
  controlNote: "The visit stays pending until the doctor confirms it.",
  outputsTitle: "WHAT THE VISIT PRODUCES",
  outputs: visitorOutputs,
};

export const deliveryFlow: FlowModule = {
  header: {
    title: "A hospital delivery, from the slot to the gate.",
    subtitle:
      "An approved distributor books a window and pays from the wallet. The driver gets a WhatsApp pass, security scans them in, stores receive the goods, then security scans them out.",
  },
  sourcesTitle: "WHO TAKES PART",
  sources: deliverySources,
  engineLabel: "DELIVERY BOOKING WORKFLOW",
  pipeline: deliveryPipeline,
  intelligence: deliveryIntelligence,
  controlNote: "The delivery is scheduled as soon as the distributor pays.",
  outputsTitle: "WHAT THE DELIVERY PRODUCES",
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
