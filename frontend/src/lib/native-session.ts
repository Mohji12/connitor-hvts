import { getDashboardPathForRole } from '@/lib/auth-routing';
import { getStoredAuthToken } from '@/lib/auth-storage';
import {
  getLastInAppPath,
  getLastNativePersona,
  type NativePersonaId,
} from '@/lib/native-session-paths';
import { getVisitorToken } from '@/lib/visitor-auth-storage';

export {
  NATIVE_PERSONA_KEY,
  clearLastInAppPath,
  getLastInAppPath,
  getLastNativePersona,
  inferNativePersona,
  isNativePersonaId,
  isResumableInAppPath,
  normalizeInAppPath,
  rememberCurrentInAppLocation,
  rememberInAppPath,
  setLastNativePersona,
} from '@/lib/native-session-paths';
export type { NativePersonaId } from '@/lib/native-session-paths';

function decodeStaffRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: unknown };
    return typeof payload.role === 'string' && payload.role ? payload.role : null;
  } catch {
    return null;
  }
}

function pickResumePath(persona: NativePersonaId, fallback: string): string {
  return getLastInAppPath(persona) ?? fallback;
}

/**
 * Where the native Welcome screen should send a still-signed-in user.
 * Returns null when nobody is signed in (show the persona chooser).
 */
export function resolveNativeResumePath(): string | null {
  if (typeof window === 'undefined') return null;

  const persona = getLastNativePersona();
  const staffToken = getStoredAuthToken();
  const visitorToken = getVisitorToken();
  const staffRole = staffToken ? decodeStaffRole(staffToken) : null;
  const staffOk = Boolean(staffToken && staffRole);
  const visitorOk = Boolean(visitorToken);
  const distributorOk = staffOk && staffRole === 'DISTRIBUTOR';

  if (persona === 'visitor' && visitorOk) {
    return pickResumePath('visitor', '/visitor/dashboard/');
  }
  if (persona === 'distributor' && distributorOk) {
    return pickResumePath('distributor', getDashboardPathForRole('DISTRIBUTOR'));
  }
  if (persona === 'staff' && staffOk && staffRole !== 'DISTRIBUTOR') {
    return pickResumePath('staff', getDashboardPathForRole(staffRole ?? ''));
  }
  if (staffOk) {
    const id: NativePersonaId = staffRole === 'DISTRIBUTOR' ? 'distributor' : 'staff';
    return pickResumePath(id, getDashboardPathForRole(staffRole ?? ''));
  }
  if (visitorOk) {
    return pickResumePath('visitor', '/visitor/dashboard/');
  }
  return null;
}
