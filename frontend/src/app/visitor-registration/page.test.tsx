import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VisitorRegistrationLandingPage from './page';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'Link';
  return MockLink;
});

// Mock fetch globally
global.fetch = jest.fn();

describe('VisitorRegistrationLandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Rendering', () => {
    it('renders all key elements', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      // Hospital icon
      const hospitalIcon = container.querySelector('svg[aria-hidden="true"]');
      expect(hospitalIcon).toBeInTheDocument();

      // Welcome message as h1
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Hospital');

      // Secondary heading
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Visitor Registration');

      // Subtitle
      expect(screen.getByText('Complete your registration in a few simple steps')).toBeInTheDocument();

      // Button
      expect(screen.getByRole('button', { name: /start registration/i })).toBeInTheDocument();

      // Footer
      expect(screen.getByText('Secure visitor management system')).toBeInTheDocument();
    });

    it('renders hospital icon with correct attributes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders illustration icon with correct styling', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const illustrations = container.querySelectorAll('svg.size-40');
      expect(illustrations.length).toBeGreaterThan(0);
    });

    it('renders button with correct size and variant', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      render(await VisitorRegistrationLandingPage({ searchParams }));

      const button = screen.getByRole('button', { name: /start registration/i });
      expect(button).toHaveClass('bg-emerald-700');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Branch Name Resolution', () => {
    it('renders with branch name when branchId is valid', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'branch-123',
          name: 'City General Hospital',
          users: [
            {
              id: 'user-1',
              name: 'Dr. Smith',
              email: 'smith@hospital.com',
              phone: '1234567890',
              department: 'Cardiology',
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const searchParams = Promise.resolve({ branchId: 'branch-123' });
      const component = await VisitorRegistrationLandingPage({ searchParams });
      render(component);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to City General Hospital');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/visitors/branch-info?branchId=branch-123'),
        expect.objectContaining({ cache: 'no-store' })
      );
    });

    it('renders with fallback when branchId is missing', async () => {
      const searchParams = Promise.resolve({});
      render(await VisitorRegistrationLandingPage({ searchParams }));

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Hospital');
      expect(console.warn).toHaveBeenCalledWith('No branchId provided in URL');
    });

    it('renders with fallback when branchId is invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const searchParams = Promise.resolve({ branchId: 'invalid-id' });
      render(await VisitorRegistrationLandingPage({ searchParams }));

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Hospital');
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load hospital details');
      expect(console.warn).toHaveBeenCalledWith('Branch not found for branchId: invalid-id');
    });

    it('renders with fallback when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const searchParams = Promise.resolve({ branchId: 'branch-123' });
      render(await VisitorRegistrationLandingPage({ searchParams }));

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Hospital');
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load hospital details');
    });

    it('renders with fallback when API returns non-OK status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const searchParams = Promise.resolve({ branchId: 'branch-123' });
      render(await VisitorRegistrationLandingPage({ searchParams }));

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Hospital');
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load hospital details');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure with main element', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('has correct heading hierarchy (h1, h2)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      render(await VisitorRegistrationLandingPage({ searchParams }));

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });

      expect(h1).toHaveTextContent('Welcome to Hospital');
      expect(h2).toHaveTextContent('Visitor Registration');
    });

    it('has aria-hidden on decorative icons', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(ariaHiddenElements.length).toBeGreaterThan(0);
    });

    it('has aria-live region for dynamic hospital name', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('has role alert for error messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({ branchId: 'invalid' });
      render(await VisitorRegistrationLandingPage({ searchParams }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('button is focusable', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      render(await VisitorRegistrationLandingPage({ searchParams }));

      const button = screen.getByRole('button', { name: /start registration/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Responsive Design', () => {
    it('has max-width container', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const contentWrapper = container.querySelector('.max-w-\\[480px\\]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('has full-width button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      render(await VisitorRegistrationLandingPage({ searchParams }));

      const button = screen.getByRole('button', { name: /start registration/i });
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Navigation', () => {
    it('navigates to wizard without branchId when not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const link = container.querySelector('a[href="/visitor-registration/wizard"]');
      expect(link).toBeInTheDocument();
    });

    it('navigates to wizard with branchId when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'branch-123',
          name: 'City General Hospital',
          users: [],
        }),
      });

      const searchParams = Promise.resolve({ branchId: 'branch-123' });
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const link = container.querySelector('a[href="/visitor-registration/wizard?branchId=branch-123"]');
      expect(link).toBeInTheDocument();
    });

    it('button is wrapped in Link component', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const searchParams = Promise.resolve({});
      const { container } = render(
        await VisitorRegistrationLandingPage({ searchParams })
      );

      const link = container.querySelector('a');
      const button = screen.getByRole('button', { name: /start registration/i });
      expect(link).toContainElement(button);
    });
  });
});
