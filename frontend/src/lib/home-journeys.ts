import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck,
  DoorOpen,
  IdCard,
  MapPin,
  UserCircle,
} from 'lucide-react';

export type VisitorJourneyId = 'pre-register' | 'book' | 'attendant' | 'gate' | 'track';

export interface JourneyCta {
  label: string;
  href: string;
}

export interface VisitorJourney {
  id: VisitorJourneyId;
  label: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  steps: string[];
  primaryCta: JourneyCta;
  secondaryCta: JourneyCta;
  note?: string;
}

export const VISITOR_JOURNEYS: VisitorJourney[] = [
  {
    id: 'pre-register',
    label: 'Pre-register',
    shortTitle: 'Create your Conninter profile',
    description:
      'Build a LinkedIn-style profile once — verify your email and phone, add a live photo and ID, then use it across every hospital visit.',
    icon: UserCircle,
    steps: [
      'Enter name, mobile, and work or personal email',
      'Add company, role, live photo, and government ID',
      'Verify email and phone, then activate your account',
    ],
    primaryCta: { label: 'Create your profile', href: '/visitor/register' },
    secondaryCta: { label: 'Sign in to your profile', href: '/visitor/login' },
  },
  {
    id: 'book',
    label: 'Book appointment',
    shortTitle: 'Schedule a hospital visit',
    description:
      'Choose a hospital, department, and doctor. Your Conninter profile pre-fills your details if you are signed in.',
    icon: CalendarCheck,
    steps: [
      'Select hospital, department, section, and doctor',
      'Pick date, time, and purpose of visit',
      'Submit — doctor reviews and approves your request',
    ],
    primaryCta: { label: 'Book appointment', href: '/book-appointment' },
    secondaryCta: { label: 'How booking works', href: '/book-appointment/how-it-works' },
  },
  {
    id: 'attendant',
    label: 'Attendant pass',
    shortTitle: 'Visit an admitted patient',
    description:
      'Apply for a family visit pass when a patient is already admitted. Choose your hospital, find the patient by name or MRN, and submit your request for ward approval.',
    icon: IdCard,
    steps: [
      'Select the hospital where the patient is admitted',
      'Search by patient name or enter their MRN',
      'Submit your details — ward reviews and emails your QR pass',
    ],
    primaryCta: { label: 'Apply for visit pass', href: '/attendant-pass' },
    secondaryCta: { label: 'Go to apply form', href: '/attendant-pass/apply' },
    note: 'Only one family member may hold an active pass at a time. Bring a government ID to security when you arrive.',
  },
  {
    id: 'gate',
    label: 'At the gate',
    shortTitle: 'Walk-in or QR check-in',
    description:
      'Scanned a branch QR code at the hospital? Start registration with your branch link, or use the public visitor form.',
    icon: DoorOpen,
    steps: [
      'Scan the hospital QR or open your branch registration link',
      'Verify your phone and complete visitor details',
      'Security approves and checks you in at the gate',
    ],
    primaryCta: { label: 'Start gate registration', href: '/visitor-registration' },
    secondaryCta: { label: 'Public visitor form', href: '/public-qr-visitor-form' },
    note: 'QR codes include ?branchId=… — keep that parameter when opening the link.',
  },
  {
    id: 'track',
    label: 'Track visit',
    shortTitle: 'Status, dashboard, and messages',
    description:
      'See if your appointment was approved, view your QR or OTP for check-in, and read messages from your doctor.',
    icon: MapPin,
    steps: [
      'Sign in with your Conninter profile or booking email',
      'View appointment status and doctor feedback',
      'Show your gate pass or OTP on arrival day',
    ],
    primaryCta: { label: 'My appointments', href: '/visitor/login' },
    secondaryCta: { label: 'Track by booking ID', href: '/book-appointment/status' },
  },
];

export const HOME_FEATURES = [
  {
    title: 'One profile everywhere',
    description: 'Pre-register once and reuse your verified profile at any connected hospital.',
  },
  {
    title: 'Book with confidence',
    description: 'Pick your doctor and time online. Get notified when your visit is approved.',
  },
  {
    title: 'Digital gate pass',
    description: 'Receive WhatsApp or SMS with your check-in OTP or QR after doctor approval.',
  },
  {
    title: 'Secure check-in',
    description: 'Security verifies your ID and live photo before you enter the hospital.',
  },
] as const;

export const VISITOR_FLOW_STEPS = [
  {
    step: 1,
    title: 'Book online',
    description: 'Pick hospital, department, section, and doctor. Enter your details and appointment time.',
    href: '/book-appointment',
    label: 'Book appointment',
    status: 'REQUEST_SENT',
  },
  {
    step: 2,
    title: 'Track status',
    description: 'Use your booking ID and phone to see if the doctor has approved your visit.',
    href: '/book-appointment/status',
    label: 'Check status',
    status: 'Awaiting approval',
  },
  {
    step: 3,
    title: 'Doctor approves',
    description:
      'Your doctor receives a WhatsApp message with appointment details and a secure one-time link to approve or decline.',
    href: '/book-appointment/status',
    label: 'Check status',
    status: 'APPROVED',
  },
  {
    step: 4,
    title: 'Visit the hospital',
    description: 'On your appointment day, go to security with a valid ID. They verify ID proof before check-in.',
    href: '/book-appointment/how-it-works',
    label: 'Security steps',
    status: 'APPROVED',
  },
  {
    step: 5,
    title: 'Check-in and meet doctor',
    description: 'Security checks you in with OTP or QR. Your doctor is notified when you arrive.',
    href: '/book-appointment/how-it-works',
    label: 'At the gate',
    status: 'CHECKED_IN',
  },
  {
    step: 6,
    title: 'Check-out',
    description: 'Security checks you out when you leave. Visit duration is recorded automatically.',
    href: '/book-appointment/status',
    label: 'Track completion',
    status: 'CHECKED_OUT',
  },
] as const;

export const HOME_TRUST_BADGES = [
  'Pre-register once',
  'Doctor approval',
  'Secure gate check-in',
] as const;
