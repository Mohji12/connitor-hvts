import type { VisitorAppointment } from '@/lib/services/visitorPortalService';

export type VisitFilter = 'upcoming' | 'pending' | 'past' | 'all';

/** A visit stays "upcoming" for two hours after its start, matching the gate pass window. */
const GRACE_MS = 2 * 60 * 60 * 1000;

const ACTIVE_STATUSES = new Set(['APPROVED', 'CHECKED_IN', 'REQUEST_SENT']);

export function isUpcomingVisit(item: VisitorAppointment, now: number = Date.now()): boolean {
  if (!ACTIVE_STATUSES.has(item.status)) return false;
  if (!item.appointmentDate) return true;
  return new Date(item.appointmentDate).getTime() >= now - GRACE_MS;
}

export function matchesVisitFilter(
  item: VisitorAppointment,
  filter: VisitFilter,
  now: number = Date.now(),
): boolean {
  switch (filter) {
    case 'upcoming':
      return isUpcomingVisit(item, now);
    case 'pending':
      return item.status === 'REQUEST_SENT';
    case 'past':
      return !isUpcomingVisit(item, now);
    default:
      return true;
  }
}

export interface VisitCounts {
  upcoming: number;
  pending: number;
  completed: number;
  total: number;
}

export function countVisits(items: VisitorAppointment[], now: number = Date.now()): VisitCounts {
  return {
    upcoming: items.filter((item) => isUpcomingVisit(item, now)).length,
    pending: items.filter((item) => item.status === 'REQUEST_SENT').length,
    completed: items.filter((item) => item.status === 'CHECKED_OUT').length,
    total: items.length,
  };
}

/** Upcoming visits soonest first; everything else most recent first. */
export function sortVisits(items: VisitorAppointment[], filter: VisitFilter): VisitorAppointment[] {
  const time = (item: VisitorAppointment): number =>
    item.appointmentDate ? new Date(item.appointmentDate).getTime() : 0;
  const sorted = [...items];
  if (filter === 'upcoming' || filter === 'pending') {
    sorted.sort((a, b) => time(a) - time(b));
  } else {
    sorted.sort((a, b) => time(b) - time(a));
  }
  return sorted;
}

export function hasGatePass(item: VisitorAppointment): boolean {
  return (item.status === 'APPROVED' || item.status === 'CHECKED_IN') && Boolean(item.checkInQrCode);
}

export function doctorLabel(name: string | null, hostKind?: string | null): string | null {
  if (!name) return null;
  if (hostKind === 'DISTRIBUTOR') return name;
  return `Dr. ${name.replace(/^Dr\.?\s*/i, '')}`;
}

export function hostLabel(item: Pick<VisitorAppointment, 'doctorName' | 'hostKind' | 'departmentName'>): string {
  return doctorLabel(item.doctorName, item.hostKind) ?? item.departmentName ?? 'Appointment';
}

export function passNoun(hostKind?: string | null): string {
  return hostKind === 'DISTRIBUTOR' ? 'Meeting pass' : 'Gate pass';
}
