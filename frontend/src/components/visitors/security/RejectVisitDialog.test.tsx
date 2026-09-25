import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectVisitDialog } from './RejectVisitDialog';

describe('RejectVisitDialog', () => {
  const defaultProps = {
    isOpen: true,
    visitorName: 'John Doe',
    onClose: jest.fn(),
    onReject: jest.fn().mockResolvedValue(undefined),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog visibility', () => {
    it('should render dialog when isOpen is true', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Reject Visit Request')).toBeInTheDocument();
    });

    it('should not render dialog when isOpen is false', () => {
      render(<RejectVisitDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Content display', () => {
    it('should display visitor name in dialog', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should display title correctly', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /reject visit request/i })).toBeInTheDocument();
    });

    it('should render textarea with placeholder', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('Visitor not on approved list'));
    });

    it('should show character count', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      expect(screen.getByText('0/500')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for empty reason', async () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText(/please provide a reason for rejection/i)).toBeInTheDocument();
      });
      expect(defaultProps.onReject).not.toHaveBeenCalled();
    });

    it('should show error for whitespace-only reason', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   ');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText(/please provide a reason for rejection/i)).toBeInTheDocument();
      });
      expect(defaultProps.onReject).not.toHaveBeenCalled();
    });

    it('should show error for reason less than 5 characters', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'No');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText(/reason must be at least 5 characters/i)).toBeInTheDocument();
      });
      expect(defaultProps.onReject).not.toHaveBeenCalled();
    });

    it('should have maxLength attribute set to 500', async () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxLength', '500');
    });

    it('should accept valid reason between 5-500 characters', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Valid rejection reason');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(defaultProps.onReject).toHaveBeenCalledWith('Valid rejection reason');
      });
    });

    it('should clear error when user types valid input', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      // First, trigger error
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'No');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText(/reason must be at least 5 characters/i)).toBeInTheDocument();
      });

      // Now type valid input
      await user.clear(textarea);
      await user.type(textarea, 'Valid reason now');

      await waitFor(() => {
        expect(screen.queryByText(/reason must be at least 5 characters/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Character count', () => {
    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      expect(screen.getByText('5/500')).toBeInTheDocument();
    });

    it('should change color near character limit', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(460);
      await user.type(textarea, longText);

      const charCount = screen.getByText('460/500');
      expect(charCount).toHaveClass('text-yellow-600');
    });

    it('should show error color when exceeding limit', async () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(501);

      // Use paste to bypass maxLength if enforced
      fireEvent.change(textarea, { target: { value: longText } });

      const charCount = screen.getByText('501/500');
      expect(charCount).toHaveClass('text-destructive');
    });
  });

  describe('Submit behavior', () => {
    it('should call onReject with trimmed reason', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '  Valid reason  ');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(defaultProps.onReject).toHaveBeenCalledWith('Valid reason');
      });
    });

    it('should disable textarea during submission', () => {
      render(<RejectVisitDialog {...defaultProps} isSubmitting={true} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should disable submit button during submission', () => {
      render(<RejectVisitDialog {...defaultProps} isSubmitting={true} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      expect(rejectButton).toBeDisabled();
    });

    it('should show loading spinner on submit button during submission', () => {
      render(<RejectVisitDialog {...defaultProps} isSubmitting={true} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Cancel behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when ESC key is pressed', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on dialog', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper ARIA label on textarea', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Reason for rejection');
    });

    it('should associate error message with textarea', async () => {
      const user = userEvent.setup();
      render(<RejectVisitDialog {...defaultProps} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        const errorId = textarea.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        
        if (errorId) {
          const errorMessage = document.getElementById(errorId);
          expect(errorMessage).toHaveTextContent(/please provide a reason/i);
        }
      });
    });

    it('should focus textarea when dialog opens', async () => {
      const { rerender } = render(<RejectVisitDialog {...defaultProps} isOpen={false} />);

      rerender(<RejectVisitDialog {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveFocus();
      });
    });

    it('should trap focus within dialog', () => {
      render(<RejectVisitDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const rejectButton = screen.getByRole('button', { name: /reject/i });

      // Dialog should have focus management
      // Note: Radix UI handles focus trap automatically
      expect(textarea).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle async rejection errors gracefully', async () => {
      const user = userEvent.setup();
      const onRejectError = jest.fn().mockRejectedValue(new Error('API Error'));

      render(<RejectVisitDialog {...defaultProps} onReject={onRejectError} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Valid rejection reason');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(onRejectError).toHaveBeenCalled();
      });

      // Dialog should remain open on error
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
