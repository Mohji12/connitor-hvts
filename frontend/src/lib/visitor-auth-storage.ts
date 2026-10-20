import { isJwtExpired } from '@/lib/jwt-claims';
import { isNativeApp } from '@/lib/platform';
import { clearLastInAppPath, setLastNativePersona } from '@/lib/native-session-paths';

const VISITOR_TOKEN_KEY = 'visitorAuthToken';

export function getVisitorToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(VISITOR_TOKEN_KEY);
  if (!token) return null;
  if (isJwtExpired(token)) {
    clearVisitorToken();
    return null;
  }
  return token;
}

export function setVisitorToken(token: string): void {
  localStorage.setItem(VISITOR_TOKEN_KEY, token);
  if (isNativeApp()) {
    setLastNativePersona('visitor');
  }
}

export function clearVisitorToken(): void {
  localStorage.removeItem(VISITOR_TOKEN_KEY);
  clearLastInAppPath('visitor');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('conninter-session-changed'));
  }
}

export function isVisitorPortalApiPath(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/api/public/visitor-portal') ||
    url.includes('/api/public/visitor-accounts') ||
    url.includes('/api/public/visitor-wallet')
  );
}
