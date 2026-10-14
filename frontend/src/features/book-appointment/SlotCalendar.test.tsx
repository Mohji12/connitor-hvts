import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SlotCalendar } from './SlotCalendar';
import { AppointmentService } from '@/lib/services/appointmentService';

jest.mock('@/lib/services/appointmentService', () => ({
  AppointmentService: { listAvailableDates: jest.fn() },
}));

jest.mock('@/lib/datetime', () => ({
  todayIstDateIso: () => '2026-10-15',
}));

const mockedList = AppointmentService.listAvailableDates as jest.Mock;

function dayButton(day: number): HTMLElement {
  const label = new Date(2026, 9, day).toLocaleDateString();
  const button = document.querySelector(`button[data-day="${label}"]`);
  if (!button) throw new Error(`Day ${day} not rendered`);
  return button as HTMLElement;
}

describe('SlotCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue(['2026-10-20', '2026-10-22']);
  });

  it('loads open dates for the visible month and marks them green', async () => {
    render(<SlotCalendar doctorId="doc-1" value="2026-10-15" onChange={jest.fn()} />);

    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith('doc-1', '2026-10-15', '2026-10-31'),
    );
    await waitFor(() => expect(dayButton(20).closest('td')?.className).toContain('bg-emerald-100'));
    expect(dayButton(22).closest('td')?.className).toContain('bg-emerald-100');
    expect(dayButton(21).closest('td')?.className).not.toContain('bg-emerald-100');
    expect(screen.getByText(/Green dates have open slots/)).toBeInTheDocument();
  });

  it('reports the clicked date as YYYY-MM-DD', async () => {
    const onChange = jest.fn();
    render(<SlotCalendar doctorId="doc-1" value="2026-10-15" onChange={onChange} />);
    await waitFor(() => expect(mockedList).toHaveBeenCalled());

    fireEvent.click(dayButton(20));

    expect(onChange).toHaveBeenCalledWith('2026-10-20');
  });
});
