import type { SWRConfiguration } from 'swr';

/** Shared SWR defaults — faster perceived load, fewer duplicate requests. */
export const defaultSwrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  errorRetryCount: 2,
  keepPreviousData: true,
};
