import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import type { VisitorPreviewData } from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { VisitorPortalService } from '@/lib/services/visitorPortalService';

export interface VisitorBookingIdentity {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  fromRegisteredAccount: boolean;
  profile: VisitorPreviewData | null;
}

function parseVisitorJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(atob(part)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function normalizePhone(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function fromPreview(profile: VisitorPreviewData): VisitorBookingIdentity {
  const fromName = splitName(profile.fullName ?? '');
  return {
    firstName: profile.firstName ?? fromName.firstName,
    lastName: profile.lastName ?? fromName.lastName,
    phone: normalizePhone(profile.phone),
    email: (profile.email ?? '').trim().toLowerCase(),
    fromRegisteredAccount: true,
    profile,
  };
}

/** Load visitor name / phone / email for public booking when a visitor session exists. */
export async function fetchVisitorBookingIdentity(): Promise<VisitorBookingIdentity | null> {
  const token = getVisitorToken();
  if (!token) return null;

  const payload = parseVisitorJwt(token);
  if (!payload || payload.role !== 'VISITOR') return null;

  const sub = String(payload.sub ?? '');

  if (sub && !sub.includes('@')) {
    try {
      const profile = await VisitorAccountApi.getMyProfile(token);
      return fromPreview(profile);
    } catch {
      try {
        const profile = await VisitorAccountApi.getPreview(sub);
        return fromPreview(profile);
      } catch {
        return null;
      }
    }
  }

  const email = String(payload.email ?? sub).trim().toLowerCase();
  let { firstName, lastName } = splitName(String(payload.name ?? ''));
  let phone = normalizePhone(String(payload.phone ?? ''));

  try {
    const dashboard = await VisitorPortalService.getAppointments();
    if (dashboard.visitorName) {
      const parsed = splitName(dashboard.visitorName);
      firstName = parsed.firstName || firstName;
      lastName = parsed.lastName || lastName;
    }
    phone = normalizePhone(dashboard.phone) || phone;
    if (dashboard.email) {
      return {
        firstName,
        lastName,
        phone,
        email: dashboard.email.trim().toLowerCase(),
        fromRegisteredAccount: false,
        profile: null,
      };
    }
  } catch {
    // Legacy session without dashboard data — still prefill email / name from JWT.
  }

  if (!email && !firstName) return null;

  return {
    firstName,
    lastName,
    phone,
    email,
    fromRegisteredAccount: false,
    profile: null,
  };
}
