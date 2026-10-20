const CACHE_KEY = 'deliveryPassCache';

export type CachedDeliveryPass = {
  id: string;
  deliveryNumber: string;
  status: string;
  branchName?: string | null;
  agentName?: string | null;
  vehicleNumber?: string | null;
  expectedArrivalTime?: string | null;
  qrValue: string;
  cachedAt: string;
};

export type DeliveryQrFields = {
  qrPayload?: string | null;
  signature?: string | null;
};

function readAll(): Record<string, CachedDeliveryPass> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CachedDeliveryPass>) : {};
  } catch {
    return {};
  }
}

function writeAll(next: Record<string, CachedDeliveryPass>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked.
  }
}

export function qrValueFromDeliveryQr(qr: DeliveryQrFields | null | undefined): string | null {
  if (!qr?.qrPayload) return null;
  if (qr.signature) {
    return JSON.stringify({ qrPayload: qr.qrPayload, signature: qr.signature });
  }
  return qr.qrPayload;
}

/** Keep the gate QR on the phone so the driver can still open it without signal. */
export function cacheDeliveryPass(input: {
  id: string;
  deliveryNumber?: string | null;
  status?: string | null;
  branchName?: string | null;
  agentName?: string | null;
  vehicleNumber?: string | null;
  expectedArrivalTime?: string | null;
  qr?: DeliveryQrFields | null;
}): void {
  if (typeof window === 'undefined') return;
  const qrValue = qrValueFromDeliveryQr(input.qr);
  if (!qrValue || !input.id) return;
  const next = readAll();
  next[input.id] = {
    id: input.id,
    deliveryNumber: input.deliveryNumber ?? input.id,
    status: input.status ?? 'SCHEDULED',
    branchName: input.branchName,
    agentName: input.agentName,
    vehicleNumber: input.vehicleNumber,
    expectedArrivalTime: input.expectedArrivalTime,
    qrValue,
    cachedAt: new Date().toISOString(),
  };
  writeAll(next);
}

export function getCachedDeliveryPass(id: string): CachedDeliveryPass | null {
  return readAll()[id] ?? null;
}

export function listCachedDeliveryPasses(): CachedDeliveryPass[] {
  return Object.values(readAll()).sort((a, b) => (a.cachedAt < b.cachedAt ? 1 : -1));
}

export function clearDeliveryPassCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}
