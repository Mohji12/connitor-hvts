import axios from 'axios';

/** True when the browser cannot reach the Python API (proxy ECONNREFUSED or network down). */
export function isBackendUnreachable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) {
    return false;
  }
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
    return true;
  }
  // Next.js dev rewrite returns 500 with an empty body when the backend refuses the connection.
  if (err.response?.status === 500) {
    const data = err.response.data;
    if (data == null || data === '' || (typeof data === 'object' && !('statusCode' in data))) {
      return true;
    }
  }
  return false;
}

export function getBackendUnreachableMessage(): string {
  return 'Cannot reach the Python API. Start it with: cd python_backend && uvicorn main:app --reload';
}

/** Parse Python API errors (`message`) and legacy NestJS errors (`detail`). */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isBackendUnreachable(error)) {
    return getBackendUnreachableMessage();
  }
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string; detail?: string | { msg?: string }[] };
    const detail = data.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      const first = detail[0];
      if (first?.msg) return first.msg;
    }
    return data.message ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
