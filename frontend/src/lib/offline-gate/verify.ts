import { parsePassFromQr } from './parse-pass';
import { verifyManifestSignature } from './hmac';
import type { LocalGateEvent, LocalVerifyResult, OfflinePass, SignedManifest } from './types';

function findPass(manifest: SignedManifest, passId: string): OfflinePass | null {
  return (
    manifest.passes.find(
      (row) => row.passId === passId || (row.aliases ?? []).includes(passId),
    ) ?? null
  );
}

export async function verifyOfflineScan(input: {
  rawValue: string;
  manifest: SignedManifest | null;
  verifyKey: string | null;
  localEvents: LocalGateEvent[];
  nowMs?: number;
  online?: boolean;
}): Promise<LocalVerifyResult> {
  const parsed = parsePassFromQr(input.rawValue);
  if (!parsed.passId) {
    return { decision: 'REJECT', reasonCode: 'QR_UNPARSEABLE', passId: null, passType: null };
  }
  if (input.online) {
    return {
      decision: 'UNCERTAIN',
      reasonCode: 'PREFER_ONLINE',
      passId: parsed.passId,
      passType: parsed.passType,
    };
  }
  if (!input.manifest || !input.verifyKey) {
    return {
      decision: 'UNCERTAIN',
      reasonCode: 'NO_MANIFEST',
      passId: parsed.passId,
      passType: parsed.passType,
    };
  }
  if (!(await verifyManifestSignature(input.manifest as unknown as Record<string, unknown>, input.verifyKey))) {
    return {
      decision: 'REJECT',
      reasonCode: 'MANIFEST_TAMPERED',
      passId: parsed.passId,
      passType: parsed.passType,
    };
  }
  const now = input.nowMs ?? Date.now();
  if (Date.parse(input.manifest.expiresAt) <= now) {
    return {
      decision: 'REJECT',
      reasonCode: 'MANIFEST_EXPIRED',
      passId: parsed.passId,
      passType: parsed.passType,
    };
  }
  if (input.manifest.revocations.some((row) => row.passId === parsed.passId)) {
    return {
      decision: 'REJECT',
      reasonCode: 'REVOKED',
      passId: parsed.passId,
      passType: parsed.passType,
    };
  }
  const pass = findPass(input.manifest, parsed.passId);
  if (!pass) {
    return {
      decision: 'REJECT',
      reasonCode: 'NOT_IN_MANIFEST',
      passId: parsed.passId,
      passType: parsed.passType,
    };
  }
  if (Date.parse(pass.validUntil) <= now || Date.parse(pass.validFrom) > now) {
    return {
      decision: 'REJECT',
      reasonCode: 'OUTSIDE_WINDOW',
      passId: pass.passId,
      passType: pass.passType,
    };
  }
  if (
    pass.oneTime &&
    input.localEvents.some((event) => event.passId === pass.passId && event.eventType === 'ACCEPT')
  ) {
    return {
      decision: 'REJECT',
      reasonCode: 'LOCAL_DUPLICATE',
      passId: pass.passId,
      passType: pass.passType,
    };
  }
  if (!input.manifest.offlineAcceptance) {
    return {
      decision: 'UNCERTAIN',
      reasonCode: 'OFFLINE_NOT_ENABLED',
      passId: pass.passId,
      passType: pass.passType,
    };
  }
  return {
    decision: 'ACCEPT',
    reasonCode: 'OFFLINE_OK',
    passId: pass.passId,
    passType: pass.passType,
  };
}

export function makeLocalEvent(
  result: LocalVerifyResult,
  extras?: { eventId?: string },
): LocalGateEvent | null {
  if (!result.passId || !result.passType) return null;
  return {
    eventId: extras?.eventId ?? (globalThis.crypto?.randomUUID?.() ?? `evt-${Date.now()}`),
    passId: result.passId,
    passType: result.passType,
    eventType: result.decision,
    reasonCode: result.reasonCode,
    occurredAt: new Date().toISOString(),
    decisionMode: 'OFFLINE',
    syncStatus: 'PENDING',
  };
}
