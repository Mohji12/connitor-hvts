import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardHeader } from './DashboardHeader';

describe('DashboardHeader', () => {
  const mockOnMenuClick = jest.fn();

  beforeEach(() => {
    mockOnMenuClick.mockClear();
  });

  describe('Rendering', () => {
    it('should render title', () => {
      render(
        <DashboardHeader
          title="Security Dashboard"
          showHamburger={false}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    });

    it('should have role="banner" for accessibility', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={false}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={false}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
          className="custom-class"
        />
      );
      expect(screen.getByTestId('dashboard-header')).toHaveClass('custom-class');
    });
  });

  describe('Hamburger Menu Button', () => {
    it('should show hamburger button when showHamburger is true', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
    });

    it('should not show hamburger button when showHamburger is false', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={false}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      expect(screen.queryByTestId('hamburger-button')).not.toBeInTheDocument();
    });

    it('should call onMenuClick when hamburger is clicked', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      fireEvent.click(screen.getByTestId('hamburger-button'));
      expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
    });

    it('should have correct aria-label on hamburger button', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      const button = screen.getByTestId('hamburger-button');
      expect(button).toHaveAttribute('aria-label', 'Security Dashboard menu');
    });

    it('should show Menu icon when menu is closed', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
          isMenuOpen={false}
        />
      );
      const button = screen.getByTestId('hamburger-button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should show X icon when menu is open', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
          isMenuOpen={true}
        />
      );
      const button = screen.getByTestId('hamburger-button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should have aria-expanded attribute', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
          isMenuOpen={true}
        />
      );
      const button = screen.getByTestId('hamburger-button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls attribute', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={true}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      const button = screen.getByTestId('hamburger-button');
      expect(button).toHaveAttribute('aria-controls', 'mobile-menu');
    });
  });

  describe('Live Indicator', () => {
    it('should show live indicator when showLiveIndicator is true', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={false}
          showLiveIndicator={true}
          onMenuClick={mockOnMenuClick}
          liveStatus={true}
        />
      );
      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
    });

    it('should not show live indicator when showLiveIndicator is false', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={false}
          showLiveIndicator={false}
          onMenuClick={mockOnMenuClick}
        />
      );
      expect(screen.queryByTestId('live-indicator')).not.toBeInTheDocument();
    });

    it('should pass liveStatus to LiveIndicator', () => {
      render(
        <DashboardHeader
          title="Test"
          showHamburger={false}
          showLiveIndicator={true}
          onMenuClick={mockOnMenuClick}
          liveStatus={false}
        />
      );
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });
});
