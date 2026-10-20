import type { OfflinePassType } from './types';

export function parsePassFromQr(raw: string): { passId: string | null; passType: OfflinePassType | null } {
  const text = raw.trim();
  if (!text) return { passId: null, passType: null };
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      if (typeof data.qrPayload === 'string') {
        const payload = data.qrPayload;
        if (payload.startsWith('PASS:') || payload.startsWith('PASS-EXIT:')) {
          const parts = payload.split(':');
          return { passId: parts[1] ?? payload, passType: 'attendant' };
        }
        if (payload.startsWith('EXIT:')) {
          return { passId: payload.split(':')[1] ?? payload, passType: 'delivery' };
        }
        if (payload.includes(':')) {
          return { passId: payload.split(':')[0] ?? payload, passType: 'delivery' };
        }
        if (payload.length === 36 && payload.split('-').length === 5) {
          return { passId: payload, passType: 'delivery' };
        }
        return { passId: payload, passType: 'delivery' };
      }
      const visitId = data.v ?? data.visitId ?? data.id;
      if (typeof visitId === 'string') {
        return { passId: visitId, passType: 'visitor' };
      }
    } catch {
      // not JSON
    }
  }
  if (text.startsWith('PASS:') || text.startsWith('PASS-EXIT:')) {
    return { passId: text.split(':')[1] ?? text, passType: 'attendant' };
  }
  if (text.length === 36 && text.split('-').length === 5) {
    return { passId: text, passType: null };
  }
  return { passId: text, passType: null };
}
