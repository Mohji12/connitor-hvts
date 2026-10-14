import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuestBookingDetails, type GuestDocuments } from './GuestBookingDetails';
import { GuestBookingService, type GuestVerification } from '@/lib/services/appointmentService';

jest.mock('@/lib/services/appointmentService', () => ({
  GuestBookingService: {
    sendCode: jest.fn(),
    verifyCode: jest.fn(),
  },
}));

global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

const mocked = GuestBookingService as jest.Mocked<typeof GuestBookingService>;

function Harness() {
  const [phone, setPhone] = React.useState('');
  const [verification, setVerification] = React.useState<GuestVerification | null>(null);
  const [documents, setDocuments] = React.useState<GuestDocuments>({ photo: null, governmentId: null });
  return (
    <GuestBookingDetails
      branchId="branch-1"
      phone={phone}
      onPhoneChange={setPhone}
      verification={verification}
      onVerified={setVerification}
      documents={documents}
      onDocumentsChange={setDocuments}
    />
  );
}

describe('GuestBookingDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('verifies the phone by WhatsApp code before asking for photo and ID', async () => {
    mocked.sendCode.mockResolvedValue({ message: 'Code sent on WhatsApp.' });
    mocked.verifyCode.mockResolvedValue({
      guestToken: 'tok',
      expiresInMinutes: 30,
      hasPhoto: false,
      hasGovernmentId: false,
    });
    render(<Harness />);

    expect(screen.queryByLabelText('Upload your photo')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mobile number/i), { target: { value: '98765 43210' } });
    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp code/i }));
    await waitFor(() => expect(mocked.sendCode).toHaveBeenCalledWith('9876543210', 'branch-1'));

    fireEvent.change(await screen.findByLabelText('WhatsApp code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));
    await waitFor(() => expect(mocked.verifyCode).toHaveBeenCalledWith('9876543210', 'branch-1', '123456'));

    expect(await screen.findByText(/Number verified/i)).toBeInTheDocument();
    const photoInput = screen.getByLabelText('Upload your photo');
    expect(screen.getByLabelText('Upload government ID')).toBeInTheDocument();

    const photo = new File(['x'], 'me.jpg', { type: 'image/jpeg' });
    fireEvent.change(photoInput, { target: { files: [photo] } });
    expect(await screen.findByText('me.jpg')).toBeInTheDocument();
  });

  it('rejects a photo that is not an image', async () => {
    mocked.sendCode.mockResolvedValue({ message: 'sent' });
    mocked.verifyCode.mockResolvedValue({
      guestToken: 'tok',
      expiresInMinutes: 30,
      hasPhoto: false,
      hasGovernmentId: false,
    });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/Mobile number/i), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Send WhatsApp code/i }));
    fireEvent.change(await screen.findByLabelText('WhatsApp code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

    const photoInput = await screen.findByLabelText('Upload your photo');
    fireEvent.change(photoInput, { target: { files: [new File(['x'], 'id.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(/Photo must be a JPG, PNG or WebP image/i)).toBeInTheDocument();
  });
});
