/**
 * Parse attendant-pass QR payloads.
 * Mirrors frontend/src/lib/attendant-pass-url.ts (slug URLs only for v1).
 */

export function attendantSlugFromPath(pathname: string): string | null {
  const match = /^\/attendant-pass\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]).toLowerCase();
  return slug === 'apply' ? null : slug;
}

/** Extract branch slug from a scanned QR string (full URL or path). */
export function parseAttendantQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      return attendantSlugFromPath(url.pathname);
    }
  } catch {
    // fall through to path-only parsing
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return attendantSlugFromPath(path.split('?')[0] ?? path);
}
