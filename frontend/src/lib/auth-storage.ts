import { isNativeApp } from '@/lib/platform';

/**
 * Staff/admin JWT. Browsers keep it per tab so multiple roles can stay signed in separately.
 * Capacitor / Expo WebView shells keep it in localStorage so staff stay signed in after
 * the WebView is closed (see `isNativeApp` + `__CONNINTER_NATIVE_SHELL__`).
 */
export const AUTH_TOKEN_STORAGE_KEY = 'authToken';

function tokenStore(): Storage {
  return isNativeApp() ? localStorage : sessionStorage;
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return tokenStore().getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (isNativeApp()) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
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
