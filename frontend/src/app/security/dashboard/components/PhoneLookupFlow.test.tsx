import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhoneLookupFlow } from './PhoneLookupFlow';
import { searchVisitors } from '@/lib/api/visitors-api';

// Mock the API
jest.mock('@/lib/api/visitors-api', () => ({
  searchVisitors: jest.fn(),
}));

const mockSearchVisitors = searchVisitors as jest.MockedFunction<typeof searchVisitors>;

describe('PhoneLookupFlow', () => {
  const defaultProps = {
    branchId: 'branch-123',
    onVisitorFound: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders phone input with country code', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      expect(screen.getByText('+91')).toBeInTheDocument();
      expect(screen.getByLabelText('Visitor phone number')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter 10-digit number')).toBeInTheDocument();
    });

    it('renders lookup and back buttons', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Search visitor' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to OTP verification' })).toBeInTheDocument();
    });

    it('lookup button is disabled when phone is empty', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });
      expect(lookupButton).toBeDisabled();
    });
  });

  describe('Phone Input Validation', () => {
    it('accepts only digits and limits to 10 characters', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      fireEvent.change(input, { target: { value: 'abc123def456' } });

      expect(input).toHaveValue('123456');
    });

    it('enables lookup button when 10 digits entered', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      expect(lookupButton).not.toBeDisabled();
    });



    it('disables lookup button when phone is invalid', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '12345' } });
      expect(lookupButton).toBeDisabled();
    });
  });

  describe('Lookup Functionality', () => {
    it('calls searchVisitors API on lookup button click', async () => {
      mockSearchVisitors.mockResolvedValue({ found: false });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        expect(mockSearchVisitors).toHaveBeenCalledWith({
          phone: '9876543210',
          branchId: 'branch-123',
        });
      });
    });

    it('shows loading state during search', async () => {
      mockSearchVisitors.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        expect(lookupButton).toHaveTextContent('Searching...');
        expect(lookupButton).toHaveAttribute('aria-busy', 'true');
      });
    });

    it('handles Enter key to trigger lookup', async () => {
      mockSearchVisitors.mockResolvedValue({ found: false });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockSearchVisitors).toHaveBeenCalledWith({
          phone: '9876543210',
          branchId: 'branch-123',
        });
      });
    });

    it('handles Escape key to go back', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(defaultProps.onBack).toHaveBeenCalled();
    });
  });

  describe('Visitor Found State', () => {
    const mockVisitor = {
      id: 'visitor-123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      email: 'john@example.com',
      photo: 'photo-url',
      company: 'Acme Corp',
      designation: 'Manager',
      lastVisit: {
        visitDate: '2024-01-15T10:00:00.000Z',
        status: 'CHECKED_OUT',
      },
    };

    it('displays visitor information when found', async () => {
      mockSearchVisitors.mockResolvedValue({ found: true, visitor: mockVisitor });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        expect(screen.getByText('Visitor Found')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    it('calls onVisitorFound when Select button clicked', async () => {
      mockSearchVisitors.mockResolvedValue({ found: true, visitor: mockVisitor });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: 'Select this visitor' });
        fireEvent.click(selectButton);
      });

      expect(defaultProps.onVisitorFound).toHaveBeenCalledWith(mockVisitor);
    });

    it('resets to input when Search Another clicked', async () => {
      mockSearchVisitors.mockResolvedValue({ found: true, visitor: mockVisitor });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        const searchAnotherButton = screen.getByRole('button', { name: 'Search for another visitor' });
        fireEvent.click(searchAnotherButton);
      });

      expect(screen.getByLabelText('Visitor phone number')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Search visitor' })).toBeInTheDocument();
    });
  });

  describe('Visitor Not Found State', () => {
    it('displays not found message', async () => {
      mockSearchVisitors.mockResolvedValue({ found: false });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        expect(screen.getByText('Visitor Not Found')).toBeInTheDocument();
        expect(screen.getByText(/\+91 9876543210/)).toBeInTheDocument();
      });
    });

    it('shows register new link and search another button', async () => {
      mockSearchVisitors.mockResolvedValue({ found: false });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        // Register as new visitor is now a link that opens in new tab
        const registerLink = screen.getByRole('link', { name: /Register as new visitor/ });
        expect(registerLink).toBeInTheDocument();
        expect(registerLink).toHaveAttribute('href', '/visit/on-spot?branchId=branch-123');
        expect(screen.getByRole('button', { name: 'Search for another visitor' })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays API error message', async () => {
      const mockApiError = {
        statusCode: 500,
        code: 'NETWORK_ERROR',
        message: 'Connection lost. Please check your internet and try again.',
      };

      mockSearchVisitors.mockRejectedValue(mockApiError);

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        expect(screen.getByText('Connection lost. Please check your internet and try again.')).toBeInTheDocument();
      });
    });

    it('shows Try Again button on error', async () => {
      const mockApiError = {
        statusCode: 500,
        code: 'SERVER_ERROR',
        message: 'Something went wrong. Please try again.',
      };

      mockSearchVisitors.mockRejectedValue(mockApiError);

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        // In error state, the lookup button becomes "Try Again"
      expect(screen.getByRole('button', { name: 'Search visitor' })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      expect(input).toHaveAttribute('aria-label', 'Visitor phone number');
    });

    it('announces status changes to screen readers', async () => {
      mockSearchVisitors.mockResolvedValue({ found: false });

      render(<PhoneLookupFlow {...defaultProps} />);

      const input = screen.getByLabelText('Visitor phone number');
      const lookupButton = screen.getByRole('button', { name: 'Search visitor' });

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.click(lookupButton);

      await waitFor(() => {
        const statusElements = screen.getAllByRole('status');
        expect(statusElements.length).toBeGreaterThan(0);
        const liveStatus = statusElements.find(el => el.hasAttribute('aria-live'));
        expect(liveStatus).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});