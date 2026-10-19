import { attendantSlugFromPath } from '@/lib/attendant-pass-url';

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
    // fall through
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return attendantSlugFromPath(path.split('?')[0] ?? path);
}
