import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import BookAppointmentPage from './page';
import { AppointmentService } from '@/lib/services/appointmentService';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/services/appointmentService', () => ({
  AppointmentService: { listPublicHospitals: jest.fn() },
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
