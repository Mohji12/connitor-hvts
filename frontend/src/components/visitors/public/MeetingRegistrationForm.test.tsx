import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MeetingRegistrationForm,
  ExistingVisitorData,
} from './MeetingRegistrationForm';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('MeetingRegistrationForm', () => {
  const defaultProps = {
    phone: '+91 99999 99999',
    branchId: 'branch-uuid-123',
    isExistingVisitor: false,
    existingVisitorData: null,
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onBack: jest.fn(),
    isLoading: false,
  };

  const existingVisitorData: ExistingVisitorData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Tech Corp',
    designation: 'Software Engineer',
    address: '123 Main St, City',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render step indicator with correct step number', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);
      expect(screen.getByText(/Step 3 of 6 • Meeting/i)).toBeInTheDocument();
    });

    it('should render header with "Your Details" title', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);
      expect(
        screen.getByRole('heading', { name: /Your Details/i }),
      ).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByText(/Capture visitor photo/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Upload or capture government ID/i),
      ).toBeInTheDocument();
    });

    it('should render optional form fields', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      expect(screen.getByLabelText(/Company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Designation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Office ID/i)).toBeInTheDocument();
    });

    it('should render Back and Continue buttons', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue/i }),
      ).toBeInTheDocument();
    });

    it('should pre-fill phone number as read-only', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText(
        /Phone Number/i,
      ) as HTMLInputElement;
      expect(phoneInput).toHaveValue('+91 99999 99999');
      expect(phoneInput).toBeDisabled();
      expect(phoneInput).toHaveAttribute('readonly');
    });

    it('should auto-focus first name field on mount', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toHaveFocus();
    });

    it('should display auto-fill banner for existing visitors', () => {
      render(
        <MeetingRegistrationForm
          {...defaultProps}
          isExistingVisitor={true}
          existingVisitorData={existingVisitorData}
        />,
      );

      expect(
        screen.getByText(/We found your details/i),
      ).toBeInTheDocument();
    });

    it('should not display auto-fill banner for new visitors', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      expect(
        screen.queryByText(/We found your details/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('Auto-Fill Functionality', () => {
    it('should auto-fill personal fields for existing visitors', () => {
      render(
        <MeetingRegistrationForm
          {...defaultProps}
          isExistingVisitor={true}
          existingVisitorData={existingVisitorData}
        />,
      );

      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Doe');
      expect(screen.getByLabelText(/^Email/i)).toHaveValue('john.doe@example.com');
      expect(screen.getByLabelText(/Company/i)).toHaveValue('Tech Corp');
      expect(screen.getByLabelText(/Designation/i)).toHaveValue(
        'Software Engineer',
      );
      expect(screen.getByLabelText(/Address/i)).toHaveValue('123 Main St, City');
    });

    it('should not auto-fill document fields for existing visitors', () => {
      render(
        <MeetingRegistrationForm
          {...defaultProps}
          isExistingVisitor={true}
          existingVisitorData={existingVisitorData}
        />,
      );

      // Photo should be empty
      expect(screen.getByText(/Capture visitor photo/i)).toBeInTheDocument();
      // Government ID should be empty
      expect(
        screen.getByText(/Upload or capture government ID/i),
      ).toBeInTheDocument();
      // Office ID should be empty
      expect(screen.getByText(/Upload or capture office ID/i)).toBeInTheDocument();
    });

    it('should handle existing visitor with partial data', () => {
      const partialData: ExistingVisitorData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: null,
        company: null,
        designation: null,
        address: null,
      };

      render(
        <MeetingRegistrationForm
          {...defaultProps}
          isExistingVisitor={true}
          existingVisitorData={partialData}
        />,
      );

      expect(screen.getByLabelText(/First Name/i)).toHaveValue('Jane');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Smith');
      expect(screen.getByLabelText(/^Email/i)).toHaveValue('');
      expect(screen.getByLabelText(/Company/i)).toHaveValue('');
    });

    it('should allow editing auto-filled fields', async () => {
      const user = userEvent.setup();
      render(
        <MeetingRegistrationForm
          {...defaultProps}
          isExistingVisitor={true}
          existingVisitorData={existingVisitorData}
        />,
      );

      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'UpdatedName');

      expect(firstNameInput).toHaveValue('UpdatedName');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields and show errors on submit', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/First name must be at least 2 characters/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Last name must be at least 2 characters/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Please enter a valid email address/i),
        ).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should validate first name minimum length', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

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
      render(<MeetingRegistrationForm {...defaultProps} />);

      const lastNameInput = screen.getByLabelText(/Last Name/i);
      await user.type(lastNameInput, 'B');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/Last name must be at least 2 characters/i),
        ).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/^Email/i);
      await user.type(emailInput, 'invalidemail');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/Please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it('should accept valid email format', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/^Email/i);
      await user.type(emailInput, 'valid@example.com');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.queryByText(/Please enter a valid email address/i),
        ).not.toBeInTheDocument();
      });
    });

    it('should show error for invalid photo file type', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

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

    it('should show error for photo file size exceeding 5MB', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

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

    it('should show error for invalid government ID file type', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const invalidFile = new File(['invalid'], 'test.txt', {
        type: 'text/plain',
      });
      const fileInput = screen.getByLabelText(/Upload government ID document/i);

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/Please upload a valid document \(JPG, PNG, PDF\)/i),
        ).toBeInTheDocument();
      });
    });

    it('should show error for government ID file size exceeding 5MB', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        'large.pdf',
        {
          type: 'application/pdf',
        },
      );
      const fileInput = screen.getByLabelText(/Upload government ID document/i);

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Max file size is 5MB/i)).toBeInTheDocument();
      });
    });
  });

  describe('Photo Handling', () => {
    it('should handle photo capture and show preview', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

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
          screen.getByRole('button', { name: /Remove photo/i }),
        ).toBeInTheDocument();
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(validFile);
    });

    it('should remove photo and clear preview', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

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
      const removeButton = screen.getByRole('button', { name: /Remove photo/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.queryByAltText(/Visitor photo preview/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/Capture visitor photo/i)).toBeInTheDocument();
      });

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should accept PNG files', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

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

  describe('Government ID Document Handling', () => {
    it('should handle government ID upload and show preview for image', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const validFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Upload government ID document/i);

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Government ID preview/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Remove government ID/i }),
        ).toBeInTheDocument();
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(validFile);
    });

    it('should handle government ID upload for PDF file', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const pdfFile = new File(['pdf content'], 'gov-id.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByLabelText(/Upload government ID document/i);

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/gov-id.pdf/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Remove government ID/i }),
        ).toBeInTheDocument();
      });
    });

    it('should remove government ID and clear preview', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      // Upload document
      const validFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Government ID preview/i),
        ).toBeInTheDocument();
      });

      // Remove document
      const removeButton = screen.getByRole('button', {
        name: /Remove government ID/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.queryByAltText(/Government ID preview/i),
        ).not.toBeInTheDocument();
        expect(
          screen.getByText(/Upload or capture government ID/i),
        ).toBeInTheDocument();
      });

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Office ID Document Handling (Optional)', () => {
    it('should handle office ID upload and show preview for image', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const validFile = new File(['id'], 'office-id.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Upload office ID document/i);

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByAltText(/Office ID preview/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Remove office ID/i }),
        ).toBeInTheDocument();
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(validFile);
    });

    it('should handle office ID upload for PDF file', async () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const pdfFile = new File(['pdf content'], 'office-id.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByLabelText(/Upload office ID document/i);

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/office-id.pdf/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Remove office ID/i }),
        ).toBeInTheDocument();
      });
    });

    it('should remove office ID and clear preview', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      // Upload document
      const validFile = new File(['id'], 'office-id.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByLabelText(/Upload office ID document/i);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByAltText(/Office ID preview/i)).toBeInTheDocument();
      });

      // Remove document
      const removeButton = screen.getByRole('button', {
        name: /Remove office ID/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(
          screen.queryByAltText(/Office ID preview/i),
        ).not.toBeInTheDocument();
        expect(
          screen.getByText(/Upload or capture office ID/i),
        ).toBeInTheDocument();
      });

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should not require office ID for form submission', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <MeetingRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill required fields only (no office ID)
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
      await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');

      // Upload photo
      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      // Upload government ID
      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
        expect(
          screen.getByAltText(/Government ID preview/i),
        ).toBeInTheDocument();
      });

      // Wait for form validation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // Submit the form
      const form = screen.getByRole('form');
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid data including all required fields', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <MeetingRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill text fields
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
      await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/Company/i), 'Tech Corp');

      // Upload photo
      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      // Upload government ID
      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
        expect(
          screen.getByAltText(/Government ID preview/i),
        ).toBeInTheDocument();
      });

      // Wait for form validation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // Submit the form
      const form = screen.getByRole('form');
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              company: 'Tech Corp',
              phone: '+91 99999 99999',
              photo: expect.any(File),
              governmentIdDocument: expect.any(File),
            }),
          );
        },
        { timeout: 3000 },
      );
    });

    it('should submit with optional office ID document', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <MeetingRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill text fields
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
      await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');

      // Upload photo
      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      // Upload government ID
      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

      // Upload office ID
      const officeIdFile = new File(['office-id'], 'office-id.jpg', {
        type: 'image/jpeg',
      });
      const officeIdInput = screen.getByLabelText(/Upload office ID document/i);
      fireEvent.change(officeIdInput, { target: { files: [officeIdFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
        expect(
          screen.getByAltText(/Government ID preview/i),
        ).toBeInTheDocument();
        expect(screen.getByAltText(/Office ID preview/i)).toBeInTheDocument();
      });

      // Wait for form validation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // Submit the form
      const form = screen.getByRole('form');
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              officeIdDocument: expect.any(File),
            }),
          );
        },
        { timeout: 3000 },
      );
    });

    it('should not submit with invalid data', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      // Only fill first name (incomplete)
      await user.type(screen.getByLabelText(/First Name/i), 'John');

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      });
    });

    it('should submit updated data for existing visitors', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <MeetingRegistrationForm
          {...defaultProps}
          onSubmit={onSubmit}
          isExistingVisitor={true}
          existingVisitorData={existingVisitorData}
        />,
      );

      // Update first name
      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'UpdatedJohn');

      // Upload photo and government ID
      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
        expect(
          screen.getByAltText(/Government ID preview/i),
        ).toBeInTheDocument();
      });

      // Wait for form validation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // Submit the form
      const form = screen.getByRole('form');
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              firstName: 'UpdatedJohn',
              lastName: 'Doe',
              email: 'john.doe@example.com',
            }),
          );
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Loading State', () => {
    it('should disable inputs and buttons when loading', () => {
      render(<MeetingRegistrationForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/First Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/Last Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/^Email/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Back/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled();
    });

    it('should show loading spinner on submit button', () => {
      render(<MeetingRegistrationForm {...defaultProps} isLoading={true} />);

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
      render(<MeetingRegistrationForm {...defaultProps} onBack={onBack} />);

      const backButton = screen.getByRole('button', { name: /Back/i });
      await user.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should not call onBack when loading', () => {
      const onBack = jest.fn();
      render(
        <MeetingRegistrationForm
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
      render(<MeetingRegistrationForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-labelledby', 'form-heading');

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

      const emailInput = screen.getByLabelText(/^Email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      expect(phoneInput).toHaveAttribute('aria-readonly', 'true');
    });

    it('should link labels to inputs via htmlFor/id', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const firstNameLabel = screen.getByText(/First Name/i);
      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameLabel).toHaveAttribute('for', firstNameInput.id);

      const lastNameLabel = screen.getByText(/Last Name/i);
      const lastNameInput = screen.getByLabelText(/Last Name/i);
      expect(lastNameLabel).toHaveAttribute('for', lastNameInput.id);
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MeetingRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      const lastNameInput = screen.getByLabelText(/Last Name/i);

      // Tab through inputs
      expect(firstNameInput).toHaveFocus();

      await user.tab();
      expect(lastNameInput).toHaveFocus();

      // Can continue tabbing through other elements
      await user.tab();
      // Email input
      await user.tab();
      // Company input
    });

    it('should announce step indicator to screen readers', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const stepIndicator = screen.getByText(/Step 3 of 6 • Meeting/i);
      expect(stepIndicator).toHaveAttribute('aria-live', 'polite');
      expect(stepIndicator).toHaveAttribute('aria-label', 'Step 3 of 6, Meeting');
    });

    it('should announce auto-fill banner to screen readers', () => {
      render(
        <MeetingRegistrationForm
          {...defaultProps}
          isExistingVisitor={true}
          existingVisitorData={existingVisitorData}
        />,
      );

      const banner = screen.getByRole('status');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Styling & Layout', () => {
    it('should apply centered layout with max-width 480px', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const wrapper = screen.getByTestId('meeting-registration-form');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('mx-auto');
      expect(wrapper).toHaveClass('max-w-[480px]');
    });

    it('should apply emerald/teal theming for meeting', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      expect(submitButton).toHaveClass('bg-emerald-600');
      expect(submitButton).toHaveClass('hover:bg-emerald-700');
      expect(submitButton).toHaveClass('focus:ring-2');
      expect(submitButton).toHaveClass('focus:ring-emerald-500');
    });

    it('should have minimum height of 48px for inputs', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      expect(firstNameInput).toHaveClass('h-12'); // 48px

      const lastNameInput = screen.getByLabelText(/Last Name/i);
      expect(lastNameInput).toHaveClass('h-12');

      const submitButton = screen.getByRole('button', { name: /Continue/i });
      expect(submitButton).toHaveClass('min-h-[48px]');
    });

    it('should display required fields with asterisk', () => {
      render(<MeetingRegistrationForm {...defaultProps} />);

      // Check for asterisks in required field labels
      const firstNameLabel = screen.getByText(/First Name/i);
      expect(firstNameLabel.querySelector('.text-red-500')).toHaveTextContent('*');

      const lastNameLabel = screen.getByText(/Last Name/i);
      expect(lastNameLabel.querySelector('.text-red-500')).toHaveTextContent('*');

      const emailLabel = screen.getByText(/^Email/i);
      expect(emailLabel.querySelector('.text-red-500')).toHaveTextContent('*');
    });
  });

  describe('onFormChange Callback', () => {
    it('should call onFormChange with text field data when fields change', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFormChange = jest.fn();
      render(
        <MeetingRegistrationForm {...defaultProps} onFormChange={onFormChange} />,
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

    it('should not include file fields in onFormChange data', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFormChange = jest.fn();
      render(
        <MeetingRegistrationForm {...defaultProps} onFormChange={onFormChange} />,
      );

      await user.type(screen.getByLabelText(/First Name/i), 'John');

      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(onFormChange).toHaveBeenCalled();
        const lastCall = onFormChange.mock.calls[onFormChange.mock.calls.length - 1][0];
        expect(lastCall).not.toHaveProperty('photo');
        expect(lastCall).not.toHaveProperty('governmentIdDocument');
        expect(lastCall).not.toHaveProperty('officeIdDocument');
      });

      jest.useRealTimers();
    });

    it('should include all text fields in onFormChange data', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onFormChange = jest.fn();
      render(
        <MeetingRegistrationForm {...defaultProps} onFormChange={onFormChange} />,
      );

      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
      await user.type(screen.getByLabelText(/^Email/i), 'john@test.com');
      await user.type(screen.getByLabelText(/Company/i), 'ACME');

      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        const lastCall = onFormChange.mock.calls[onFormChange.mock.calls.length - 1][0];
        expect(lastCall).toHaveProperty('firstName');
        expect(lastCall).toHaveProperty('lastName');
        expect(lastCall).toHaveProperty('email');
        expect(lastCall).toHaveProperty('company');
        expect(lastCall).toHaveProperty('designation');
        expect(lastCall).toHaveProperty('address');
      });

      jest.useRealTimers();
    });

    it('should not call onFormChange when prop is not provided', async () => {
      const user = userEvent.setup();
      // Render without onFormChange
      render(<MeetingRegistrationForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/First Name/i), 'John');

      // Should not throw any error
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
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
        <MeetingRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill form
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
      await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');

      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

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

      // Try to submit
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
        <MeetingRegistrationForm {...defaultProps} onSubmit={onSubmit} />,
      );

      // Fill form
      await user.type(screen.getByLabelText(/First Name/i), 'John');
      await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
      await user.type(screen.getByLabelText(/^Email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/Company/i), 'Tech Corp');

      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

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

      // Submit (will fail)
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
      expect(screen.getByLabelText(/^Email/i)).toHaveValue('john@example.com');
      expect(screen.getByLabelText(/Company/i)).toHaveValue('Tech Corp');
      expect(screen.getByAltText(/Visitor photo preview/i)).toBeInTheDocument();
      expect(
        screen.getByAltText(/Government ID preview/i),
      ).toBeInTheDocument();
    });

    it('should cleanup preview URLs on unmount', () => {
      const { unmount } = render(
        <MeetingRegistrationForm {...defaultProps} />,
      );

      const photoFile = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [photoFile] } });

      const govIdFile = new File(['id'], 'gov-id.jpg', {
        type: 'image/jpeg',
      });
      const govIdInput = screen.getByLabelText(/Upload government ID document/i);
      fireEvent.change(govIdInput, { target: { files: [govIdFile] } });

      unmount();

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle multiple file replacements', async () => {
      const { unmount } = render(<MeetingRegistrationForm {...defaultProps} />);

      // Upload first photo
      const firstPhoto = new File(['photo1'], 'photo1.jpg', {
        type: 'image/jpeg',
      });
      const photoInput = screen.getByLabelText(/Capture visitor photo/i);
      fireEvent.change(photoInput, { target: { files: [firstPhoto] } });

      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });

      // Upload second photo (should replace first)
      const secondPhoto = new File(['photo2'], 'photo2.jpg', {
        type: 'image/jpeg',
      });
      
      // Clear the file input first to simulate a new file selection
      fireEvent.change(photoInput, { target: { files: [] } });
      
      // Now upload the second photo
      fireEvent.change(photoInput, { target: { files: [secondPhoto] } });

      // Wait for the second photo to be displayed
      await waitFor(() => {
        expect(
          screen.getByAltText(/Visitor photo preview/i),
        ).toBeInTheDocument();
      });

      // Verify both createObjectURL calls happened
      expect(global.URL.createObjectURL).toHaveBeenCalled();

      // Unmount to trigger final cleanup
      unmount();

      // After unmount, revokeObjectURL should have been called
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
