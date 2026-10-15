import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import BookAppointmentPage from './page';
import { loadBookingDraft } from '@/features/book-appointment/booking-draft';
import { AppointmentService } from '@/lib/services/appointmentService';

const mockReplace = jest.fn();
let mockToken: string | null = 'token';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/lib/services/appointmentService', () => ({
  AppointmentService: { listPublicHospitals: jest.fn(), getSlotRequest: jest.fn() },
}));

jest.mock('@/lib/services/visitorPortalService', () => ({
  getVisitorToken: () => mockToken,
}));

jest.mock('@/components/ConnitorLoader', () => ({
  ConnitorLoader: ({ message }: { message?: string }) => <div>{message}</div>,
}));

jest.mock('@/features/book-appointment/BookAppointmentWizard', () => ({
  BookAppointmentWizard: ({
    initialBranchId,
    initialBranchName,
  }: {
    initialBranchId?: string;
    initialBranchName?: string;
  }) => (
    <div data-testid="wizard">
      {initialBranchId ?? 'none'}|{initialBranchName ?? 'none'}
    </div>
  ),
}));

const mockedSearchParams = useSearchParams as jest.Mock;
const mockedList = AppointmentService.listPublicHospitals as jest.Mock;
const mockedGetRequest = AppointmentService.getSlotRequest as jest.Mock;

function setParams(query: string): void {
  mockedSearchParams.mockReturnValue(new URLSearchParams(query));
}

describe('BookAppointmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue([
      {
        id: 'branch-1',
        name: 'Ovum Hospital — Kalyan Nagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        hospitalChainId: 'chain',
      },
    ]);
  });

  it('resolves a readable branch slug to the branch id', async () => {
    setParams('branch=ovum-hospital-kalyan-nagar');
    render(<BookAppointmentPage />);

    expect(await screen.findByTestId('wizard')).toHaveTextContent(
      'branch-1|Ovum Hospital — Kalyan Nagar',
    );
  });

  it('shows a not-found message for an unknown slug', async () => {
    setParams('branch=unknown-hospital');
    render(<BookAppointmentPage />);

    expect(await screen.findByText('Hospital not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose a hospital' }).getAttribute('href')).toMatch(
      /^\/book-appointment\/?$/,
    );
  });

  it('still accepts the old branchId link', () => {
    setParams('branchId=branch-9');
    render(<BookAppointmentPage />);

    expect(screen.getByTestId('wizard')).toHaveTextContent('branch-9|none');
    expect(mockedList).not.toHaveBeenCalled();
  });
});

describe('BookAppointmentPage with a slot request link', () => {
  const approved = {
    id: 'req-1',
    status: 'APPROVED',
    doctorId: 'doc-1',
    doctorName: 'Mohan Gola',
    branchId: 'branch-1',
    branchName: 'Kalyan Nagar',
    hospitalName: 'Ovum Hospital',
    departmentId: 'dept-1',
    departmentName: 'IVF',
    subDepartmentId: 'sub-1',
    requestedStart: '2026-10-20T11:00:00',
    date: '2026-10-20',
    time: '11:00',
    purpose: 'Follow-up consultation',
    slotId: 'slot-9',
    slotBooked: false,
    createdAt: null,
    decidedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'token';
    window.sessionStorage.clear();
  });

  it('sends signed-out visitors to login and back', () => {
    mockToken = null;
    setParams('slotRequest=req-1');
    render(<BookAppointmentPage />);

    expect(mockReplace).toHaveBeenCalledWith(
      `/visitor/login?returnTo=${encodeURIComponent('/book-appointment/?slotRequest=req-1')}`,
    );
    expect(mockedGetRequest).not.toHaveBeenCalled();
  });

  it('opens an approved request in the wizard with the reserved slot', async () => {
    mockedGetRequest.mockResolvedValue(approved);
    setParams('slotRequest=req-1');
    render(<BookAppointmentPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/book-appointment/?branchId=branch-1&branchName=Kalyan+Nagar&resume=1',
      ),
    );
    expect(loadBookingDraft()).toMatchObject({
      doctorId: 'doc-1',
      appointmentDate: '2026-10-20',
      slotId: 'slot-9',
      purpose: 'Follow-up consultation',
      resumeStep: '5A',
    });
  });

  it('explains when the doctor has not confirmed yet', async () => {
    mockedGetRequest.mockResolvedValue({ ...approved, status: 'PENDING', slotId: null });
    setParams('slotRequest=req-1');
    render(<BookAppointmentPage />);

    expect(await screen.findByText('Waiting for the doctor')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
