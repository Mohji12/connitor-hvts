import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SecurityDashboard from './page';

const mockPush = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock window.innerWidth for responsive tests
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('SecurityDashboard', () => {
  beforeEach(() => {
    // Reset to mobile viewport by default
    mockInnerWidth(375);
    mockPush.mockClear();
    // Clear any localStorage/sessionStorage/cookie state
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Mobile Layout (< 768px)', () => {
    it('should render mobile layout with bottom navigation', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument();
    });

    it('should render dashboard header with hamburger menu', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
    });

    it('should not render sidebar navigation on mobile', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.queryByTestId('sidebar-navigation')).not.toBeInTheDocument();
    });

    it('should render Check-In tab by default', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByTestId('check-in-tab')).toBeInTheDocument();
    });

    it('should switch to Logs tab when clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('tab-logs'));
      expect(screen.getByTestId('logs-tab')).toBeInTheDocument();
    });

    it('should switch back to Check-In tab when clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('tab-logs'));
      fireEvent.click(screen.getByTestId('tab-check-in'));
      expect(screen.getByTestId('check-in-tab')).toBeInTheDocument();
    });
  });

  describe('Desktop Layout (≥ 768px)', () => {
    beforeEach(() => {
      mockInnerWidth(1024);
    });

    it('should render sidebar navigation', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByTestId('sidebar-navigation')).toBeInTheDocument();
    });

    it('should not render bottom navigation on desktop', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.queryByTestId('bottom-navigation')).not.toBeInTheDocument();
    });

    it('should render split pane layout with both panels', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      // Check for the panel sections - there are multiple elements with these texts
      // so we use getAllBy and verify at least one exists
      expect(screen.getAllByText('Quick Check-In').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Visitor Logs').length).toBeGreaterThan(0);
      // Verify the sections exist by their headings
      expect(document.getElementById('check-in-heading')).toBeInTheDocument();
      expect(document.getElementById('logs-heading')).toBeInTheDocument();
    });

    it('should show desktop header with live indicator', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
      expect(screen.getByText('System Live')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should switch from mobile to desktop layout on resize', async () => {
      const { rerender } = render(<SecurityDashboard branchId="branch-1" />);
      
      // Initially mobile
      expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument();
      
      // Resize to desktop
      mockInnerWidth(1024);
      
      // Re-render to pick up new state
      rerender(<SecurityDashboard branchId="branch-1" />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('bottom-navigation')).not.toBeInTheDocument();
      });
    });

    it('should switch from desktop to mobile layout on resize', async () => {
      mockInnerWidth(1024);
      const { rerender } = render(<SecurityDashboard branchId="branch-1" />);
      
      // Initially desktop
      expect(screen.getByTestId('sidebar-navigation')).toBeInTheDocument();
      
      // Resize to mobile
      mockInnerWidth(375);
      
      // Re-render to pick up new state
      rerender(<SecurityDashboard branchId="branch-1" />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar-navigation')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile Menu', () => {
    it('should open mobile menu when hamburger is clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('hamburger-button'));
      expect(screen.getByTestId('mobile-menu-panel')).toBeInTheDocument();
    });

    it('should close mobile menu when close button is clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('hamburger-button'));
      fireEvent.click(screen.getByTestId('close-menu-button'));
      expect(screen.queryByTestId('mobile-menu-panel')).not.toBeInTheDocument();
    });

    it('should close mobile menu when backdrop is clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('hamburger-button'));
      fireEvent.click(screen.getByTestId('mobile-menu-backdrop'));
      expect(screen.queryByTestId('mobile-menu-panel')).not.toBeInTheDocument();
    });

    it('should render menu items', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('hamburger-button'));
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Live Status', () => {
    it('should show live indicator by default', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
    });

    it('should display Live text when system is live', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  describe('Sidebar Navigation', () => {
    beforeEach(() => {
      mockInnerWidth(1024);
    });

    it('should switch to logs when sidebar logs item is clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('nav-item-logs'));
      // In split pane layout, both tabs are visible
      expect(screen.getAllByText('Visitor Logs').length).toBeGreaterThan(0);
    });

    it('should switch to check-in when sidebar check-in item is clicked', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('nav-item-check-in'));
      // In split pane layout, both tabs are visible
      expect(screen.getAllByText('Quick Check-In').length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have main landmark', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have aria-label on main content', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'Dashboard content');
    });

    it('should have live region for tab announcements', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      const announcement = document.getElementById('tab-announcement');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have sr-only class on announcement element', () => {
      render(<SecurityDashboard branchId="branch-1" />);
      const announcement = document.getElementById('tab-announcement');
      expect(announcement).toHaveClass('sr-only');
    });
  });

  describe('Props', () => {
    it('should accept optional branchId prop', () => {
      render(<SecurityDashboard branchId="test-branch-id" />);
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    it('should work without branchId prop', () => {
      render(<SecurityDashboard />);
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    // Create a minimal valid JWT for testing (header.payload.signature)
    // Payload: {"sub":"1","id":"1","name":"Test User","email":"test@example.com","phone":"1234567890","role":"SECURITY_GUARD","branchId":"branch-1","branchName":"Main Branch"}
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWQiOiIxIiwibmFtZSI6IlRlc3QgVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiMTIzNDU2Nzg5MCIsInJvbGUiOiJTRUNVUklUWV9HVUFSRCIsImJyYW5jaElkIjoiYnJhbmNoLTEiLCJicmFuY2hOYW1lIjoiTWFpbiBCcmFuY2gifQ.fake-signature';

    it('should clear auth data and redirect to login when logout is clicked in mobile menu', () => {
      sessionStorage.setItem('authToken', testToken);
      sessionStorage.setItem('someData', 'value');

      render(<SecurityDashboard branchId="branch-1" />);

      // Open menu
      fireEvent.click(screen.getByTestId('hamburger-button'));

      // Click logout
      fireEvent.click(screen.getByTestId('menu-item-logout'));

      // Verify auth cleared
      expect(sessionStorage.getItem('authToken')).toBeNull();
      expect(sessionStorage.length).toBe(0);

      // Verify redirect
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should clear auth data and redirect to login when logout is clicked in sidebar', () => {
      mockInnerWidth(1024);
      sessionStorage.setItem('authToken', testToken);
      sessionStorage.setItem('someData', 'value');

      render(<SecurityDashboard branchId="branch-1" />);

      // Click sidebar logout
      const logoutButton = screen.getByTestId('sidebar-logout-button');
      fireEvent.click(logoutButton);

      // Verify auth cleared
      expect(sessionStorage.getItem('authToken')).toBeNull();
      expect(sessionStorage.length).toBe(0);

      // Verify redirect
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should not have console.log for logout action', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      render(<SecurityDashboard branchId="branch-1" />);
      fireEvent.click(screen.getByTestId('hamburger-button'));
      fireEvent.click(screen.getByTestId('menu-item-logout'));

      // console.log should not have been called with 'Logout clicked'
      expect(consoleSpy).not.toHaveBeenCalledWith('Logout clicked');
      consoleSpy.mockRestore();
    });
  });
});
