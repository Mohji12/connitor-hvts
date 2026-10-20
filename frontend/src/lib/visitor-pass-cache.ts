import type { VisitorAppointment } from '@/lib/services/visitorPortalService';

const CACHE_KEY = 'visitorPassCache';

export type CachedVisitorPass = Pick<
  VisitorAppointment,
  | 'bookingId'
  | 'status'
  | 'appointmentDate'
  | 'doctorName'
  | 'departmentName'
  | 'branchName'
  | 'checkInQrCode'
  | 'checkInOtp'
  | 'checkInOtpExpiry'
> & { cachedAt: string };

function readAll(): Record<string, CachedVisitorPass> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CachedVisitorPass>) : {};
  } catch {
    return {};
  }
}

function writeAll(next: Record<string, CachedVisitorPass>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the pass page falls back to the network.
  }
}

function isActivePassStatus(status: string): boolean {
  return status === 'APPROVED' || status === 'CHECKED_IN';
}

/** Keep usable passes on this phone so the QR still opens at the gate without signal. */
export function cacheVisitorPasses(appointments: VisitorAppointment[]): void {
  if (typeof window === 'undefined') return;
  const now = new Date().toISOString();
  const next = readAll();
  for (const a of appointments) {
    if (!a.bookingId) continue;
    if (!isActivePassStatus(a.status)) {
      delete next[a.bookingId];
      continue;
    }
    if (!a.checkInQrCode && !next[a.bookingId]?.checkInQrCode) continue;
    next[a.bookingId] = {
      bookingId: a.bookingId,
      status: a.status,
      appointmentDate: a.appointmentDate,
      doctorName: a.doctorName,
      departmentName: a.departmentName,
      branchName: a.branchName,
      checkInQrCode: a.checkInQrCode ?? next[a.bookingId]?.checkInQrCode ?? null,
      checkInOtp: a.checkInOtp ?? next[a.bookingId]?.checkInOtp ?? null,
      checkInOtpExpiry: a.checkInOtpExpiry ?? next[a.bookingId]?.checkInOtpExpiry ?? null,
      cachedAt: now,
    };
  }
  writeAll(next);
}

export function listCachedVisitorPasses(): CachedVisitorPass[] {
  return Object.values(readAll()).sort((a, b) => (a.cachedAt < b.cachedAt ? 1 : -1));
}

export function getCachedVisitorPass(bookingId: string): CachedVisitorPass | null {
  return readAll()[bookingId] ?? null;
}

export function clearVisitorPassCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

/** Next approved visit (soonest first), used for the home hero card. */
export function pickUpcomingVisit(appointments: VisitorAppointment[]): VisitorAppointment | null {
  const now = Date.now() - 2 * 60 * 60 * 1000;
  const candidates = appointments.filter(
    (a) =>
      (a.status === 'APPROVED' || a.status === 'CHECKED_IN' || a.status === 'REQUEST_SENT') &&
      (!a.appointmentDate || new Date(a.appointmentDate).getTime() >= now),
  );
  candidates.sort((a, b) => {
    const ta = a.appointmentDate ? new Date(a.appointmentDate).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.appointmentDate ? new Date(b.appointmentDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
  return candidates[0] ?? null;
}
