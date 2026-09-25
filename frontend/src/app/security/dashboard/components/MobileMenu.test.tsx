import { render, screen, fireEvent } from '@testing-library/react';
import { Settings, User } from 'lucide-react';
import { MobileMenu } from './MobileMenu';

describe('MobileMenu', () => {
  const mockOnClose = jest.fn();
  const mockAction1 = jest.fn();
  const mockAction2 = jest.fn();

  const items = [
    {
      id: 'profile',
      label: 'Profile',
      action: mockAction1,
      icon: User,
    },
    {
      id: 'settings',
      label: 'Settings',
      action: mockAction2,
      icon: Settings,
    },
  ];

  const mockUser = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'SECURITY_GUARD',
    branchName: 'East Wing',
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockAction1.mockClear();
    mockAction2.mockClear();
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByTestId('mobile-menu-overlay')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <MobileMenu
          isOpen={false}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.queryByTestId('mobile-menu-overlay')).not.toBeInTheDocument();
    });

    it('should render TeamSwitcher-style header with Conninter app name', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByText('Conninter')).toBeInTheDocument();
    });

    it('should render header with default Security subtitle when no user', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should render header with branch name when user has branchName', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={mockUser}
        />
      );
      expect(screen.getByTestId('mobile-menu-header')).toBeInTheDocument();
      expect(screen.getByText('East Wing')).toBeInTheDocument();
    });

    it('should render header with hospitalChainName when no branchName', () => {
      const userWithChain = { ...mockUser, branchName: undefined, hospitalChainName: 'City Hospital' };
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={userWithChain}
        />
      );
      expect(screen.getByText('City Hospital')).toBeInTheDocument();
    });

    it('should render header with Security fallback when no branch or chain', () => {
      const userWithoutBranch = { ...mockUser, branchName: undefined, hospitalChainName: undefined };
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={userWithoutBranch}
        />
      );
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should render all menu items', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render menu item icons', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const profileItem = screen.getByTestId('menu-item-profile');
      expect(profileItem.querySelector('svg')).toBeInTheDocument();
    });

    it('should render items without icons', () => {
      const itemsWithoutIcons = [
        { id: 'item1', label: 'Item 1', action: mockAction1 },
      ];
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={itemsWithoutIcons}
        />
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('User Section', () => {
    it('should render user section when user prop is provided', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={mockUser}
        />
      );
      expect(screen.getByTestId('mobile-menu-user-section')).toBeInTheDocument();
    });

    it('should not render user section when user prop is not provided', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.queryByTestId('mobile-menu-user-section')).not.toBeInTheDocument();
    });

    it('should display user name', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={mockUser}
        />
      );
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display formatted role with branch name', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={mockUser}
        />
      );
      expect(screen.getByText('SECURITY GUARD \u2022 East Wing')).toBeInTheDocument();
    });

    it('should display user initials', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={mockUser}
        />
      );
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('should display role without branch name when branchName is not provided', () => {
      const userWithoutBranch = { ...mockUser, branchName: undefined };
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          user={userWithoutBranch}
        />
      );
      expect(screen.getByText('SECURITY GUARD')).toBeInTheDocument();
    });
  });

  describe('Backdrop', () => {
    it('should render backdrop', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByTestId('mobile-menu-backdrop')).toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.click(screen.getByTestId('mobile-menu-backdrop'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Close Button', () => {
    it('should render close button', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByTestId('close-menu-button')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.click(screen.getByTestId('close-menu-button'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have aria-label on close button', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const closeButton = screen.getByTestId('close-menu-button');
      expect(closeButton).toHaveAttribute('aria-label', 'Close menu');
    });
  });

  describe('Menu Item Actions', () => {
    it('should call item action when clicked', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.click(screen.getByTestId('menu-item-profile'));
      expect(mockAction1).toHaveBeenCalledTimes(1);
    });

    it('should close menu after item action', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.click(screen.getByTestId('menu-item-profile'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call correct action for each item', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.click(screen.getByTestId('menu-item-settings'));
      expect(mockAction2).toHaveBeenCalledTimes(1);
      expect(mockAction1).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog" on menu panel', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const panel = screen.getByTestId('mobile-menu-panel');
      expect(panel).toHaveAttribute('role', 'dialog');
    });

    it('should have aria-modal="true" on menu panel', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const panel = screen.getByTestId('mobile-menu-panel');
      expect(panel).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby referencing title', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const panel = screen.getByTestId('mobile-menu-panel');
      expect(panel).toHaveAttribute('aria-labelledby', 'mobile-menu-title');
    });

    it('should have menu role on navigation', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should have menuitem role on buttons', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
    });

    it('should have navigation role with aria-label', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(screen.getByRole('navigation', { name: 'Menu items' })).toBeInTheDocument();
    });

    it('should prevent body scroll when open', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { unmount } = render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      expect(document.body.style.overflow).toBe('hidden');
      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close on other keys', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should have focus ring styles on menu items', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
        />
      );
      const menuItem = screen.getByTestId('menu-item-profile');
      expect(menuItem).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-sidebar-ring');
    });
  });

  describe('Custom Styling', () => {
    it('should merge custom className', () => {
      render(
        <MobileMenu
          isOpen={true}
          onClose={mockOnClose}
          items={items}
          className="custom-menu-class"
        />
      );
      const overlay = screen.getByTestId('mobile-menu-overlay');
      expect(overlay).toHaveClass('custom-menu-class');
    });
  });
});
