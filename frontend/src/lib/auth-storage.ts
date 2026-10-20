import { isNativeApp } from '@/lib/platform';

/**
 * Staff/admin JWT. Browsers keep it per tab so multiple roles can stay signed in separately.
 * Capacitor / Expo WebView shells keep it in localStorage so staff stay signed in after
 * the WebView is closed (see `isNativeApp` + `__CONNINTER_NATIVE_SHELL__`).
 */
export const AUTH_TOKEN_STORAGE_KEY = 'authToken';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: unknown };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const native = isNativeApp();
  const fromLocal = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const fromSession = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const token = native ? fromLocal || fromSession : fromSession;
  if (!token) {
    return null;
  }
  if (isTokenExpired(token)) {
    clearStoredAuthToken();
    return null;
  }
  if (native && fromLocal !== token) {
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // Ignore quota / private-mode failures.
    }
  }
  return token;
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (isNativeApp()) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }
  sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  // Remove legacy shared storage so another tab cannot overwrite this session.
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
