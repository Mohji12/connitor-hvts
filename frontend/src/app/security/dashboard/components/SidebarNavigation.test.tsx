import { render, screen, fireEvent } from '@testing-library/react';
import { ClipboardCheck, List, Settings } from 'lucide-react';
import { SidebarNavigation } from './SidebarNavigation';

describe('SidebarNavigation', () => {
  const mockOnItemClick = jest.fn();
  const mockOnLogout = jest.fn();

  const items = [
    {
      id: 'check-in',
      label: 'Quick Check-In',
      path: '/security/check-in',
      icon: ClipboardCheck,
    },
    {
      id: 'logs',
      label: 'Visitor Logs',
      path: '/security/logs',
      icon: List,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/security/settings',
      icon: Settings,
    },
  ];

  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'SECURITY_GUARD',
    branchName: 'Main Branch',
    hospitalChainName: 'City Health',
  };

  beforeEach(() => {
    mockOnItemClick.mockClear();
    mockOnLogout.mockClear();
  });

  describe('Rendering', () => {
    it('should render sidebar element', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      expect(screen.getByTestId('sidebar-navigation')).toBeInTheDocument();
    });

    it('should render Conninter app name in header', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      expect(screen.getByText('Conninter')).toBeInTheDocument();
    });

    it('should render Security fallback in header subtitle when no user', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should render branch name in header subtitle when user has branchName', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
        />
      );
      expect(screen.getByText('Main Branch')).toBeInTheDocument();
    });

    it('should render hospitalChainName in header subtitle when no branchName', () => {
      const userWithChainOnly = { ...mockUser, branchName: undefined };
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={userWithChainOnly}
        />
      );
      expect(screen.getByText('City Health')).toBeInTheDocument();
    });

    it('should render Security fallback in header subtitle when user has no branchName or hospitalChainName', () => {
      const userWithoutLocation = { ...mockUser, branchName: undefined, hospitalChainName: undefined };
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={userWithoutLocation}
        />
      );
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should render Hospital icon in header', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const header = screen.getByTestId('sidebar-header');
      expect(header).toBeInTheDocument();
      // The icon container should exist with the sidebar-primary background
      const iconContainer = header.querySelector('.bg-sidebar-primary');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      expect(screen.getByText('Quick Check-In')).toBeInTheDocument();
      expect(screen.getByText('Visitor Logs')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Active Item State', () => {
    it('should highlight active item', () => {
      render(
        <SidebarNavigation
          items={items}
          activeItem="check-in"
          onItemClick={mockOnItemClick}
        />
      );
      const activeItem = screen.getByTestId('nav-item-check-in');
      expect(activeItem).toHaveAttribute('aria-current', 'page');
      expect(activeItem).toHaveClass('bg-sidebar-accent', 'text-sidebar-accent-foreground');
    });

    it('should not highlight inactive items', () => {
      render(
        <SidebarNavigation
          items={items}
          activeItem="check-in"
          onItemClick={mockOnItemClick}
        />
      );
      const inactiveItem = screen.getByTestId('nav-item-logs');
      expect(inactiveItem).not.toHaveAttribute('aria-current');
      expect(inactiveItem).toHaveClass('text-sidebar-foreground');
    });

    it('should handle no active item', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const firstItem = screen.getByTestId('nav-item-check-in');
      expect(firstItem).not.toHaveAttribute('aria-current');
    });
  });

  describe('Click Handling', () => {
    it('should call onItemClick with item when clicked', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      fireEvent.click(screen.getByTestId('nav-item-check-in'));
      expect(mockOnItemClick).toHaveBeenCalledWith(items[0]);
    });

    it('should call onItemClick with correct item for each button', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      fireEvent.click(screen.getByTestId('nav-item-settings'));
      expect(mockOnItemClick).toHaveBeenCalledWith(items[2]);
    });
  });

  describe('User Section', () => {
    it('should render user section when user prop is provided', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
        />
      );
      expect(screen.getByTestId('sidebar-user-section')).toBeInTheDocument();
    });

    it('should not render user section when user prop is not provided', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      expect(screen.queryByTestId('sidebar-user-section')).not.toBeInTheDocument();
    });

    it('should display user name', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display formatted role with branch name', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
        />
      );
      expect(screen.getByText('SECURITY GUARD \u2022 Main Branch')).toBeInTheDocument();
    });

    it('should display user initials', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
        />
      );
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display role without branch name when branchName is not provided', () => {
      const userWithoutBranch = { ...mockUser, branchName: undefined };
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={userWithoutBranch}
        />
      );
      expect(screen.getByText('SECURITY GUARD')).toBeInTheDocument();
    });
  });

  describe('Logout Button', () => {
    it('should render logout button when onLogout is provided', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
          onLogout={mockOnLogout}
        />
      );
      expect(screen.getByTestId('sidebar-logout-button')).toBeInTheDocument();
    });

    it('should not render logout button when onLogout is not provided', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
        />
      );
      expect(screen.queryByTestId('sidebar-logout-button')).not.toBeInTheDocument();
    });

    it('should call onLogout when logout button is clicked', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
          onLogout={mockOnLogout}
        />
      );
      fireEvent.click(screen.getByTestId('sidebar-logout-button'));
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('should have aria-label on logout button', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
          onLogout={mockOnLogout}
        />
      );
      expect(screen.getByTestId('sidebar-logout-button')).toHaveAttribute('aria-label', 'Log out');
    });

    it('should display Log out text', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          user={mockUser}
          onLogout={mockOnLogout}
        />
      );
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have navigation role', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('should have menubar role on list', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const list = screen.getByRole('menubar');
      expect(list).toBeInTheDocument();
    });

    it('should have menuitem role on buttons', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
    });

    it('should have aria-label on sidebar', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const sidebar = screen.getByTestId('sidebar-navigation');
      expect(sidebar).toHaveAttribute('aria-label', 'Sidebar navigation');
    });

    it('should have aria-current on active item', () => {
      render(
        <SidebarNavigation
          items={items}
          activeItem="logs"
          onItemClick={mockOnItemClick}
        />
      );
      const activeItem = screen.getByTestId('nav-item-logs');
      expect(activeItem).toHaveAttribute('aria-current', 'page');
    });

    it('should have focus ring styles for keyboard navigation', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const button = screen.getByTestId('nav-item-check-in');
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-sidebar-ring');
    });
  });

  describe('Responsive', () => {
    it('should have hidden lg:flex for desktop-only display', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const sidebar = screen.getByTestId('sidebar-navigation');
      expect(sidebar).toHaveClass('hidden', 'lg:flex');
    });

    it('should have fixed width of 256px (w-64)', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
        />
      );
      const sidebar = screen.getByTestId('sidebar-navigation');
      expect(sidebar).toHaveClass('w-64');
    });
  });

  describe('Custom Styling', () => {
    it('should merge custom className', () => {
      render(
        <SidebarNavigation
          items={items}
          onItemClick={mockOnItemClick}
          className="custom-sidebar-class"
        />
      );
      const sidebar = screen.getByTestId('sidebar-navigation');
      expect(sidebar).toHaveClass('custom-sidebar-class');
    });
  });
});
