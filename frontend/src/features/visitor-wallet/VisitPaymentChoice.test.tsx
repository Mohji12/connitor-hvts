import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { VisitPaymentChoice } from './VisitPaymentChoice';
import { VisitorWalletService } from '@/lib/services/visitorWalletService';

jest.mock('@/lib/services/visitorPortalService', () => ({
  getVisitorToken: () => 'token',
}));

jest.mock('@/lib/razorpay-checkout', () => ({
  openRazorpayCheckout: jest.fn(),
}));

jest.mock('@/lib/services/visitorWalletService', () => ({
  VisitorWalletService: { getWallet: jest.fn(), createVisitOrder: jest.fn() },
}));

const mockedWallet = VisitorWalletService.getWallet as jest.Mock;

describe('VisitPaymentChoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWallet.mockResolvedValue({
      fee: 200,
      available: 50,
      balance: 50,
      reserved: 0,
      dummyPaymentEnabled: true,
    });
  });

  it('lets a visitor with a low balance recharge through the caller', async () => {
    const onRecharge = jest.fn();
    render(
      <VisitPaymentChoice returnTo="/book-appointment" busy={false} onPay={jest.fn()} onRecharge={onRecharge} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Recharge wallet' }));

    expect(onRecharge).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Pay ₹200 from wallet/ })).toBeDisabled();
  });

  it('shows the dummy payment only when the caller allows it', async () => {
    const { rerender } = render(
      <VisitPaymentChoice returnTo="/book-appointment" busy={false} onPay={jest.fn()} />,
    );
    await screen.findByText(/Available balance is below/);
    expect(screen.queryByRole('button', { name: /Dummy payment/ })).not.toBeInTheDocument();

    rerender(
      <VisitPaymentChoice returnTo="/book-appointment" busy={false} onPay={jest.fn()} allowDummy />,
    );
    expect(screen.getByRole('button', { name: /Dummy payment/ })).toBeInTheDocument();
  });
});
