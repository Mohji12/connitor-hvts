/** Decode a JWT payload without verifying the signature. */
export function readJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = padded.length % 4;
    const base64 = remainder === 0 ? padded : padded + '='.repeat(4 - remainder);
    const json = atob(base64);
    const payload = JSON.parse(json) as unknown;
    if (!payload || typeof payload !== 'object') return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = readJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}
