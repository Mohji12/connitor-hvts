import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  Phone,
  Store,
  Truck,
} from 'lucide-react';
import type { ShowcaseModule } from './ModuleToggle';

export type HeroStepStatus = 'done' | 'active' | 'pending';

export type HeroModule = {
  heading: string;
  subtext: string;
  searchPlaceholder: string;
  ctaHref: string;
  /** Hero pills (phone / quick book / WhatsApp, etc.) — sign-in before booking */
  quickActionHref: string;
  quickActions: { icon: LucideIcon; label: string }[];
  score: {
    title: string;
    metrics: { label: string; value: number }[];
    overall: number;
    barClass: string;
  };
  slots: {
    title: string;
    borderClass: string;
    rows: { initials: string; name: string; role: string; color: string }[];
    count: number;
    countLabel: string;
    countClass: string;
    barClass: string;
  };
  workflow: {
    title: string;
    subject: string;
    steps: { label: string; value: string; status: HeroStepStatus }[];
    liveDotClass: string;
    doneBg: string;
    doneText: string;
    activeBg: string;
    activeText: string;
    activeDot: string;
  };
  confirm: {
    title: string;
    message: string;
    icon: LucideIcon;
    borderClass: string;
    iconWrapClass: string;
    toneClass: string;
  };
  stats: {
    label: string;
    unit: string;
    ratio: number;
  };
};

export const heroModules: Record<ShowcaseModule, HeroModule> = {
  visitor: {
    heading: 'Schedule hospital visits in minutes, not hours.',
    subtext:
      "India's most advanced platform for coordinating medical reps and hospital visitor management. Find hospitals, check real-time slot availability, and book your visit — all in one place.",
    searchPlaceholder: 'Search hospitals, specialties, or departments',
    ctaHref: '/book-appointment',
    quickActionHref: '/portal',
    quickActions: [
      { icon: Phone, label: 'Book via Phone Call' },
      { icon: CalendarClock, label: 'Quick Book' },
      { icon: MessageCircle, label: 'Book via WhatsApp' },
    ],
    score: {
      title: 'VISIT SCORE · ARJUN M.',
      metrics: [
        { label: 'Punctuality', value: 97 },
        { label: 'Compliance', value: 92 },
        { label: 'Frequency', value: 88 },
      ],
      overall: 94,
      barClass: 'bg-secondary',
    },
    slots: {
      title: 'SLOT AVAILABILITY · LIVE',
      borderClass: 'border-l-[hsl(271,81%,56%)]',
      rows: [
        { initials: 'RK', name: 'Dr. Rajesh K.', role: 'Cardiology', color: 'bg-secondary' },
        { initials: 'PS', name: 'Dr. Priya S.', role: 'Oncology', color: 'bg-success' },
      ],
      count: 5,
      countLabel: 'available',
      countClass: 'text-success',
      barClass: 'bg-secondary/60',
    },
    workflow: {
      title: 'SCHEDULING WORKFLOW · RUN #12',
      subject: 'Hospital Visit — Apollo Chennai',
      steps: [
        { label: 'SEARCH', value: '42 hospitals', status: 'done' },
        { label: 'MATCH', value: '8 available', status: 'done' },
        { label: 'BOOK', value: '1 slot', status: 'active' },
        { label: 'CONFIRM', value: '—', status: 'pending' },
      ],
      liveDotClass: 'bg-success',
      doneBg: 'bg-success/10',
      doneText: 'text-success',
      activeBg: 'bg-secondary/10',
      activeText: 'text-secondary',
      activeDot: 'bg-secondary',
    },
    confirm: {
      title: 'BOOKING CONFIRMED · LIVE',
      message: '"Appointment with Dr. Rajesh K. — 2:30 PM, Apollo Chennai"',
      icon: MessageSquare,
      borderClass: 'border-l-success',
      iconWrapClass: 'bg-success/10',
      toneClass: 'text-success',
    },
    stats: { label: 'BOOKED', unit: 'appointments', ratio: 1 },
  },
  delivery: {
    heading: 'Hospital deliveries, received on schedule.',
    subtext:
      'Give vendors and distributors a single place to book dock slots, pass the security gate with a QR scan, and hand over to stores with verified sign-off — no more queues at the loading bay.',
    searchPlaceholder: 'Search hospitals, docks, or receiving slots',
    ctaHref: '/vendor/deliveries/book',
    quickActionHref: '/portal',
    quickActions: [
      { icon: Truck, label: 'Book Delivery Slot' },
      { icon: Store, label: 'Vendor Portal' },
      { icon: MessageCircle, label: 'Track via WhatsApp' },
    ],
    score: {
      title: 'VENDOR · MEDIKART',
      metrics: [
        { label: 'On-time', value: 96 },
        { label: 'Documents', value: 94 },
        { label: 'Accuracy', value: 91 },
      ],
      overall: 93,
      barClass: 'bg-teal-600',
    },
    slots: {
      title: 'DOCK SLOTS · LIVE',
      borderClass: 'border-l-amber-500',
      rows: [
        { initials: 'DA', name: 'Dock A', role: 'General stores', color: 'bg-teal-600' },
        { initials: 'DB', name: 'Dock B', role: 'Cold chain', color: 'bg-amber-500' },
      ],
      count: 3,
      countLabel: 'open',
      countClass: 'text-teal-600',
      barClass: 'bg-amber-400/70',
    },
    workflow: {
      title: 'DELIVERY WORKFLOW · RUN #27',
      subject: 'Consignment — Apollo Chennai',
      steps: [
        { label: 'BOOK', value: 'Dock A', status: 'done' },
        { label: 'SCAN', value: 'Gate QR', status: 'done' },
        { label: 'RECEIVE', value: '12 cartons', status: 'active' },
        { label: 'GRN', value: 'sign-off', status: 'pending' },
      ],
      liveDotClass: 'bg-teal-600',
      doneBg: 'bg-teal-50',
      doneText: 'text-teal-700',
      activeBg: 'bg-amber-50',
      activeText: 'text-amber-700',
      activeDot: 'bg-amber-500',
    },
    confirm: {
      title: 'DELIVERY RECEIVED · LIVE',
      message: '"12 cartons received at Dock A — signed by Stores"',
      icon: PackageCheck,
      borderClass: 'border-l-teal-600',
      iconWrapClass: 'bg-teal-50',
      toneClass: 'text-teal-700',
    },
    stats: { label: 'DELIVERED', unit: 'consignments', ratio: 0.27 },
  },
};
