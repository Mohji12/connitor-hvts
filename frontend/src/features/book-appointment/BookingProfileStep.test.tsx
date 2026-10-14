import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingProfileStep } from './BookingProfileStep';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

jest.mock('@/features/visitor-pre-registration/api/visitorAccountService', () => ({
  VisitorAccountApi: {
    createDraft: jest.fn(),
    updateProfessional: jest.fn(),
    uploadPhoto: jest.fn(),
    uploadGovernmentId: jest.fn(),
    setPassword: jest.fn(),
    sendPhoneOtp: jest.fn(),
    verifyPhone: jest.fn(),
  },
}));

jest.mock('@/lib/services/visitorAuthService', () => ({
  VisitorAuthService: { login: jest.fn() },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

global.URL.createObjectURL = jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = jest.fn();

const api = VisitorAccountApi as jest.Mocked<typeof VisitorAccountApi>;
const auth = VisitorAuthService as jest.Mocked<typeof VisitorAuthService>;

function type(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillForm() {
  type('First name', 'Asha');
  type('Last name', 'Rao');
  type(/Mobile number/i, '9876543210');
  type('Email', 'asha@example.com');
  type('Company', 'Acme');
  type('Job title', 'Engineer');
  fireEvent.change(screen.getByLabelText('Upload your photo'), {
    target: { files: [new File(['p'], 'me.jpg', { type: 'image/jpeg' })] },
  });
  fireEvent.change(screen.getByLabelText('Upload government ID'), {
    target: { files: [new File(['i'], 'id.pdf', { type: 'application/pdf' })] },
  });
  type('Password', 'Secret123');
  type('Confirm password', 'Secret123');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Accept terms' }));
}

describe('BookingProfileStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the typed name on the profile card', () => {
    render(<BookingProfileStep onVerified={jest.fn()} />);
    type('First name', 'Asha');
    type('Last name', 'Rao');
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
  });

  it('creates the profile, verifies the phone, signs in and continues', async () => {
    api.createDraft.mockResolvedValue({ accountId: 'acc-1', profileStatus: 'DRAFT' });
    api.updateProfessional.mockResolvedValue({ accountId: 'acc-1', profileStatus: 'PENDING_VERIFICATION' });
    api.uploadPhoto.mockResolvedValue({ photoStorageKey: 'k' });
    api.uploadGovernmentId.mockResolvedValue({ storageKey: 'k2', govtIdType: 'AADHAAR' });
    api.setPassword.mockResolvedValue({ message: 'ok' });
    api.sendPhoneOtp.mockResolvedValue({ message: 'sent', testOtp: '123456' });
    api.verifyPhone.mockResolvedValue({ message: 'ok', phoneVerified: true, activated: true });
    auth.login.mockResolvedValue({ access_token: 't', token_type: 'bearer', accountId: 'acc-1', name: 'Asha Rao' });
    const onVerified = jest.fn();

    render(<BookingProfileStep onVerified={onVerified} />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Verify phone and continue/i }));

    const otpInput = await screen.findByLabelText('WhatsApp code');
    expect(api.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '9876543210', email: 'asha@example.com' }),
    );
    expect(api.uploadPhoto).toHaveBeenCalledWith('acc-1', expect.any(File));
    expect(api.uploadGovernmentId).toHaveBeenCalledWith('acc-1', expect.any(File), 'AADHAAR', undefined);
    expect(api.setPassword).toHaveBeenCalledWith('acc-1', 'Secret123', true);
    expect(api.sendPhoneOtp).toHaveBeenCalledWith('acc-1');
    expect(screen.getByText(/Test code: 123456/)).toBeInTheDocument();

    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith({
        firstName: 'Asha',
        lastName: 'Rao',
        phone: '9876543210',
        email: 'asha@example.com',
      }),
    );
    expect(api.verifyPhone).toHaveBeenCalledWith('acc-1', '123456');
    expect(auth.login).toHaveBeenCalledWith('9876543210', 'Secret123');
  });

  it('offers sign in when the phone or email already has a profile', async () => {
    api.createDraft.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'This phone is already registered. Please log in.' } },
    });
    render(<BookingProfileStep onVerified={jest.fn()} />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Verify phone and continue/i }));

    expect(await screen.findByText(/already has a profile/i)).toBeInTheDocument();
    expect(api.updateProfessional).not.toHaveBeenCalled();
  });

  it('requires a photo and government ID', async () => {
    render(<BookingProfileStep onVerified={jest.fn()} />);
    type('First name', 'Asha');
    type('Last name', 'Rao');
    type(/Mobile number/i, '9876543210');
    type('Email', 'asha@example.com');
    type('Company', 'Acme');
    type('Job title', 'Engineer');
    type('Password', 'Secret123');
    type('Confirm password', 'Secret123');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept terms' }));
    fireEvent.click(screen.getByRole('button', { name: /Verify phone and continue/i }));

    expect(await screen.findByText(/Add your photo/i)).toBeInTheDocument();
    expect(api.createDraft).not.toHaveBeenCalled();
  });
});
