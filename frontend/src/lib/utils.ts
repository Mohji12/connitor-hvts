import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a label is a raw UUID (never show these in mobile lists). */
export function isUuidLabel(value?: string | null): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

/** First non-empty value that is not a UUID. */
export function humanLabel(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed && !isUuidLabel(trimmed)) {
      return trimmed;
    }
  }
  return null;
}
