import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogsRefreshControl } from './logs-refresh-control';

describe('LogsRefreshControl', () => {
  const mockOnManualRefresh = jest.fn().mockResolvedValue(undefined);
  const mockOnTogglePolling = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Live/Paused Indicator', () => {
    it('should show green pulsing dot when polling is active', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.queryByTestId('paused-indicator')).not.toBeInTheDocument();
    });

    it('should show gray dot when polling is paused', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={false}
        />
      );

      expect(screen.getByTestId('paused-indicator')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.queryByTestId('live-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Loading Spinner', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(
        <LogsRefreshControl
          isLoading={true}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should not show loading spinner when isLoading is false', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });
  });

  describe('Last Refresh Time', () => {
    it('should display last refresh time when available', () => {
      const lastRefreshTime = new Date(Date.now() - 120000); // 2 minutes ago

      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={lastRefreshTime}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      expect(screen.getByText(/Updated .* ago/)).toBeInTheDocument();
    });

    it('should not display last refresh time when null', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      expect(screen.queryByText(/Updated .* ago/)).not.toBeInTheDocument();
    });

    it('should not display last refresh time when loading', () => {
      const lastRefreshTime = new Date(Date.now() - 120000); // 2 minutes ago

      render(
        <LogsRefreshControl
          isLoading={true}
          lastRefreshTime={lastRefreshTime}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      expect(screen.queryByText(/Updated .* ago/)).not.toBeInTheDocument();
    });
  });

  describe('Manual Refresh Button', () => {
    it('should render manual refresh button', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('manual-refresh-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Refresh logs');
    });

    it('should call onManualRefresh when clicked', async () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('manual-refresh-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnManualRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should be disabled when isLoading is true', () => {
      render(
        <LogsRefreshControl
          isLoading={true}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('manual-refresh-button');
      expect(button).toBeDisabled();
    });

    it('should show spinning icon when loading', () => {
      render(
        <LogsRefreshControl
          isLoading={true}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('manual-refresh-button');
      const icon = button.querySelector('svg');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Toggle Polling Button', () => {
    it('should render toggle polling button', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('toggle-polling-button');
      expect(button).toBeInTheDocument();
    });

    it('should have "Pause auto-refresh" aria-label when polling is active', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('toggle-polling-button');
      expect(button).toHaveAttribute('aria-label', 'Pause auto-refresh');
    });

    it('should have "Start auto-refresh" aria-label when polling is paused', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={false}
        />
      );

      const button = screen.getByTestId('toggle-polling-button');
      expect(button).toHaveAttribute('aria-label', 'Start auto-refresh');
    });

    it('should call onTogglePolling when clicked', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const button = screen.getByTestId('toggle-polling-button');
      fireEvent.click(button);

      expect(mockOnTogglePolling).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const manualRefreshButton = screen.getByTestId('manual-refresh-button');
      expect(manualRefreshButton).toHaveAttribute('aria-label', 'Refresh logs');

      const toggleButton = screen.getByTestId('toggle-polling-button');
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('should hide decorative elements from screen readers', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
        />
      );

      const liveIndicator = screen.getByTestId('live-indicator');
      expect(liveIndicator).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <LogsRefreshControl
          isLoading={false}
          lastRefreshTime={null}
          onManualRefresh={mockOnManualRefresh}
          onTogglePolling={mockOnTogglePolling}
          isPollingActive={true}
          className="custom-class"
        />
      );

      const control = screen.getByTestId('logs-refresh-control');
      expect(control).toHaveClass('custom-class');
    });
  });
});
