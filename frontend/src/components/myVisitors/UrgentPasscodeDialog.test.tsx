import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { UrgentPasscodeDialog } from './UrgentPasscodeDialog';
import { UrgentPasscodeService } from '@/lib/services/urgentPasscodeService';

jest.mock('@/lib/services/urgentPasscodeService', () => ({
  UrgentPasscodeService: {
    list: jest.fn(),
    issue: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
    share: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UrgentPasscodeDialog Share Functionality', () => {
  const mockActivePasscode = {
    id: 'pass-123',
    code: '654321',
    status: 'ACTIVE',
    theme: 'Consultation',
    purpose: 'Urgent check-up',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    validForHours: 24,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (UrgentPasscodeService.list as jest.Mock).mockResolvedValue([mockActivePasscode]);
  });

  it('renders share options when dialog is open and passcode is active', async () => {
    render(<UrgentPasscodeDialog open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => {
      expect(UrgentPasscodeService.list).toHaveBeenCalled();
    });

    // Select the active passcode
    const useExistingButton = screen.getByText('Use existing');
    fireEvent.click(useExistingButton);

    // Click the active passcode in the list to select it
    const codeButtons = await screen.findAllByText(/654321/i);
    fireEvent.click(codeButtons[0]);

    // Verify share buttons are rendered
    expect(screen.getByText(/Share \(Apps \/ Device\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Email$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^SMS$/i })).toBeInTheDocument();
  });

  it('triggers window.open with correct parameters for WhatsApp share', async () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<UrgentPasscodeDialog open={true} onOpenChange={jest.fn()} />);

    await waitFor(() => {
      expect(UrgentPasscodeService.list).toHaveBeenCalled();
    });

    const codeButtons = await screen.findAllByText(/654321/i);
    fireEvent.click(codeButtons[0]);

    const whatsappBtn = screen.getByText(/WhatsApp/i);
    fireEvent.click(whatsappBtn);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank',
      'noopener,noreferrer'
    );

    windowOpenSpy.mockRestore();
  });
});
