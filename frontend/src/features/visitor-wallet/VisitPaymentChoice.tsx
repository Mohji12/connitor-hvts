'use client';

import * as React from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import {
  VisitorWalletService,
  type VisitorWalletSummary,
} from '@/lib/services/visitorWalletService';

export type VisitPaymentResult = {
  paymentMethod: 'WALLET' | 'RAZORPAY';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

type VisitPaymentChoiceProps = {
  returnTo: string;
  busy: boolean;
  onPay: (payment: VisitPaymentResult) => Promise<void>;
};

function apiDetail(error: unknown): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
    if (detail) return String(detail);
  }
  if (error instanceof Error) return error.message;
  return '';
}

export function VisitPaymentChoice({
  returnTo,
  busy,
  onPay,
}: VisitPaymentChoiceProps): React.ReactElement {
  const loggedIn = Boolean(getVisitorToken());
  const [wallet, setWallet] = React.useState<VisitorWalletSummary | null>(null);
  const [error, setError] = React.useState('');
  const [paying, setPaying] = React.useState<'WALLET' | 'RAZORPAY' | null>(null);

  React.useEffect(() => {
    if (!loggedIn) return;
    VisitorWalletService.getWallet()
      .then(setWallet)
      .catch(() => setError('Could not load your wallet.'));
  }, [loggedIn]);

  const fee = wallet?.fee ?? 200;
  const available = wallet?.available ?? 0;
  const canUseWallet = available >= fee;
  const locked = busy || paying !== null;

  const payWallet = async () => {
    setError('');
    setPaying('WALLET');
    try {
      await onPay({ paymentMethod: 'WALLET' });
    } catch (e: unknown) {
      setError(apiDetail(e) || 'Wallet payment failed.');
    } finally {
      setPaying(null);
    }
  };

  const payOnline = async () => {
    setError('');
    setPaying('RAZORPAY');
    try {
      const order = await VisitorWalletService.createVisitOrder();
      await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Conninter',
        description: `Visit fee ₹${order.feeRupees}`,
        order_id: order.orderId,
        theme: { color: '#001B71' },
        modal: {
          ondismiss: () => setPaying(null),
        },
        handler: (response) => {
          void onPay({
            paymentMethod: 'RAZORPAY',
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .catch((e: unknown) => setError(apiDetail(e) || 'Booking failed after payment.'))
            .finally(() => setPaying(null));
        },
      });
    } catch (e: unknown) {
      setError(apiDetail(e) || 'Online payment could not start.');
      setPaying(null);
    }
  };

  if (!loggedIn) {
    const loginHref = `/visitor/login?returnTo=${encodeURIComponent(returnTo)}`;
    const registerHref = `/visitor/register?returnTo=${encodeURIComponent(returnTo)}`;
    return (
      <div className="space-y-3 rounded-xl border border-[#001B71]/15 bg-[#F7F9FC] p-4">
        <p className="text-sm text-slate-700">
          Sign in to pay the ₹{fee} visit fee from your wallet or online.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1 bg-[#001B71] hover:bg-[#001B71]/90">
            <Link href={loginHref}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={registerHref}>Create profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-[#001B71] to-[#4A90E2] p-4 text-white">
        <p className="text-xs uppercase tracking-wide text-white/80">Visit fee</p>
        <p className="mt-1 text-3xl font-bold">₹{fee}</p>
        <p className="mt-2 text-sm text-white/90">
          Wallet balance stays in place until the doctor confirms. Online payment is taken now and
          refunded if the doctor declines.
        </p>
      </div>
      <div className="rounded-lg border border-[#001B71]/10 bg-white p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-[#001B71]">
          <Wallet className="h-4 w-4" />
          Available in wallet: ₹{wallet ? available : '—'}
        </p>
        {wallet && wallet.reserved > 0 && (
          <p className="mt-1 text-muted-foreground">₹{wallet.reserved} reserved for pending visits</p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        className="w-full bg-[#001B71] hover:bg-[#001B71]/90"
        disabled={locked || !canUseWallet}
        onClick={() => void payWallet()}
      >
        {paying === 'WALLET' ? 'Reserving…' : `Pay ₹${fee} from wallet`}
      </Button>
      {!canUseWallet && wallet && (
        <p className="text-xs text-muted-foreground">
          Available balance is below ₹{fee}.{' '}
          <Link href="/visitor/wallet" className="text-[#001B71] underline">
            Recharge wallet
          </Link>
        </p>
      )}
      <Button variant="outline" className="w-full" disabled={locked} onClick={() => void payOnline()}>
        {paying === 'RAZORPAY' ? 'Opening payment…' : `Pay ₹${fee} online`}
      </Button>
    </div>
  );
}
