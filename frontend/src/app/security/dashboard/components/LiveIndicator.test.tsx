import { render, screen } from '@testing-library/react';
import { LiveIndicator } from './LiveIndicator';

describe('LiveIndicator', () => {
  describe('Rendering', () => {
    it('should render with default label when isLive is true', () => {
      render(<LiveIndicator isLive={true} />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should render "Offline" text when isLive is false', () => {
      render(<LiveIndicator isLive={false} />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should render custom label when provided', () => {
      render(<LiveIndicator isLive={true} label="Online" />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should show custom label even when offline', () => {
      render(<LiveIndicator isLive={false} label="Connected" />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should show green dot and pulsing animation when live', () => {
      render(<LiveIndicator isLive={true} />);
      const dot = screen.getByTestId('live-dot');
      const ping = screen.getByTestId('live-ping');
      
      expect(dot).toHaveClass('bg-green-500');
      expect(ping).toHaveClass('bg-green-400', 'animate-ping');
    });

    it('should show gray dot without animation when offline', () => {
      render(<LiveIndicator isLive={false} />);
      const dot = screen.getByTestId('live-dot');
      const ping = screen.queryByTestId('live-ping');
      
      expect(dot).toHaveClass('bg-gray-400');
      expect(ping).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-live="polite" for status announcements', () => {
      render(<LiveIndicator isLive={true} />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should have role="status"', () => {
      render(<LiveIndicator isLive={true} />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator).toHaveAttribute('role', 'status');
    });

    it('should have appropriate aria-label when live', () => {
      render(<LiveIndicator isLive={true} />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'System is live');
    });

    it('should have appropriate aria-label when offline', () => {
      render(<LiveIndicator isLive={false} />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'System is offline');
    });
  });

  describe('Class Customization', () => {
    it('should merge custom className', () => {
      render(<LiveIndicator isLive={true} className="ml-4" />);
      const indicator = screen.getByTestId('live-indicator');
      expect(indicator).toHaveClass('ml-4');
    });
  });
});
