import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BookAppointmentWizard } from './BookAppointmentWizard';
import { saveBookingDraft, loadBookingDraft, type BookingDraft } from './booking-draft';
import { AppointmentService } from '@/lib/services/appointmentService';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/book-appointment/',
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock('@/lib/services/appointmentService', () => ({
  AppointmentService: {
    listPublicDepartments: jest.fn().mockResolvedValue([]),
    listDoctorSlots: jest.fn(),
    listAvailableDates: jest.fn().mockResolvedValue([]),
    joinSlotWaitlist: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/visitor-booking-profile', () => ({
  fetchVisitorBookingIdentity: jest.fn().mockResolvedValue({
    firstName: 'Asha',
    lastName: 'K',
    phone: '9876543210',
    email: 'asha@example.com',
  }),
}));

jest.mock('@/lib/services/visitorPortalService', () => ({
  getVisitorToken: () => 'token',
}));

jest.mock('@/lib/services/visitorAuthService', () => ({
  VisitorAuthService: { hasValidSession: jest.fn().mockResolvedValue(true) },
}));

jest.mock('@/features/visitor-wallet/VisitPaymentChoice', () => ({
  VisitPaymentChoice: () => <div>Payment options</div>,
}));

const mockedSlots = AppointmentService.listDoctorSlots as jest.Mock;
const mockedWaitlist = AppointmentService.joinSlotWaitlist as jest.Mock;

const draft: BookingDraft = {
  branchId: 'branch-1',
  branchName: 'Ovum Hospital — Kalyan Nagar',
  departmentId: 'dept-1',
  subDepartmentId: 'sub-1',
  doctorId: 'doc-1',
  selectedDoctor: {
    id: 'doc-1',
    name: 'Dr. Rao',
    department: null,
    location: null,
  } as BookingDraft['selectedDoctor'],
  appointmentDate: '2026-10-20',
  slotId: 'slot-1',
  requestCustomSlot: false,
  preferredTime: '10:00',
  purpose: 'Follow-up consultation',
  itemsCarrying: 'Nothing',
  appointmentMode: 'IN_PERSON',
  visitorType: 'GENERAL',
  companyName: '',
  companyEmail: '',
  firstName: 'Asha',
  lastName: 'K',
  phone: '9876543210',
  email: 'asha@example.com',
  profileCreatedHere: true,
};

describe('BookAppointmentWizard resume after recharge', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    saveBookingDraft(draft);
    window.history.replaceState(null, '', '/book-appointment/?branchId=branch-1&resume=1');
  });

  it('reopens the payment step with the saved slot', async () => {
    mockedSlots.mockResolvedValue([
      { id: 'slot-1', slotStart: '2026-10-20T10:00:00', slotEnd: '2026-10-20T10:30:00', label: '10:00 AM' },
    ]);
    render(<BookAppointmentWizard initialBranchId="branch-1" initialBranchName="Ovum" />);

    expect(await screen.findByText('Payment options')).toBeInTheDocument();
    expect(mockedSlots).toHaveBeenCalledWith('doc-1', '2026-10-20');
    expect(loadBookingDraft()).toBeNull();
    expect(window.location.search).toBe('?branchId=branch-1');
  });

  it('returns to visit details when the slot was taken, where Exit joins the waitlist', async () => {
    mockedSlots.mockResolvedValue([]);
    render(<BookAppointmentWizard initialBranchId="branch-1" initialBranchName="Ovum" />);

    expect(await screen.findByText(/was just taken/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exit and notify me/ }));

    await waitFor(() => expect(mockedWaitlist).toHaveBeenCalledWith('doc-1', '2026-10-20'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/visitor/dashboard'));
  });
});
