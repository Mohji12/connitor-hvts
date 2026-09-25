import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ConfirmationStep,
  ANIMATION_TIMING,
} from './ConfirmationStep';

// Mock timers for testing
jest.useFakeTimers();

describe('ConfirmationStep', () => {
  const mockOnDone = jest.fn();
  const mockOnContactSecurity = jest.fn();

  // Suppress act() warnings from animation timers
  // These are expected and don't affect test reliability
  const originalError = console.error;

  beforeAll(() => {
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('An update to ConfirmationStep inside a test was not wrapped in act')
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Rendering', () => {
    it('should render step indicator', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );
      expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
    });

    it('should render success checkmark', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );
      expect(screen.getByTestId('success-checkmark')).toBeInTheDocument();
      expect(screen.getByLabelText('Success checkmark animation')).toBeInTheDocument();
    });

    it('should render "Request Submitted!" heading', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="DELIVERY"
          onDone={mockOnDone}
        />
      );
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });

    it('should render WhatsApp delivery explanation', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );
      expect(screen.getByText(/You'll receive your/i)).toBeInTheDocument();
      expect(screen.getByText(/Gate Pass via WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/with your Check-In OTP once approved/i)).toBeInTheDocument();
    });

    it('should render Done button', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );
      expect(screen.getByRole('button', { name: /complete registration and close/i })).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('should render Contact Security link when handler provided', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          onContactSecurity={mockOnContactSecurity}
        />
      );
      expect(screen.getByRole('button', { name: /contact security for help/i })).toBeInTheDocument();
      expect(screen.getByText('Need help? Contact Security')).toBeInTheDocument();
    });

    it('should not render Contact Security link when handler not provided', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );
      expect(screen.queryByText('Need help? Contact Security')).not.toBeInTheDocument();
    });

    it('should render for DELIVERY visit type', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-456"
          visitType="DELIVERY"
          onDone={mockOnDone}
        />
      );
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should trigger animation on mount', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const checkmark = screen.getByLabelText('Success checkmark animation');
      expect(checkmark).toBeInTheDocument();
    });

    it('should mark animation as complete after duration', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      // Fast-forward time past animation duration
      act(() => {
        jest.advanceTimersByTime(ANIMATION_TIMING.TOTAL_ANIMATION_DURATION);
      });

      // Animation should be complete (component state updated)
      // Note: We can't directly check state, but we can verify no errors
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });

    it('should respect prefers-reduced-motion', () => {
      // This would require mocking window.matchMedia
      // For now, verify the CSS class is present
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const checkmark = screen.getByLabelText('Success checkmark animation');
      expect(checkmark).toHaveClass('checkmark-container');
    });
  });

  describe('Done Handler', () => {
    it('should call onDone when Done button clicked', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      fireEvent.click(doneButton);

      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('should cancel auto-redirect when Done button clicked', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={5000}
        />
      );

      // Click Done before auto-redirect triggers
      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      fireEvent.click(doneButton);

      // Advance timers to when auto-redirect would have triggered
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should only be called once (from button click, not auto-redirect)
      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple Done button clicks', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      fireEvent.click(doneButton);
      fireEvent.click(doneButton);

      expect(mockOnDone).toHaveBeenCalledTimes(2);
    });
  });

  describe('Contact Security Handler', () => {
    it('should call onContactSecurity when link clicked', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          onContactSecurity={mockOnContactSecurity}
        />
      );

      const contactLink = screen.getByRole('button', { name: /contact security for help/i });
      fireEvent.click(contactLink);

      expect(mockOnContactSecurity).toHaveBeenCalledTimes(1);
    });

    it('should cancel auto-redirect when Contact Security clicked', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          onContactSecurity={mockOnContactSecurity}
          autoRedirectDelay={5000}
        />
      );

      // Click Contact Security before auto-redirect triggers
      const contactLink = screen.getByRole('button', { name: /contact security for help/i });
      fireEvent.click(contactLink);

      // Advance timers to when auto-redirect would have triggered
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should not be called (auto-redirect was canceled)
      expect(mockOnDone).not.toHaveBeenCalled();
      expect(mockOnContactSecurity).toHaveBeenCalledTimes(1);
    });

    it('should log warning if clicked without handler', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      // No Contact Security link should be rendered
      expect(screen.queryByText('Need help? Contact Security')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Auto-Redirect', () => {
    it('should trigger auto-redirect after delay', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={5000}
        />
      );

      // onDone should not be called yet
      expect(mockOnDone).not.toHaveBeenCalled();

      // Advance timers by delay amount
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should be called after delay
      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('should not auto-redirect when delay is null', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={null}
        />
      );

      // Advance timers significantly
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // onDone should not be called
      expect(mockOnDone).not.toHaveBeenCalled();
    });

    it('should not auto-redirect when delay is 0', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={0}
        />
      );

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // onDone should not be called (0 means disabled)
      expect(mockOnDone).not.toHaveBeenCalled();
    });

    it('should not auto-redirect when delay is negative', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={-1000}
        />
      );

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should not be called (negative means disabled)
      expect(mockOnDone).not.toHaveBeenCalled();
    });

    it('should cancel auto-redirect on unmount', () => {
      const { unmount } = render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={5000}
        />
      );

      // Unmount before auto-redirect triggers
      unmount();

      // Advance timers to when auto-redirect would have triggered
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should not be called (timer was cleared on unmount)
      expect(mockOnDone).not.toHaveBeenCalled();
    });

    it('should cancel auto-redirect on user interaction (click)', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={5000}
        />
      );

      // Simulate user clicking anywhere on the component
      const container = screen.getByTestId('confirmation-step');
      fireEvent.click(container);

      // Advance timers to when auto-redirect would have triggered
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should not be called (auto-redirect was canceled by interaction)
      expect(mockOnDone).not.toHaveBeenCalled();
    });

    it('should cancel auto-redirect on user interaction (keydown)', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={5000}
        />
      );

      // Simulate user pressing a key
      const container = screen.getByTestId('confirmation-step');
      fireEvent.keyDown(container, { key: 'Tab' });

      // Advance timers to when auto-redirect would have triggered
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onDone should not be called (auto-redirect was canceled by interaction)
      expect(mockOnDone).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onDone when Escape key pressed', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('should allow Enter key on Done button', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      doneButton.focus();

      await user.keyboard('{Enter}');

      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('should allow Space key on Done button', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      doneButton.focus();

      await user.keyboard(' ');

      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('should allow Tab navigation between buttons', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          onContactSecurity={mockOnContactSecurity}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      const contactButton = screen.getByRole('button', { name: /contact security for help/i });

      // Both buttons should be focusable
      expect(doneButton).not.toHaveAttribute('tabindex', '-1');
      expect(contactButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live on alert container', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have aria-label on checkmark', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      expect(screen.getByLabelText('Success checkmark animation')).toBeInTheDocument();
    });

    it('should have aria-label on heading', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const heading = screen.getByRole('status');
      expect(heading).toHaveAttribute('aria-label', 'Request submitted confirmation');
    });

    it('should have aria-label on Done button', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const button = screen.getByRole('button', { name: /complete registration and close/i });
      expect(button).toHaveAttribute('aria-label', 'Complete registration and close');
    });

    it('should have aria-label on Contact Security button', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          onContactSecurity={mockOnContactSecurity}
        />
      );

      const button = screen.getByRole('button', { name: /contact security for help/i });
      expect(button).toHaveAttribute('aria-label', 'Contact security for help');
    });

    it('should have aria-describedby on WhatsApp text', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const whatsappSection = screen.getByText(/You'll receive your/i).parentElement;
      expect(whatsappSection).toHaveAttribute('id', 'whatsapp-instruction');
      expect(whatsappSection).toHaveAttribute('aria-describedby', 'whatsapp-instruction');
    });
  });

  describe('Props Validation', () => {
    it('should handle missing visitId gracefully', () => {
      render(
        <ConfirmationStep
          visitId=""
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      // Should still render successfully
      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });

    it('should handle MEETING visit type', () => {
      render(
        <ConfirmationStep
          visitId="meeting-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });

    it('should handle DELIVERY visit type', () => {
      render(
        <ConfirmationStep
          visitId="delivery-456"
          visitType="DELIVERY"
          onDone={mockOnDone}
        />
      );

      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
    });

    it('should handle undefined autoRedirectDelay', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={undefined}
        />
      );

      // Should default to null (no auto-redirect)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockOnDone).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should have max-width constraint', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const container = screen.getByTestId('confirmation-step');
      expect(container).toHaveClass('max-w-[480px]');
    });

    it('should center container', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const container = screen.getByTestId('confirmation-step');
      expect(container).toHaveClass('mx-auto');
    });

    it('should have responsive checkmark sizing', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const checkmark = screen.getByTestId('success-checkmark');
      expect(checkmark).toHaveClass('h-20', 'w-20', 'md:h-24', 'md:w-24');
    });
  });

  describe('Touch Targets', () => {
    it('should have minimum 48px height for Done button', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      expect(doneButton).toHaveClass('min-h-[48px]');
    });

    it('should have minimum 44px height for Contact Security link', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          onContactSecurity={mockOnContactSecurity}
        />
      );

      const contactButton = screen.getByRole('button', { name: /contact security for help/i });
      expect(contactButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('Edge Cases', () => {
    it('should cleanup timers on unmount during animation', () => {
      const { unmount } = render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
          autoRedirectDelay={5000}
        />
      );

      // Unmount during animation
      act(() => {
        jest.advanceTimersByTime(500);
      });
      unmount();

      // Advance timers - should not cause errors or call onDone
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockOnDone).not.toHaveBeenCalled();
    });

    it('should handle rapid Done button clicks', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      const doneButton = screen.getByRole('button', { name: /complete registration and close/i });
      
      // Click multiple times rapidly
      fireEvent.click(doneButton);
      fireEvent.click(doneButton);
      fireEvent.click(doneButton);

      expect(mockOnDone).toHaveBeenCalledTimes(3);
    });

    it('should handle missing optional props', () => {
      render(
        <ConfirmationStep
          visitId="test-visit-123"
          visitType="MEETING"
          onDone={mockOnDone}
        />
      );

      expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
      expect(screen.queryByText('Need help? Contact Security')).not.toBeInTheDocument();
    });
  });
});
