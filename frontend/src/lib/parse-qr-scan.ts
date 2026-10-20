/** Parse emailed QR JSON or raw payload string into qrPayload + signature. */
export function parseQrScanText(raw: string): { qrPayload: string; signature: string } | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { qrPayload?: string; signature?: string };
    if (parsed.qrPayload && parsed.signature) {
      return { qrPayload: parsed.qrPayload, signature: parsed.signature };
    }
  } catch {
    // not JSON
  }
  return null;
}
