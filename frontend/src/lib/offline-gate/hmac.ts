const SIGNED_FIELDS = [
  'manifestId',
  'version',
  'gateId',
  'branchId',
  'issuedAt',
  'expiresAt',
  'keyId',
  'algorithm',
  'offlineAcceptance',
  'serverTime',
  'passes',
  'revocations',
] as const;

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function canonicalManifestBody(manifest: Record<string, unknown>): string {
  const body: Record<string, unknown> = {};
  for (const key of SIGNED_FIELDS) {
    if (key in manifest) body[key] = manifest[key];
  }
  return stableStringify(body);
}

function hexFromBuffer(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(keyHexOrUtf8: string, message: string): Promise<string> {
  const keyBytes =
    /^[0-9a-f]+$/i.test(keyHexOrUtf8) && keyHexOrUtf8.length % 2 === 0
      ? Uint8Array.from(keyHexOrUtf8.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [])
      : new TextEncoder().encode(keyHexOrUtf8);
  if (globalThis.crypto?.subtle) {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
    return hexFromBuffer(sig);
  }
  const { createHmac } = await import('crypto');
  return createHmac('sha256', Buffer.from(keyBytes)).update(message).digest('hex');
}

export async function verifyManifestSignature(
  manifest: Record<string, unknown>,
  verifyKey: string,
): Promise<boolean> {
  const signature = manifest.signature;
  if (typeof signature !== 'string' || signature.length < 32) return false;
  const expected = await hmacSha256Hex(verifyKey, canonicalManifestBody(manifest));
  return expected === signature;
}
