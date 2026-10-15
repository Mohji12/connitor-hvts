import type { PublicDoctor } from '@/lib/services/appointmentService';
import type { VisitorKind } from '@/lib/constants/visit-constants';

const STORAGE_KEY = 'bookAppointmentDraft';

/** Booking filled in up to the payment step, kept while the visitor recharges their wallet. */
export interface BookingDraft {
  branchId: string;
  branchName: string;
  departmentId: string;
  subDepartmentId: string;
  doctorId: string;
  selectedDoctor: PublicDoctor | null;
  appointmentDate: string;
  slotId: string;
  requestCustomSlot: boolean;
  preferredTime: string;
  purpose: string;
  itemsCarrying: string;
  appointmentMode: 'IN_PERSON' | 'ONLINE';
  visitorType: VisitorKind;
  companyName: string;
  companyEmail: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  profileCreatedHere: boolean;
  /** Step to reopen at; payment (6) unless the visitor still has to fill visit details. */
  resumeStep?: 6 | '5A';
}

export function saveBookingDraft(draft: BookingDraft): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable (private mode); the visitor will refill the form */
  }
}

export function loadBookingDraft(): BookingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

export function clearBookingDraft(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Current page URL with `resume=1`, so the booking reopens at the payment step. */
export function bookingResumeHref(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('resume', '1');
  return `${url.pathname}${url.search}`;
}
