/** Local Python API (uvicorn default). Used for OAuth redirects and SSR. */
export const LOCAL_BACKEND_URL = 'http://127.0.0.1:8002';

/** Production API when static hosting was built without NEXT_PUBLIC_BACKEND_API_URL. */
export const PRODUCTION_BACKEND_URL = 'https://api.conninter.com';

function isKnownProductionHost(hostname: string): boolean {
  return (
    hostname === 'conninter.com' ||
    hostname === 'www.conninter.com' ||
    hostname.endsWith('.conninter.com') ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.amplifyapp.com')
  );
}

function trimUrl(url: string | undefined): string {
  return (url ?? '').trim().replace(/\/$/, '');
}

/**
 * Base URL for axios API requests.
 * - Production static hosts (conninter.com, Vercel): '' → same-origin /api/* (host rewrites to API; avoids CORS)
 * - NEXT_PUBLIC_BACKEND_API_URL set (non-prod hosts only) → direct calls to that host
 * - Local browser / empty env → '' (relative /api/* via Next.js rewrite → BACKEND_PROXY_URL)
 * - SSR in development with empty env → LOCAL_BACKEND_URL
 */
export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Always same-origin /api in the browser (Next dev rewrite or Vercel/nginx proxy).
    // Never call api.conninter.com directly from the client — CORS preflight fails in production.
    return '';
  }

  const fromEnv = trimUrl(process.env.NEXT_PUBLIC_BACKEND_API_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === 'development') {
    return LOCAL_BACKEND_URL;
  }

  // Static export without env would break silently on localhost — keep empty so
  // requests stay same-origin and fail loudly in network tab instead.
  return '';
}

/** Full API host for OAuth redirects (must hit Python directly, not the Next proxy). */
export function getBackendApiPrefix(): string {
  const fromEnv = trimUrl(process.env.NEXT_PUBLIC_BACKEND_API_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined' && isKnownProductionHost(window.location.hostname)) {
    return PRODUCTION_BACKEND_URL;
  }

  const proxy = trimUrl(process.env.BACKEND_PROXY_URL);
  if (proxy) {
    return proxy;
  }

  return LOCAL_BACKEND_URL;
}
