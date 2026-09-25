import { render, screen, fireEvent } from '@testing-library/react';
import { ClipboardCheck, List } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';

describe('BottomNavigation', () => {
  const mockOnTabChange = jest.fn();

  const tabs = [
    {
      id: 'check-in' as const,
      label: 'Check-In',
      icon: ClipboardCheck,
      ariaLabel: 'Check-In tab',
    },
    {
      id: 'logs' as const,
      label: 'Logs',
      icon: List,
      ariaLabel: 'Visitor Logs tab',
    },
  ];

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render navigation element', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      expect(screen.getByTestId('tab-check-in')).toBeInTheDocument();
      expect(screen.getByTestId('tab-logs')).toBeInTheDocument();
    });

    it('should show tab labels', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      expect(screen.getByText('Check-In')).toBeInTheDocument();
      expect(screen.getByText('Logs')).toBeInTheDocument();
    });
  });

  describe('Active Tab State', () => {
    it('should highlight check-in tab when active', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const checkInTab = screen.getByTestId('tab-check-in');
      expect(checkInTab).toHaveAttribute('aria-selected', 'true');
      expect(checkInTab).toHaveClass('text-primary', 'border-t-2', 'border-primary');
    });

    it('should highlight logs tab when active', () => {
      render(
        <BottomNavigation
          activeTab="logs"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const logsTab = screen.getByTestId('tab-logs');
      expect(logsTab).toHaveAttribute('aria-selected', 'true');
      expect(logsTab).toHaveClass('text-primary', 'border-t-2', 'border-primary');
    });

    it('should not highlight inactive tabs', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const logsTab = screen.getByTestId('tab-logs');
      expect(logsTab).toHaveAttribute('aria-selected', 'false');
      expect(logsTab).toHaveClass('text-sidebar-foreground/70');
    });
  });

  describe('Tab Switching', () => {
    it('should call onTabChange when check-in tab is clicked', () => {
      render(
        <BottomNavigation
          activeTab="logs"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      fireEvent.click(screen.getByTestId('tab-check-in'));
      expect(mockOnTabChange).toHaveBeenCalledWith('check-in');
    });

    it('should call onTabChange when logs tab is clicked', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      fireEvent.click(screen.getByTestId('tab-logs'));
      expect(mockOnTabChange).toHaveBeenCalledWith('logs');
    });
  });

  describe('Accessibility', () => {
    it('should have navigation role with aria-label', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Dashboard navigation');
    });

    it('should have role="tab" on tab buttons', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const tabButtons = screen.getAllByRole('tab');
      expect(tabButtons).toHaveLength(2);
    });

    it('should have aria-selected attribute on tabs', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const checkInTab = screen.getByTestId('tab-check-in');
      expect(checkInTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should have aria-controls attribute referencing content', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const checkInTab = screen.getByTestId('tab-check-in');
      expect(checkInTab).toHaveAttribute('aria-controls', 'check-in-tab-content');
    });

    it('should have aria-label on each tab', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const checkInTab = screen.getByTestId('tab-check-in');
      expect(checkInTab).toHaveAttribute('aria-label', 'Check-In tab');
    });

    it('should have focus ring styles for keyboard navigation', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const checkInTab = screen.getByTestId('tab-check-in');
      expect(checkInTab).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-sidebar-ring');
    });
  });

  describe('Responsive', () => {
    it('should have lg:hidden class for mobile-only display', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
        />
      );
      const nav = screen.getByTestId('bottom-navigation');
      expect(nav).toHaveClass('lg:hidden');
    });
  });

  describe('Custom Styling', () => {
    it('should merge custom className', () => {
      render(
        <BottomNavigation
          activeTab="check-in"
          onTabChange={mockOnTabChange}
          tabs={tabs}
          className="custom-nav-class"
        />
      );
      const nav = screen.getByTestId('bottom-navigation');
      expect(nav).toHaveClass('custom-nav-class');
    });
  });
});
