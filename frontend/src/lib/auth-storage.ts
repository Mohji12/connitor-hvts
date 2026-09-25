/** Staff/admin JWT — stored per browser tab so multiple roles can stay signed in separately. */
export const AUTH_TOKEN_STORAGE_KEY = 'authToken';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') {
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
