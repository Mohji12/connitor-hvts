import { shouldRetryGetRequest } from '@/lib/api-client-policy';

describe('shouldRetryGetRequest', () => {
  const networkError = { code: 'ERR_NETWORK' };
  const timeoutError = { code: 'ECONNABORTED' };

  it('retries a GET once on network or timeout', () => {
    expect(shouldRetryGetRequest({ method: 'get', retryCount: 0 }, networkError)).toBe(true);
    expect(shouldRetryGetRequest({ method: 'GET' }, timeoutError)).toBe(true);
    expect(shouldRetryGetRequest({ method: 'head' }, networkError)).toBe(true);
  });

  it('does not retry mutations', () => {
    expect(shouldRetryGetRequest({ method: 'post' }, networkError)).toBe(false);
    expect(shouldRetryGetRequest({ method: 'put' }, timeoutError)).toBe(false);
    expect(shouldRetryGetRequest({ method: 'patch' }, networkError)).toBe(false);
    expect(shouldRetryGetRequest({ method: 'delete' }, networkError)).toBe(false);
  });

  it('does not retry after the first attempt or when a status was returned', () => {
    expect(shouldRetryGetRequest({ method: 'get', retryCount: 1 }, networkError)).toBe(false);
    expect(shouldRetryGetRequest({ method: 'get' }, { code: 'ERR_NETWORK', response: { status: 500 } })).toBe(
      false,
    );
    expect(shouldRetryGetRequest({ method: 'get' }, { code: 'ERR_BAD_REQUEST', response: { status: 401 } })).toBe(
      false,
    );
  });
});
