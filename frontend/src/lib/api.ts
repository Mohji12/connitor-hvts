import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  DEFAULT_DEMO_USER_ID,
  DEMO_USER_ID_STORAGE_KEY,
  IS_DEMO_MODE,
  USE_MOCK_API,
} from '@/lib/demo-config';
import { getBackendBaseUrl } from '@/lib/backend-url';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { getVisitorToken, isVisitorPortalApiPath } from '@/lib/visitor-auth-storage';
import { beginMutationBusy, endMutationBusy } from '@/lib/mutation-busy';
import { isHtmlPayload } from '@/lib/ensure-array';

function resolveBaseUrl(): string {
  return USE_MOCK_API ? '/' : getBackendBaseUrl();
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

type BusyTrackedConfig = InternalAxiosRequestConfig & {
  skipBusyLoader?: boolean;
  __busyTracked?: boolean;
};

function shouldTrackBusy(config: BusyTrackedConfig): boolean {
  if (config.skipBusyLoader) return false;
  const method = (config.method ?? 'get').toLowerCase();
  return MUTATING_METHODS.has(method);
}

const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Normalize /api paths for the active base URL.
 * - Same-origin (Next rewrite + trailingSlash: true): keep a trailing slash.
 * - Direct Python backend (absolute NEXT_PUBLIC_BACKEND_API_URL): strip it —
 *   FastAPI 307-redirects slash→no-slash and browsers drop the POST body on redirect.
 */
function normalizeApiUrl(
  url: string | undefined,
  baseURL: string | undefined,
): string | undefined {
  if (!url || !url.startsWith('/api/')) {
    return url;
  }
  const queryIndex = url.indexOf('?');
  const path = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  const query = queryIndex >= 0 ? url.slice(queryIndex) : '';
  const hitsPythonDirectly = Boolean(baseURL && /^https?:\/\//i.test(baseURL));

  if (hitsPythonDirectly) {
    const stripped = path.endsWith('/') ? path.slice(0, -1) : path;
    return `${stripped}${query}`;
  }

  if (path.endsWith('/')) {
    return url;
  }
  return `${path}/${query}`;
}

if (typeof window !== 'undefined') {
  apiClient.defaults.adapter = async (config) => {
    if (USE_MOCK_API) {
      const { handleMockRequest } = await import('@/lib/mock/mock-api-handler');
      return handleMockRequest(config);
    }

    const networkAdapter = axios.getAdapter(axios.defaults.adapter);
    return networkAdapter(config);
  };

  apiClient.interceptors.request.use(
    (config) => {
      const busyConfig = config as BusyTrackedConfig;
      busyConfig.baseURL = resolveBaseUrl();
      busyConfig.url = normalizeApiUrl(busyConfig.url, busyConfig.baseURL);

      const requestUrl = `${busyConfig.url ?? ''}`;
      if (isVisitorPortalApiPath(requestUrl)) {
        const visitorToken = getVisitorToken();
        if (visitorToken) {
          busyConfig.headers.Authorization = `Bearer ${visitorToken}`;
        } else {
          delete busyConfig.headers.Authorization;
        }
      } else {
        const token = getStoredAuthToken();
        if (token && !busyConfig.headers.Authorization) {
          busyConfig.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (IS_DEMO_MODE && !getStoredAuthToken()) {
        const demoUserId =
          sessionStorage.getItem(DEMO_USER_ID_STORAGE_KEY) ?? DEFAULT_DEMO_USER_ID;
        busyConfig.headers['x-demo-user-id'] = demoUserId;
      }

      if (shouldTrackBusy(busyConfig)) {
        beginMutationBusy();
        busyConfig.__busyTracked = true;
      }

      return busyConfig;
    },
    (error) => Promise.reject(error),
  );

  const releaseBusy = (config?: InternalAxiosRequestConfig) => {
    const busyConfig = config as BusyTrackedConfig | undefined;
    if (busyConfig?.__busyTracked) {
      busyConfig.__busyTracked = false;
      endMutationBusy();
    }
  };

  apiClient.interceptors.response.use(
    (response) => {
      releaseBusy(response.config);
      if (isHtmlPayload(response.data)) {
        return Promise.reject(
          new Error(
            'The server returned a web page instead of API data. Check NEXT_PUBLIC_BACKEND_API_URL or /api proxy configuration.',
          ),
        );
      }
      return response;
    },
    (error) => {
      releaseBusy(error?.config);
      return Promise.reject(error);
    },
  );
}

export default apiClient;
