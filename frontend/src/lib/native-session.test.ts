import { getStoredAuthToken, setStoredAuthToken } from '@/lib/auth-storage';
import { clearAuthSession } from '@/lib/logout';
import {
  clearLastInAppPath,
  getLastInAppPath,
  isResumableInAppPath,
  rememberInAppPath,
  resolveNativeResumePath,
  shouldReturnToNativeWelcome,
} from '@/lib/native-session';
import { clearVisitorToken, setVisitorToken } from '@/lib/visitor-auth-storage';

const native = { value: true };

jest.mock('@/lib/platform', () => ({
  isNativeApp: () => native.value,
}));

function jwt(payload: Record<string, unknown>): string {
  const enc = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64');
  return `${enc({ alg: 'none' })}.${enc(payload)}.sig`;
}

describe('native session restore', () => {
  beforeEach(() => {
    native.value = true;
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not resume login or welcome screens', () => {
    expect(isResumableInAppPath('/staff/login')).toBe(false);
    expect(isResumableInAppPath('/app/')).toBe(false);
    expect(isResumableInAppPath('/visitor/login?returnTo=/x')).toBe(false);
    expect(isResumableInAppPath('/dashboard/visitors')).toBe(true);
    expect(isResumableInAppPath('/vendor/deliveries')).toBe(true);
  });

  it('treats visitor pass and online session as the visitor persona', () => {
    rememberInAppPath('/visitor-pass');
    expect(getLastInAppPath('visitor')).toBe('/visitor-pass');
    rememberInAppPath('/online-session');
    expect(getLastInAppPath('visitor')).toBe('/online-session');
  });

  it('remembers the last in-app path per role', () => {
    rememberInAppPath('/dashboard/visitors/visitors-logs');
    rememberInAppPath('/visitor/dashboard/profile');
    expect(getLastInAppPath('staff')).toBe('/dashboard/visitors/visitors-logs');
    expect(getLastInAppPath('visitor')).toBe('/visitor/dashboard/profile');
  });

  it('drops WebView cache-bust query params from the saved path', () => {
    rememberInAppPath('/visitor/wallet/?_cb=123&native=1');
    expect(getLastInAppPath('visitor')).toBe('/visitor/wallet/');
  });

  it('reopens the staff dashboard without asking for login', () => {
    const token = jwt({
      role: 'HOSPITAL_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    setStoredAuthToken(token);
    rememberInAppPath('/dashboard/visitors');
    expect(resolveNativeResumePath()).toBe('/dashboard/visitors');
  });

  it('reopens the visitor screen when that role is still signed in', () => {
    setVisitorToken(
      jwt({
        sub: 'visitor-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    localStorage.setItem('conninterPersona', 'visitor');
    rememberInAppPath('/visitor/wallet');
    expect(resolveNativeResumePath()).toBe('/visitor/wallet');
  });

  it('does not restore an expired staff token', () => {
    const token = jwt({
      role: 'SECURITY',
      exp: Math.floor(Date.now() / 1000) - 30,
    });
    localStorage.setItem('authToken', token);
    rememberInAppPath('/security/dashboard');
    expect(getStoredAuthToken()).toBeNull();
    expect(resolveNativeResumePath()).toBeNull();
  });

  it('clears a role resume path independently', () => {
    rememberInAppPath('/dashboard/');
    rememberInAppPath('/vendor/deliveries');
    clearLastInAppPath('staff');
    expect(getLastInAppPath('staff')).toBeNull();
    expect(getLastInAppPath('distributor')).toBe('/vendor/deliveries');
  });

  it('does not restore an expired visitor token', () => {
    setVisitorToken(
      jwt({
        sub: 'visitor-1',
        exp: Math.floor(Date.now() / 1000) - 30,
      }),
    );
    localStorage.setItem('conninterPersona', 'visitor');
    rememberInAppPath('/visitor/dashboard');
    expect(resolveNativeResumePath()).toBeNull();
  });

  it('returns null after logout even if a last path remains', () => {
    const token = jwt({
      role: 'HOSPITAL_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    setStoredAuthToken(token);
    localStorage.setItem('conninterPersona', 'staff');
    rememberInAppPath('/dashboard/visitors');
    clearAuthSession();
    expect(getStoredAuthToken()).toBeNull();
    expect(resolveNativeResumePath()).toBeNull();
  });

  it('returns null after the visitor token is cleared', () => {
    setVisitorToken(
      jwt({
        sub: 'visitor-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    localStorage.setItem('conninterPersona', 'visitor');
    rememberInAppPath('/visitor/wallet');
    clearVisitorToken();
    expect(resolveNativeResumePath()).toBeNull();
  });

  it('sends expired native staff sessions on a dashboard back to Welcome', () => {
    localStorage.setItem('conninterPersona', 'staff');
    localStorage.setItem(
      'authToken',
      jwt({
        role: 'SECURITY',
        exp: Math.floor(Date.now() / 1000) - 30,
      }),
    );
    expect(shouldReturnToNativeWelcome('/security/dashboard')).toBe(true);
    expect(shouldReturnToNativeWelcome('/app/')).toBe(false);
  });

  it('does not treat native detection as authorization for attendant scan', () => {
    native.value = true;
    localStorage.setItem('conninterPersona', 'attendant');
    expect(resolveNativeResumePath()).toBeNull();
    expect(shouldReturnToNativeWelcome('/attendant/scan')).toBe(false);
  });
});
