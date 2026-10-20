import { DEMO_USER_ID_STORAGE_KEY } from '@/lib/demo-config';
import { clearStoredAuthToken } from '@/lib/auth-storage';
import { clearDeliveryPassCache } from '@/lib/delivery-pass-cache';
import { clearLastInAppPath, NATIVE_WELCOME_PATH } from '@/lib/native-session-paths';
import { isNativeApp } from '@/lib/platform';

const AUTH_COOKIE_NAMES = ['user', 'authToken'] as const;

/** Clears JWT, OTP email, demo persona selection, and auth cookies. */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  clearStoredAuthToken();
  clearLastInAppPath('staff');
  clearLastInAppPath('distributor');
  clearDeliveryPassCache();
  sessionStorage.removeItem('email');
  sessionStorage.removeItem(DEMO_USER_ID_STORAGE_KEY);

  for (const name of AUTH_COOKIE_NAMES) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
  }

  window.dispatchEvent(new Event('auth-session-cleared'));
  window.dispatchEvent(new Event('conninter-session-changed'));
}

function defaultLogoutPath(): string {
  return isNativeApp() ? NATIVE_WELCOME_PATH : '/auth/login/';
}

/** Ends the hospital staff/admin session and returns to the sign-in page (Welcome in the native app). */
export function logout(redirectTo?: string): void {
  clearAuthSession();
  window.location.assign(redirectTo ?? defaultLogoutPath());
}
