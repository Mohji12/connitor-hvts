import { isStandaloneAuthPath, isAppHome } from '@/lib/app-back';
import { isNativeApp } from '@/lib/platform';

export const NATIVE_PERSONA_KEY = 'conninterPersona';
const LAST_PATHS_KEY = 'conninterLastInAppPaths';

export type NativePersonaId = 'visitor' | 'staff' | 'distributor' | 'attendant';

type LastPaths = Partial<Record<NativePersonaId, string>>;

const PERSONAS: NativePersonaId[] = ['visitor', 'staff', 'distributor', 'attendant'];

export function isNativePersonaId(value: string | null | undefined): value is NativePersonaId {
  return PERSONAS.includes(value as NativePersonaId);
}

export function getLastNativePersona(): NativePersonaId | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(NATIVE_PERSONA_KEY);
  return isNativePersonaId(saved) ? saved : null;
}

export function setLastNativePersona(id: NativePersonaId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NATIVE_PERSONA_KEY, id);
}

function readLastPaths(): LastPaths {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LAST_PATHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const next: LastPaths = {};
    for (const id of PERSONAS) {
      const value = (parsed as Record<string, unknown>)[id];
      if (typeof value === 'string' && value.startsWith('/')) {
        next[id] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function writeLastPaths(next: LastPaths): void {
  localStorage.setItem(LAST_PATHS_KEY, JSON.stringify(next));
}

export function normalizeInAppPath(path: string): string {
  const trimmed = path.trim();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const [pathname = '/', search = ''] = withSlash.split('?');
  const cleanPath = pathname.replace(/\/{2,}/g, '/') || '/';
  const params = new URLSearchParams(search);
  params.delete('_cb');
  params.delete('native');
  const query = params.toString();
  return query ? `${cleanPath}?${query}` : cleanPath;
}

/** Login, register, welcome, and marketing URLs must not be restored as a session. */
export function isResumableInAppPath(pathWithSearch: string): boolean {
  const path = (pathWithSearch.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
  if (path === '/') return false;
  if (isAppHome(path)) return false;
  if (isStandaloneAuthPath(path)) return false;
  if (path.startsWith('/visitor/oauth')) return false;
  return path.startsWith('/');
}

export function inferNativePersona(pathWithSearch: string): NativePersonaId | null {
  const path = (pathWithSearch.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
  if (
    path.startsWith('/visitor') ||
    path.startsWith('/book-appointment') ||
    path.startsWith('/visitor-pass') ||
    path.startsWith('/visitor-registration')
  ) {
    return 'visitor';
  }
  if (path.startsWith('/vendor') || path.startsWith('/delivery')) {
    return 'distributor';
  }
  if (path.startsWith('/attendant')) {
    return 'attendant';
  }
  if (
    path.startsWith('/dashboard') ||
    path.startsWith('/security') ||
    path.startsWith('/portal') ||
    path.startsWith('/staff')
  ) {
    return 'staff';
  }
  return null;
}

function pathMatchesPersona(pathWithSearch: string, persona: NativePersonaId): boolean {
  return inferNativePersona(pathWithSearch) === persona;
}

export function rememberInAppPath(pathWithSearch: string): void {
  if (typeof window === 'undefined' || !isNativeApp()) return;
  if (!isResumableInAppPath(pathWithSearch)) return;
  const normalized = normalizeInAppPath(pathWithSearch);
  const persona = inferNativePersona(normalized) ?? getLastNativePersona();
  if (!persona) return;
  writeLastPaths({ ...readLastPaths(), [persona]: normalized });
  setLastNativePersona(persona);
}

export function rememberCurrentInAppLocation(): void {
  if (typeof window === 'undefined') return;
  rememberInAppPath(`${window.location.pathname}${window.location.search}`);
}

export function getLastInAppPath(persona: NativePersonaId): string | null {
  const saved = readLastPaths()[persona];
  if (!saved || !isResumableInAppPath(saved) || !pathMatchesPersona(saved, persona)) {
    return null;
  }
  return saved;
}

export function clearLastInAppPath(persona?: NativePersonaId): void {
  if (typeof window === 'undefined') return;
  if (!persona) {
    localStorage.removeItem(LAST_PATHS_KEY);
    return;
  }
  const next = { ...readLastPaths() };
  delete next[persona];
  writeLastPaths(next);
}
