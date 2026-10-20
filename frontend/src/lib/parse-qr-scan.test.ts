import { parseQrScanText } from '@/lib/parse-qr-scan';

describe('parseQrScanText', () => {
  it('reads delivery/attendant JSON with payload and signature', () => {
    expect(parseQrScanText('{"qrPayload":"d1:DN-1:ts","signature":"abc123"}')).toEqual({
      qrPayload: 'd1:DN-1:ts',
      signature: 'abc123',
    });
  });

  it('ignores surrounding whitespace', () => {
    expect(parseQrScanText('  {"qrPayload":"p","signature":"s"}  ')).toEqual({
      qrPayload: 'p',
      signature: 's',
    });
  });

  it('rejects empty, garbage, and unsigned visitor JSON', () => {
    expect(parseQrScanText('')).toBeNull();
    expect(parseQrScanText('not-json')).toBeNull();
    expect(parseQrScanText('{"t":"entry","v":"visit-1","j":"jti"}')).toBeNull();
    expect(parseQrScanText('{"qrPayload":"only-payload"}')).toBeNull();
  });
});
