export const API_TIMEOUT_MS = 20_000;
export const API_GET_RETRY_LIMIT = 1;

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

export function isMutatingHttpMethod(method: string | undefined): boolean {
  return MUTATING.has((method ?? 'get').toLowerCase());
}

export function isSafeRetryMethod(method: string | undefined): boolean {
  const normalized = (method ?? 'get').toLowerCase();
  return normalized === 'get' || normalized === 'head';
}

export function isRetriableNetworkFailure(error: {
  code?: string;
  message?: string;
  response?: unknown;
}): boolean {
  if (error.response) return false;
  const code = error.code ?? '';
  if (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET'
  ) {
    return true;
  }
  return (error.message ?? '') === 'Network Error';
}

export function shouldRetryGetRequest(
  config: { method?: string; retryCount?: number } | undefined,
  error: { code?: string; message?: string; response?: unknown },
): boolean {
  if (!config) return false;
  if (!isSafeRetryMethod(config.method)) return false;
  if ((config.retryCount ?? 0) >= API_GET_RETRY_LIMIT) return false;
  return isRetriableNetworkFailure(error);
}
