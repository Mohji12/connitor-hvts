/** Local Python API (uvicorn default). Used for OAuth redirects and SSR. */
export const LOCAL_BACKEND_URL = 'http://127.0.0.1:8002';

/** Production API when static hosting was built without NEXT_PUBLIC_BACKEND_API_URL. */
export const PRODUCTION_BACKEND_URL = 'https://connitor.bengalurutechcommunity.com';

function isKnownProductionHost(hostname: string): boolean {
  return (
    hostname === 'conninter.com' ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.amplifyapp.com')
  );
}

function trimUrl(url: string | undefined): string {
  return (url ?? '').trim().replace(/\/$/, '');
}

/**
 * Base URL for axios API requests.
 * - NEXT_PUBLIC_BACKEND_API_URL set → direct calls to that host
 * - Local browser / empty env → '' (relative /api/* via Next.js rewrite → BACKEND_PROXY_URL)
 * - SSR in development with empty env → LOCAL_BACKEND_URL
 * - Production must bake NEXT_PUBLIC_BACKEND_API_URL (never fall back to localhost)
 */
export function getBackendBaseUrl(): string {
  const fromEnv = trimUrl(process.env.NEXT_PUBLIC_BACKEND_API_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    if (isKnownProductionHost(window.location.hostname)) {
      return PRODUCTION_BACKEND_URL;
    }
    // Local dev: same-origin /api via Next rewrite
    return '';
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

  const proxy = trimUrl(process.env.BACKEND_PROXY_URL);
  if (proxy) {
    return proxy;
  }

  return LOCAL_BACKEND_URL;
}
