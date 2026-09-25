import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DeliveryDetailsStep,
  COMMON_DELIVERY_PLATFORMS,
} from './DeliveryDetailsStep';

describe('DeliveryDetailsStep', () => {
  const mockOnSubmit = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render step indicator', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      expect(screen.getByText('Step 4 of 6 • Delivery')).toBeInTheDocument();
    });

    it('should render header and sub-header', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      expect(screen.getByText('Delivery Details')).toBeInTheDocument();
      expect(screen.getByText('Tell us about your delivery')).toBeInTheDocument();
    });

    it('should render all platform chips', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      COMMON_DELIVERY_PLATFORMS.forEach((chip) => {
        expect(screen.getByLabelText(`${chip.label} platform`)).toBeInTheDocument();
      });
    });

    it('should render platform input field', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      expect(screen.getByLabelText(/or enter platform name/i)).toBeInTheDocument();
    });

    it('should render recipient input field', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      expect(screen.getByLabelText(/recipient name or department/i)).toBeInTheDocument();
    });

    it('should render back and continue buttons', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
  });

  describe('Chip Selection', () => {
    it('should select platform chip and update form', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const zomatoChip = screen.getByLabelText('Zomato platform');
      
      fireEvent.click(zomatoChip);
      
      expect(zomatoChip).toHaveAttribute('aria-checked', 'true');
      const platformInput = screen.getByLabelText(/or enter platform name/i) as HTMLInputElement;
      expect(platformInput.value).toBe('Zomato');
    });

    it('should update selected chip styling', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const amazonChip = screen.getByLabelText('Amazon platform');
      
      fireEvent.click(amazonChip);
      
      expect(amazonChip).toHaveClass('border-amber-500', 'bg-amber-500', 'text-white');
    });

    it('should allow switching between chips', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const swiggyChip = screen.getByLabelText('Swiggy platform');
      const dunzoChip = screen.getByLabelText('Dunzo platform');
      
      fireEvent.click(swiggyChip);
      expect(swiggyChip).toHaveAttribute('aria-checked', 'true');
      
      fireEvent.click(dunzoChip);
      expect(swiggyChip).toHaveAttribute('aria-checked', 'false');
      expect(dunzoChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should focus platform input when "Others" is selected', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const othersChip = screen.getByLabelText('Others platform');
      
      fireEvent.click(othersChip);
      
      await waitFor(() => {
        const platformInput = screen.getByLabelText(/platform name/i);
        expect(document.activeElement).toBe(platformInput);
      });
    });

    it('should clear platform value when "Others" is selected', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const zomatoChip = screen.getByLabelText('Zomato platform');
      const othersChip = screen.getByLabelText('Others platform');
      
      fireEvent.click(zomatoChip);
      fireEvent.click(othersChip);
      
      const platformInput = screen.getByLabelText(/platform name/i) as HTMLInputElement;
      expect(platformInput.value).toBe('');
    });
  });

  describe('Input Synchronization', () => {
    it('should deselect chip when typing custom platform', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const zomatoChip = screen.getByLabelText('Zomato platform');
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      
      fireEvent.click(zomatoChip);
      expect(zomatoChip).toHaveAttribute('aria-checked', 'true');
      
      fireEvent.change(platformInput, { target: { value: 'Custom Courier' } });
      
      // Should select "Others" chip
      const othersChip = screen.getByLabelText('Others platform');
      expect(othersChip).toHaveAttribute('aria-checked', 'true');
      expect(zomatoChip).toHaveAttribute('aria-checked', 'false');
    });

    it('should reselect chip if typed value matches', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      
      fireEvent.change(platformInput, { target: { value: 'Amazon' } });
      
      const amazonChip = screen.getByLabelText('Amazon platform');
      expect(amazonChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should deselect all chips when input is empty', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const zomatoChip = screen.getByLabelText('Zomato platform');
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      
      fireEvent.click(zomatoChip);
      fireEvent.change(platformInput, { target: { value: '' } });
      
      COMMON_DELIVERY_PLATFORMS.forEach((chip) => {
        const chipElement = screen.getByLabelText(`${chip.label} platform`);
        expect(chipElement).toHaveAttribute('aria-checked', 'false');
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required platform field', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const recipientInput = screen.getByLabelText(/recipient name or department/i);
      
      fireEvent.change(recipientInput, { target: { value: 'Pharmacy' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/platform must be at least 2 characters/i)).toBeInTheDocument();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should validate required recipient field', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      
      fireEvent.change(platformInput, { target: { value: 'Zomato' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/recipient must be at least 2 characters/i)).toBeInTheDocument();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should validate minimum length for platform', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      
      fireEvent.change(platformInput, { target: { value: 'A' } });
      fireEvent.blur(platformInput);
      
      await waitFor(() => {
        expect(screen.getByText(/platform must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate maximum length for platform', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      const longString = 'A'.repeat(101);
      
      fireEvent.change(platformInput, { target: { value: longString } });
      fireEvent.blur(platformInput);
      
      await waitFor(() => {
        expect(screen.getByText(/platform must not exceed 100 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate minimum length for recipient', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const recipientInput = screen.getByLabelText(/recipient name or department/i);
      
      fireEvent.change(recipientInput, { target: { value: 'A' } });
      fireEvent.blur(recipientInput);
      
      await waitFor(() => {
        expect(screen.getByText(/recipient must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate maximum length for recipient', async () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      const recipientInput = screen.getByLabelText(/recipient name or department/i);
      const longString = 'A'.repeat(101);
      
      fireEvent.change(recipientInput, { target: { value: longString } });
      fireEvent.blur(recipientInput);
      
      await waitFor(() => {
        expect(screen.getByText(/recipient must not exceed 100 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid data from chip selection', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.click(screen.getByLabelText('Zomato platform'));
      fireEvent.change(screen.getByLabelText(/recipient name or department/i), {
        target: { value: 'Pharmacy' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          platform: 'Zomato',
          recipient: 'Pharmacy',
        });
      });
    });

    it('should submit with valid data from manual input', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.change(screen.getByLabelText(/or enter platform name/i), {
        target: { value: 'Custom Courier' },
      });
      fireEvent.change(screen.getByLabelText(/recipient name or department/i), {
        target: { value: 'Dr. Smith' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          platform: 'Custom Courier',
          recipient: 'Dr. Smith',
        });
      });
    });

    it('should show success animation on successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.click(screen.getByLabelText('Amazon platform'));
      fireEvent.change(screen.getByLabelText(/recipient name or department/i), {
        target: { value: 'Reception' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Success checkmark')).toBeInTheDocument();
        expect(screen.getByText('Details Saved!')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable all inputs when loading', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} isLoading={true} />);
      
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      const recipientInput = screen.getByLabelText(/recipient name or department/i);
      const backButton = screen.getByRole('button', { name: /back/i });
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      expect(platformInput).toBeDisabled();
      expect(recipientInput).toBeDisabled();
      expect(backButton).toBeDisabled();
      expect(continueButton).toBeDisabled();
    });

    it('should show spinner in submit button when loading', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} isLoading={true} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should disable chips when loading', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} isLoading={true} />);
      
      COMMON_DELIVERY_PLATFORMS.forEach((chip) => {
        const chipElement = screen.getByLabelText(`${chip.label} platform`);
        expect(chipElement).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display submission error', async () => {
      const errorMessage = 'Connection lost. Please check your internet and try again.';
      mockOnSubmit.mockRejectedValue(new Error(errorMessage));
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.click(screen.getByLabelText('Swiggy platform'));
      fireEvent.change(screen.getByLabelText(/recipient name or department/i), {
        target: { value: 'Front Desk' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should clear previous error on new submission', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('First error'));
      mockOnSubmit.mockResolvedValueOnce(undefined);
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.click(screen.getByLabelText('Dunzo platform'));
      fireEvent.change(screen.getByLabelText(/recipient name or department/i), {
        target: { value: 'Lab' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });

    it('should preserve form data on submission error', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const platformInput = screen.getByLabelText(/or enter platform name/i) as HTMLInputElement;
      const recipientInput = screen.getByLabelText(/recipient name or department/i) as HTMLInputElement;
      
      fireEvent.change(platformInput, { target: { value: 'BlueDart' } });
      fireEvent.change(recipientInput, { target: { value: 'Security' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      expect(platformInput.value).toBe('BlueDart');
      expect(recipientInput.value).toBe('Security');
    });
  });

  describe('Back Navigation', () => {
    it('should call onBack when back button clicked', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should call onBack when Escape key pressed', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should not call onBack on Escape when loading', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} isLoading={true} />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockOnBack).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should select chip with Enter key', async () => {
      const user = userEvent.setup();
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const amazonChip = screen.getByLabelText('Amazon platform');
      amazonChip.focus();
      
      await user.keyboard('{Enter}');
      
      expect(amazonChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should select chip with Space key', async () => {
      const user = userEvent.setup();
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const dunzoChip = screen.getByLabelText('Dunzo platform');
      dunzoChip.focus();
      
      await user.keyboard(' ');
      
      expect(dunzoChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow keyboard navigation between elements', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      // Verify all interactive elements are focusable
      const platformChips = screen.getAllByRole('radio');
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      const recipientInput = screen.getByLabelText(/recipient name or department/i);
      const backButton = screen.getByRole('button', { name: /back/i });
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      expect(platformChips[0]).not.toHaveAttribute('tabindex', '-1');
      expect(platformInput).not.toBeDisabled();
      expect(recipientInput).not.toBeDisabled();
      expect(backButton).not.toBeDisabled();
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      expect(screen.getByRole('group', { name: /platform selection/i })).toBeInTheDocument();
      expect(screen.getByRole('form', { name: /delivery details form/i })).toBeInTheDocument();
    });

    it('should have aria-checked on chips', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      COMMON_DELIVERY_PLATFORMS.forEach((chip) => {
        const chipElement = screen.getByLabelText(`${chip.label} platform`);
        expect(chipElement).toHaveAttribute('aria-checked');
      });
    });

    it('should have aria-required on required fields', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      expect(screen.getByLabelText(/or enter platform name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/recipient name or department/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should link error messages with aria-describedby', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      expect(screen.getByLabelText(/or enter platform name/i)).toHaveAttribute(
        'aria-describedby',
        'platform-error'
      );
      expect(screen.getByLabelText(/recipient name or department/i)).toHaveAttribute(
        'aria-describedby',
        'recipient-error'
      );
    });

    it('should announce success with aria-live', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      fireEvent.click(screen.getByLabelText('Blinkit platform'));
      fireEvent.change(screen.getByLabelText(/recipient name or department/i), {
        target: { value: 'Admin' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        const successElement = screen.getByLabelText('Success checkmark');
        expect(successElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Initial Values', () => {
    it('should prefill form with initial values', () => {
      render(
        <DeliveryDetailsStep
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          initialPlatform="Swiggy"
          initialRecipient="Dr. Patel"
        />
      );
      
      const platformInput = screen.getByLabelText(/or enter platform name/i) as HTMLInputElement;
      const recipientInput = screen.getByLabelText(/recipient name or department/i) as HTMLInputElement;
      
      expect(platformInput.value).toBe('Swiggy');
      expect(recipientInput.value).toBe('Dr. Patel');
    });

    it('should select matching chip for initial platform', () => {
      render(
        <DeliveryDetailsStep
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          initialPlatform="Amazon"
        />
      );
      
      const amazonChip = screen.getByLabelText('Amazon platform');
      expect(amazonChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should not select chip if initial platform does not match', () => {
      render(
        <DeliveryDetailsStep
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          initialPlatform="Custom Platform"
        />
      );
      
      COMMON_DELIVERY_PLATFORMS.forEach((chip) => {
        if (chip.label !== 'Others') {
          const chipElement = screen.getByLabelText(`${chip.label} platform`);
          expect(chipElement).toHaveAttribute('aria-checked', 'false');
        }
      });
    });
  });

  describe('Touch Targets', () => {
    it('should have minimum 44px height for chips', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const zomatoChip = screen.getByLabelText('Zomato platform');
      expect(zomatoChip).toHaveClass('min-h-[40px]');
    });

    it('should have minimum 48px height for inputs', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const platformInput = screen.getByLabelText(/or enter platform name/i);
      const recipientInput = screen.getByLabelText(/recipient name or department/i);
      
      expect(platformInput).toHaveClass('h-12');
      expect(recipientInput).toHaveClass('h-12');
    });

    it('should have minimum 48px height for buttons', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toHaveClass('min-h-[48px]');
    });
  });

  describe('Responsive Design', () => {
    it('should have max-width constraint', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const container = screen.getByTestId('delivery-details-step');
      expect(container).toHaveClass('max-w-[480px]');
    });

    it('should center container', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const container = screen.getByTestId('delivery-details-step');
      expect(container).toHaveClass('mx-auto');
    });

    it('should have flex-wrap for chips', () => {
      render(<DeliveryDetailsStep onSubmit={mockOnSubmit} onBack={mockOnBack} />);
      
      const chipContainer = screen.getByRole('group', { name: /platform selection/i });
      expect(chipContainer).toHaveClass('flex-wrap');
    });
  });
});
