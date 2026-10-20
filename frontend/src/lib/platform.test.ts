import { isNativeApp } from '@/lib/platform';

describe('isNativeApp', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('is UI context only and does not treat a JWT as native or authorized', () => {
    localStorage.setItem(
      'authToken',
      'eyJhbGciOiJub25lIn0.eyJyb2xlIjoiU0VDVVJJVFkiLCJleHAiOjk5OTk5OTk5OTl9.sig',
    );
    expect(isNativeApp()).toBe(false);
  });
});
