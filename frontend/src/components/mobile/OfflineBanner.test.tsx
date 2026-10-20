import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '@/components/mobile/OfflineBanner';

jest.mock('@/hooks/use-mobile', () => ({
  useIsAppShell: () => true,
}));

describe('OfflineBanner', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('tells staff that a saved QR is not proof of entry when offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/not proof of entry/i);
  });

  it('hides when online', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
