import { parsePassFromQr } from './parse-pass';
import { verifyOfflineScan } from './verify';
import type { SignedManifest } from './types';

const passId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const manifest = {
  manifestId: 'm1',
  version: 1,
  gateId: 'g1',
  branchId: 'b1',
  issuedAt: '2026-01-01T00:00:00',
  expiresAt: '2099-01-01T00:00:00',
  keyId: 'gate-manifest-v1',
  algorithm: 'HMAC-SHA256',
  offlineAcceptance: true,
  serverTime: '2026-01-01T00:00:00',
  passes: [
    {
      passId,
      passType: 'visitor',
      validFrom: '2020-01-01T00:00:00',
      validUntil: '2099-01-01T00:00:00',
      status: 'ELIGIBLE',
      oneTime: true,
      aliases: [passId],
    },
  ],
  revocations: [],
  signature: 'not-checked-when-mocked',
} as SignedManifest;

jest.mock('./hmac', () => ({
  verifyManifestSignature: jest.fn(async () => true),
}));

describe('offline gate verify', () => {
  it('parses visitor and delivery QR payloads', () => {
    expect(parsePassFromQr(`{"t":"entry","v":"${passId}","j":"x"}`)).toEqual({
      passId,
      passType: 'visitor',
    });
    expect(parsePassFromQr('{"qrPayload":"d1:DN-1:ts","signature":"sig"}').passType).toBe('delivery');
  });

  it('accepts a cached eligible pass while offline', async () => {
    const result = await verifyOfflineScan({
      rawValue: `{"t":"entry","v":"${passId}","j":"x"}`,
      manifest,
      verifyKey: 'aa',
      localEvents: [],
      online: false,
    });
    expect(result.decision).toBe('ACCEPT');
    expect(result.reasonCode).toBe('OFFLINE_OK');
  });

  it('rejects a second one-time accept on the same phone', async () => {
    const result = await verifyOfflineScan({
      rawValue: `{"t":"entry","v":"${passId}","j":"x"}`,
      manifest,
      verifyKey: 'aa',
      localEvents: [
        {
          eventId: 'e1',
          passId,
          passType: 'visitor',
          eventType: 'ACCEPT',
          reasonCode: 'OFFLINE_OK',
          occurredAt: '2026-01-01T00:00:00Z',
          decisionMode: 'OFFLINE',
          syncStatus: 'PENDING',
        },
      ],
      online: false,
    });
    expect(result.decision).toBe('REJECT');
    expect(result.reasonCode).toBe('LOCAL_DUPLICATE');
  });

  it('rejects after the manifest expires', async () => {
    const result = await verifyOfflineScan({
      rawValue: `{"t":"entry","v":"${passId}","j":"x"}`,
      manifest: { ...manifest, expiresAt: '2020-01-01T00:00:00' },
      verifyKey: 'aa',
      localEvents: [],
      online: false,
    });
    expect(result.reasonCode).toBe('MANIFEST_EXPIRED');
  });

  it('does not treat offline as authorized when acceptance is disabled', async () => {
    const result = await verifyOfflineScan({
      rawValue: `{"t":"entry","v":"${passId}","j":"x"}`,
      manifest: { ...manifest, offlineAcceptance: false },
      verifyKey: 'aa',
      localEvents: [],
      online: false,
    });
    expect(result.decision).toBe('UNCERTAIN');
    expect(result.reasonCode).toBe('OFFLINE_NOT_ENABLED');
  });
});
