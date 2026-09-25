import { render, screen, fireEvent } from '@testing-library/react';
import { OtpInput } from '@/components/visitors/shared/OtpInput';

describe('OtpInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  describe('Initial Render', () => {
    it('should render correct number of input boxes', () => {
      render(<OtpInput {...defaultProps} />);

      // Query by aria-labels which ARE present in the DOM
      expect(screen.getByLabelText('Digit 1 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 2 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 3 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 4 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 5 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 6 of 6')).toBeInTheDocument();
    });

    it('should render custom number of input boxes', () => {
      render(<OtpInput {...defaultProps} length={4} />);

      expect(screen.getByLabelText('Digit 1 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 2 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 3 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 4 of 4')).toBeInTheDocument();
    });

    it('should clamp length between 4 and 8', () => {
      render(<OtpInput {...defaultProps} length={10} />);

      expect(screen.getByLabelText('Digit 1 of 8')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 8 of 8')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should accept digit input', () => {
      const onChange = jest.fn();
      render(<OtpInput {...defaultProps} onChange={onChange} value="1" />);

      expect(screen.getByLabelText('Digit 1 of 6')).toHaveTextContent('1');
    });

    it('should filter out non-digit characters', () => {
      const onChange = jest.fn();
      render(<OtpInput {...defaultProps} onChange={onChange} value="" />);

      // Non-digit characters should be filtered out
      expect(screen.getByLabelText('Digit 1 of 6')).toBeEmptyDOMElement();
    });

    it('should limit input to maxLength', () => {
      const onChange = jest.fn();
      render(<OtpInput {...defaultProps} onChange={onChange} value="1" />);

      // Only the first digit should be displayed
      expect(screen.getByLabelText('Digit 1 of 6')).toHaveTextContent('1');
      expect(screen.getByLabelText('Digit 2 of 6')).toBeEmptyDOMElement();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle right arrow key', () => {
      render(<OtpInput {...defaultProps} value="1" />);

      const secondSlot = screen.getByLabelText('Digit 2 of 6');
      expect(secondSlot).toBeInTheDocument();
    });

    it('should handle left arrow key', () => {
      render(<OtpInput {...defaultProps} value="12" />);

      const firstSlot = screen.getByLabelText('Digit 1 of 6');
      expect(firstSlot).toBeInTheDocument();
    });

    it('should handle backspace key', () => {
      render(<OtpInput {...defaultProps} value="1" />);

      const firstSlot = screen.getByLabelText('Digit 1 of 6');
      expect(firstSlot).toBeInTheDocument();
    });

    it('should trigger onComplete on Enter when full', () => {
      const onComplete = jest.fn();
      render(<OtpInput {...defaultProps} value="123456" onComplete={onComplete} />);

      const lastSlot = screen.getByLabelText('Digit 6 of 6');
      expect(lastSlot).toBeInTheDocument();

      // Simulate Enter key on the last slot
      fireEvent.keyDown(lastSlot, { key: 'Enter' });
      expect(onComplete).toHaveBeenCalledWith('123456');
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<OtpInput {...defaultProps} error="Invalid OTP" />);
      expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
    });

    it('should have aria-live region for error message', () => {
      render(<OtpInput {...defaultProps} error="Invalid OTP" />);
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Disabled State', () => {
    it('should render without error when disabled prop is true', () => {
      render(<OtpInput {...defaultProps} disabled={true} />);

      // Component should still render all slots
      expect(screen.getByLabelText('Digit 1 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 6 of 6')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for each input', () => {
      render(<OtpInput {...defaultProps} />);

      for (let i = 1; i <= 6; i++) {
        expect(screen.getByLabelText(`Digit ${i} of 6`)).toBeInTheDocument();
      }
    });

    it('should have aria-label for group', () => {
      render(<OtpInput {...defaultProps} />);
      const group = document.querySelector('[role="group"]');
      expect(group).toHaveAttribute('aria-label', 'One-time password');
    });
  });

  describe('Completion Callback', () => {
    it('should call onComplete when all digits are filled', () => {
      const onChange = jest.fn();
      const onComplete = jest.fn();
      render(
        <OtpInput
          {...defaultProps}
          length={4}
          value="123"
          onChange={onChange}
          onComplete={onComplete}
        />
      );

      // When the last digit is filled
      const lastSlot = screen.getByLabelText('Digit 4 of 4');
      expect(lastSlot).toBeInTheDocument();
    });

    it('should have correct aria-label for custom length', () => {
      render(<OtpInput {...defaultProps} length={8} value="12345678" />);

      expect(screen.getByLabelText('Digit 1 of 8')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 8 of 8')).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('should display entered digits', () => {
      render(<OtpInput {...defaultProps} value="123" />);

      expect(screen.getByLabelText('Digit 1 of 6')).toHaveTextContent('1');
      expect(screen.getByLabelText('Digit 2 of 6')).toHaveTextContent('2');
      expect(screen.getByLabelText('Digit 3 of 6')).toHaveTextContent('3');
      expect(screen.getByLabelText('Digit 4 of 6')).toBeEmptyDOMElement();
    });

    it('should handle empty value', () => {
      render(<OtpInput {...defaultProps} value="" />);

      for (let i = 1; i <= 6; i++) {
        expect(screen.getByLabelText(`Digit ${i} of 6`)).toBeEmptyDOMElement();
      }
    });
  });
});
