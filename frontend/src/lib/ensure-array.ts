/**
 * Coerce API list payloads to arrays. Guards against SPA HTML responses and
 * `{ data: [...] }` wrappers that would otherwise break `.map` in the UI.
 */
export function ensureArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
  }
  return [];
}

export function isHtmlPayload(data: unknown): boolean {
  return typeof data === 'string' && data.trim().startsWith('<!');
}
