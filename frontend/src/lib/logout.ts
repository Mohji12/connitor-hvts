import { DEMO_USER_ID_STORAGE_KEY } from '@/lib/demo-config';
import { clearStoredAuthToken } from '@/lib/auth-storage';

const AUTH_COOKIE_NAMES = ['user', 'authToken'] as const;

/** Clears JWT, OTP email, demo persona selection, and auth cookies. */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  clearStoredAuthToken();
  sessionStorage.removeItem('email');
  sessionStorage.removeItem(DEMO_USER_ID_STORAGE_KEY);

  for (const name of AUTH_COOKIE_NAMES) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
  }

  window.dispatchEvent(new Event('auth-session-cleared'));
}

/** Ends the hospital staff/admin session and returns to the sign-in page. */
export function logout(redirectTo = '/auth/login/'): void {
  clearAuthSession();
  window.location.assign(redirectTo);
}
