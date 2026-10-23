/// <reference types="jest" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLaunchPage from './page';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRouter = { replace: mockReplace, push: mockPush };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/lib/native-session', () => ({
  getLastNativePersona: () => null,
  isNativePersonaId: () => false,
  resolveNativeResumePath: () => null,
  setLastNativePersona: jest.fn(),
}));

jest.mock('@/lib/platform', () => ({
  isNativeApp: () => false,
}));

jest.mock('@/components/brand/ConninterWordmark', () => ({
  ConninterWordmark: () => <div>Conninter</div>,
}));

describe('App launch Welcome', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    window.history.replaceState({}, '', '/app/');
  });

  it('shows visitor pass and online session after Visitor is chosen', async () => {
    const user = userEvent.setup();
    render(<AppLaunchPage />);

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Visitor/i }));

    expect(await screen.findByRole('heading', { name: 'Visitor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Visitor pass/i })).toHaveAttribute(
      'href',
      '/visitor-pass',
    );
    expect(screen.getByRole('link', { name: /Online session/i })).toHaveAttribute(
      'href',
      '/online-session',
    );
    expect(screen.getByRole('link', { name: /Meet a distributor/i })).toHaveAttribute(
      'href',
      '/book-distributor-visit',
    );
  });

  it('opens the visitor choice when the welcome URL asks for it', async () => {
    window.history.replaceState({}, '', '/app/?visitor=1');
    render(<AppLaunchPage />);

    expect(await screen.findByRole('heading', { name: 'Visitor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Visitor pass/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Online session/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Meet a distributor/i })).toBeInTheDocument();
  });
});
