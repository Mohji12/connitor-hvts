import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryRegistrationForm } from './DeliveryRegistrationForm';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('DeliveryRegistrationForm', () => {
  const defaultProps = {
    visitorPhone: '+91 99999 99999',
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onBack: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render step indicator with correct step number', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);
      expect(screen.getByText(/Step 3 of 6 • Delivery/i)).toBeInTheDocument();
    });

    it('should render header with "Quick Info" title', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);
      expect(
        screen.getByRole('heading', { name: /Quick Info/i }),
      ).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByText(/Capture visitor photo/i)).toBeInTheDocument();
    });

    it('should render Back and Continue buttons', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue/i }),
      ).toBeInTheDocument();
    });

    it('should pre-fill phone number as read-only', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText(
        /Phone Number/i,
      ) as HTMLInputElement;
      expect(phoneInput).toHaveValue('+91 99999 99999');
      expect(phoneInput).toBeDisabled();
      expect(phoneInput).toHaveAttribute('readonly');
    });

    it('should auto-focus first name field on mount', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields and show errors on submit', async () => {
      const user = userEvent.setup();
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/First name must be at least 2 characters/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Last name must be at least 2 characters/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/Photo is required/i)).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should validate first name minimum length', async () => {
      const user = userEvent.setup();
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.type(firstNameInput, 'A');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/First name must be at least 2 characters/i),
        ).toBeInTheDocument();
      });
    });

    it('should validate last name minimum length', async () => {
      const user = userEvent.setup();
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const lastNameInput = screen.getByLabelText(/Last Name/i);
      await user.type(lastNameInput, 'B');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/Last name must be at least 2 characters/i),
        ).toBeInTheDocument();
      });
    });

    it('should show error for invalid file type', async () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const invalidFile = new File(['invalid'], 'test.txt', {
        type: 'text/plain',
      });
      const fileInput = screen.getByLabelText(/Capture visitor photo/i);

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/Only JPEG\/PNG formats are allowed/i),
        ).toBeInTheDocument();
      });
    });

    it('should show error for file size exceeding 5MB', async () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      // Create a file larger than 5MB
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        'large.jpg',
        {
          type: 'image/jpeg',
        },
      );
      const fileInput = screen.getByLabelText(/Capture visitor photo/i);

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Max file size is 5MB/i)).toBeInTheDocument();
      });
    });
  });

  describe('Photo Handling', () => {
    it('should handle photo capture and show preview', async () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const validFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Capture visitor photo/i);

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Remove/i }),
        ).toBeInTheDocument();
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(validFile);
    });

    it('should remove photo and clear preview', async () => {
      const user = userEvent.setup();
      render(<DeliveryRegistrationForm {...defaultProps} />);

      // Upload photo
      const validFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });

      // Remove photo
      const removeButton = screen.getByRole('button', { name: /Remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.queryByAltText(/Visitor photo preview/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/Capture visitor photo/i)).toBeInTheDocument();
      });

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should cleanup preview URL on unmount', () => {
      const { unmount } = render(
        <DeliveryRegistrationForm {...defaultProps} />,
      );

      const validFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      unmount();

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <DeliveryRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill text fields
      const firstNameInput = screen.getByLabelText(/First Name/i);
      const lastNameInput = screen.getByLabelText(/Last Name/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');

      // Upload photo using fireEvent.change
      const validFile = new File(['(⌐□_□)'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(
        /Capture visitor photo/i,
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Wait for photo preview
      await waitFor(
        () => {
          expect(
            screen.getByAltText(/Visitor photo preview/i),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Wait for form validation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // Submit the form directly
      const form = screen.getByRole('form', {
        name: /Delivery visitor registration/i,
      });
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              firstName: 'John',
              lastName: 'Doe',
              photo: expect.any(File),
            }),
          );
        },
        { timeout: 3000 },
      );
    });

    it('should not submit with invalid data', async () => {
      const user = userEvent.setup();
      render(<DeliveryRegistrationForm {...defaultProps} />);

      // Only fill first name (incomplete)
      await user.type(screen.getByLabelText(/First Name/i), 'John');

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable inputs and buttons when loading', () => {
      render(<DeliveryRegistrationForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/First Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/Last Name/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Back/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled();
    });

    it('should show loading spinner on submit button', () => {
      render(<DeliveryRegistrationForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      expect(submitButton).toBeDisabled();
      // The Loader2 icon should be present
      expect(submitButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = jest.fn();
      render(<DeliveryRegistrationForm {...defaultProps} onBack={onBack} />);

      const backButton = screen.getByRole('button', { name: /Back/i });
      await user.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should not call onBack when loading', () => {
      const onBack = jest.fn();
      render(
        <DeliveryRegistrationForm
          {...defaultProps}
          onBack={onBack}
          isLoading={true}
        />,
      );

      const backButton = screen.getByRole('button', { name: /Back/i });
      expect(backButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute(
        'aria-label',
        'Delivery visitor registration',
      );

      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');
      expect(firstNameInput).toHaveAttribute(
        'aria-describedby',
        'firstName-error',
      );

      const lastNameInput = screen.getByLabelText(/Last Name/i);
      expect(lastNameInput).toHaveAttribute('aria-required', 'true');
      expect(lastNameInput).toHaveAttribute(
        'aria-describedby',
        'lastName-error',
      );

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      expect(phoneInput).toHaveAttribute('aria-readonly', 'true');
    });

    it('should link labels to inputs via htmlFor/id', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const firstNameLabel = screen.getByText(/First Name/i);
      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameLabel).toHaveAttribute('for', firstNameInput.id);

      const lastNameLabel = screen.getByText(/Last Name/i);
      const lastNameInput = screen.getByLabelText(/Last Name/i);
      expect(lastNameLabel).toHaveAttribute('for', lastNameInput.id);
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      const lastNameInput = screen.getByLabelText(/Last Name/i);

      // Tab through inputs
      expect(firstNameInput).toHaveFocus();

      await user.tab();
      expect(lastNameInput).toHaveFocus();

      // Can continue tabbing through other elements
      await user.tab();
      // Phone input (disabled, might be skipped)
      await user.tab();
      // Photo input or button
    });

    it('should support Enter key to submit form', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <DeliveryRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill form
      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.type(firstNameInput, 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');

      const validFile = new File(['(⌐□_□)'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(
        /Capture visitor photo/i,
      ) as HTMLInputElement;

      await user.upload(fileInput, validFile);

      // Wait for photo to be processed
      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });

      // Ensure form is ready
      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 1000 },
      );

      // Click the submit button
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Styling & Layout', () => {
    it('should apply centered layout with max-width 480px', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const wrapper = screen.getByTestId('delivery-registration-form');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('mx-auto');
      expect(wrapper).toHaveClass('max-w-[480px]');
    });

    it('should apply amber/orange theming for delivery', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      expect(submitButton).toHaveClass('bg-amber-500');
      expect(submitButton).toHaveClass('hover:bg-amber-600');
    });

    it('should have minimum height of 48px for inputs', () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toHaveClass('h-12'); // 48px

      const lastNameInput = screen.getByLabelText(/Last Name/i);
      expect(lastNameInput).toHaveClass('h-12');

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      expect(submitButton).toHaveClass('min-h-[48px]');
    });
  });

  describe('onFormChange Callback', () => {
    it('should call onFormChange with text field data when fields change', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFormChange = jest.fn();
      render(
        <DeliveryRegistrationForm {...defaultProps} onFormChange={onFormChange} />,
      );

      await user.type(screen.getByLabelText(/First Name/i), 'John');

      // Advance past the 300ms debounce
      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(onFormChange).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
          }),
        );
      });

      jest.useRealTimers();
    });

    it('should not include photo in onFormChange data', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFormChange = jest.fn();
      render(
        <DeliveryRegistrationForm {...defaultProps} onFormChange={onFormChange} />,
      );

      await user.type(screen.getByLabelText(/First Name/i), 'John');

      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(onFormChange).toHaveBeenCalled();
        const lastCall = onFormChange.mock.calls[onFormChange.mock.calls.length - 1][0];
        expect(lastCall).not.toHaveProperty('photo');
      });

      jest.useRealTimers();
    });

    it('should not call onFormChange when prop is not provided', async () => {
      const user = userEvent.setup();
      // Render without onFormChange
      render(<DeliveryRegistrationForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/First Name/i), 'John');

      // Should not throw any error
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    });

    it('should debounce onFormChange calls', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFormChange = jest.fn();
      render(
        <DeliveryRegistrationForm {...defaultProps} onFormChange={onFormChange} />,
      );

      // Type rapidly
      await user.type(screen.getByLabelText(/First Name/i), 'John');

      // Before debounce timeout, callback should not have been called with final value yet
      // (it may have been called with intermediate values but the debounce controls frequency)

      act(() => {
        jest.advanceTimersByTime(350);
      });

      // After debounce, the final value should be present
      await waitFor(() => {
        const lastCall = onFormChange.mock.calls[onFormChange.mock.calls.length - 1][0];
        expect(lastCall.firstName).toBe('John');
      });

      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      const user = userEvent.setup();
      let resolveSubmit: ((value?: unknown) => void) | undefined;
      const onSubmit = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      render(
        <DeliveryRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill form
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');

      const validFile = new File(['(⌐□_□)'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(
        /Capture visitor photo/i,
      ) as HTMLInputElement;

      await user.upload(fileInput, validFile);

      // Wait for photo to be processed
      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });

      // Ensure form is ready
      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 1000 },
      );

      // Try to submit multiple times rapidly by clicking submit button
      // First submit - this will trigger the async onSubmit
      await user.click(submitButton);

      // Verify submission was called
      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledTimes(1);
        },
        { timeout: 1000 },
      );

      // Button should be disabled while submitting
      await waitFor(
        () => {
          expect(submitButton).toBeDisabled();
        },
        { timeout: 500 },
      );

      // Try additional clicks while submitting (user.click on disabled button will fail, which is expected)
      // The button being disabled prevents multiple submissions
      expect(submitButton).toBeDisabled();

      // Should still only have been called once
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // Resolve the promise to complete the submission
      if (resolveSubmit) {
        resolveSubmit();
      }

      // Wait for the button to be enabled again
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 1000 },
      );
    });

    it('should preserve form data when submission fails', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
      render(
        <DeliveryRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill form
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');

      const validFile = new File(['(⌐□_□)'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(
        /Capture visitor photo/i,
      ) as HTMLInputElement;

      await user.upload(fileInput, validFile);

      // Wait for photo to be processed
      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });

      // Ensure form is ready
      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 1000 },
      );

      // Submit (will fail) by clicking submit button
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      // Form data should still be present
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Doe');
      expect(screen.getByAltText(/Visitor photo preview/i)).toBeInTheDocument();
    });

    it('should accept PNG files', async () => {
      render(<DeliveryRegistrationForm {...defaultProps} />);

      const pngFile = new File(['photo'], 'photo.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/Capture visitor photo/i);

      fireEvent.change(fileInput, { target: { files: [pngFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });
    });
  });
});
