import {
  androidGateIntent,
  gateDeepLink,
  gateWebPath,
  iosGateDeepLink,
  parseGateBranchId,
  shouldTryOpenNativeGate,
} from '@/lib/gate-deeplink';

describe('gate deeplink', () => {
  it('builds an Android intent with a browser fallback URL', () => {
    const fallback = 'https://www.conninter.com/gate/branch-1/';
    const intent = androidGateIntent('branch-1', fallback);
    expect(intent.startsWith('intent://gate/branch-1#Intent;')).toBe(true);
    expect(intent).toContain('scheme=conninter');
    expect(intent).toContain('package=com.conninter.hvts');
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(fallback)}`);
    expect(intent.endsWith(';end')).toBe(true);
  });

  it('uses a custom scheme on iOS and intent elsewhere', () => {
    expect(gateDeepLink('abc', 'https://example.com/gate/abc/', 'iPhone')).toBe(
      iosGateDeepLink('abc'),
    );
    expect(gateDeepLink('abc', 'https://example.com/gate/abc/', 'Android')).toContain('intent://gate/abc');
  });

  it('parses branch ids from intent, custom scheme, and https URLs', () => {
    expect(parseGateBranchId('conninter://gate/b1')).toBe('b1');
    expect(parseGateBranchId('com.conninter.hvts://gate/b1')).toBe('b1');
    expect(parseGateBranchId('https://www.conninter.com/gate/b2/')).toBe('b2');
    expect(parseGateBranchId(androidGateIntent('b3', 'https://www.conninter.com/gate/b3/'))).toBe('b3');
    expect(parseGateBranchId(gateWebPath('b4'))).toBe('b4');
  });

  it('only prompts the native app from a mobile browser', () => {
    expect(shouldTryOpenNativeGate('Mozilla/5.0 (Windows NT 10.0)', '')).toBe(false);
    expect(shouldTryOpenNativeGate('Mozilla/5.0 (Linux; Android 14)', '')).toBe(true);
    expect(shouldTryOpenNativeGate('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', '?stay=1')).toBe(false);
    expect(shouldTryOpenNativeGate('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', '?native=1')).toBe(false);
  });
});
