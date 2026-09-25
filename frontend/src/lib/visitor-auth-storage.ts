const VISITOR_TOKEN_KEY = 'visitorAuthToken';

export function getVisitorToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VISITOR_TOKEN_KEY);
}

export function setVisitorToken(token: string): void {
  localStorage.setItem(VISITOR_TOKEN_KEY, token);
}

export function clearVisitorToken(): void {
  localStorage.removeItem(VISITOR_TOKEN_KEY);
}

export function isVisitorPortalApiPath(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/api/public/visitor-portal');
}
