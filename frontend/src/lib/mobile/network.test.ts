import { getNetworkOnline, subscribeNetworkStatus } from '@/lib/mobile/network';

describe('network status', () => {
  it('reads navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(getNetworkOnline()).toBe(false);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    expect(getNetworkOnline()).toBe(true);
  });

  it('notifies on browser online/offline events', () => {
    const seen: boolean[] = [];
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const stop = subscribeNetworkStatus((online) => {
      seen.push(online);
    });
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    stop();
    expect(seen[0]).toBe(true);
    expect(seen).toContain(false);
    expect(seen[seen.length - 1]).toBe(true);
  });
});
