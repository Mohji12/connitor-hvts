import { getDashboardPathForRole } from '@/lib/auth-routing';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { isJwtExpired, readJwtPayload } from '@/lib/jwt-claims';
import {
  getLastInAppPath,
  getLastNativePersona,
  isResumableInAppPath,
  type NativePersonaId,
} from '@/lib/native-session-paths';
import { isNativeApp } from '@/lib/platform';
import { getVisitorToken } from '@/lib/visitor-auth-storage';

export {
  NATIVE_PERSONA_KEY,
  NATIVE_WELCOME_PATH,
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
  if (isJwtExpired(token)) return null;
  const payload = readJwtPayload(token);
  const role = payload?.role;
  return typeof role === 'string' && role ? role : null;
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

/**
 * True when a native staff/visitor/distributor session is gone and the current
 * screen should not stay open. Attendant scan does not require a JWT.
 */
export function shouldReturnToNativeWelcome(pathWithSearch?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isNativeApp()) return false;
  const persona = getLastNativePersona();
  if (persona !== 'staff' && persona !== 'visitor' && persona !== 'distributor') {
    return false;
  }
  const path =
    pathWithSearch ?? `${window.location.pathname}${window.location.search}`;
  if (!isResumableInAppPath(path)) return false;
  return resolveNativeResumePath() === null;
}
