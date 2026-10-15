'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import { DistributorDeliveryService } from '@/lib/services/distributorDeliveryService';
import { formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DeliveryEmptyState, DeliveryPageShell } from '@/features/delivery-management/ui';

/** Only same-site paths, so a crafted link can't send distributors to another domain. */
function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  return value;
}

export default function VendorWalletPage(): React.ReactElement {
  const user = useAuthSession<{ distributorId?: string }>();
  const vendorId = user?.distributorId;
  const router = useRouter();
  const [balance, setBalance] = React.useState<number | null>(null);
  const [amount, setAmount] = React.useState('1000');
  const [returnTo, setReturnTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(safeReturnTo(params.get('returnTo')));
    const needed = Number(params.get('amount'));
    if (needed > 0) setAmount(String(Math.ceil(needed)));
  }, []);
  const [txs, setTxs] = React.useState<
    Array<{
      id: string;
      amount: number;
      transactionType: string;
      referenceType: string;
      createdAt?: string | null;
    }>
  >([]);

  const load = React.useCallback(async () => {
    if (!vendorId) return;
    try {
      const [w, t] = await Promise.all([
        DistributorDeliveryService.getWallet(vendorId),
        DistributorDeliveryService.listWalletTransactions(vendorId),
      ]);
      setBalance(w.balance);
      setTxs(t);
    } catch {
      toast.error('Could not load wallet');
    }
  }, [vendorId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const recharge = async () => {
    if (!vendorId) return;
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error('Enter a positive amount');
      return;
    }
    try {
      await DistributorDeliveryService.rechargeWallet(vendorId, value);
      if (returnTo) {
        toast.success(`₹${value} added. Taking you back to your delivery payment…`);
        router.replace(returnTo);
        return;
      }
      toast.success('Wallet recharged');
      await load();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Recharge failed');
    }
  };

  return (
    <DeliveryPageShell
      title="Wallet"
      subtitle="Recharge here, then choose Wallet on the delivery booking payment step. Fees are deducted from this balance."
    >
      {returnTo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-medium">
            Recharge to continue your delivery booking. You will go straight back to payment.
          </span>
          <Link href={returnTo} className="text-xs font-semibold underline">
            Back to booking
          </Link>
        </div>
      )}
      <section className="rounded-3xl bg-gradient-to-br from-[#001B71] to-[#1f4fa8] p-5 text-white shadow-lg lg:hidden">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">Wallet balance</p>
        <p className="mt-1 text-4xl font-bold">₹{balance != null ? balance.toFixed(2) : '—'}</p>
        <p className="mt-1 text-xs text-white/70">Demo credit — no real payment gateway.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {['500', '1000', '2000'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
                amount === v ? 'bg-white text-[#001B71]' : 'bg-white/15 text-white active:bg-white/25'
              }`}
            >
              ₹{v}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 border-white/30 bg-white/10 text-white placeholder:text-white/60"
            aria-label="Recharge amount"
          />
          <Button
            className="h-12 bg-white px-6 text-[#001B71] hover:bg-white/90"
            onClick={() => void recharge()}
            disabled={!vendorId || !(Number(amount) > 0)}
          >
            Recharge
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#001B71]/08 bg-white shadow-sm max-lg:hidden">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold text-slate-900">
              ₹{balance != null ? balance.toFixed(2) : '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              Enter an amount and tap Recharge (demo credit — no real payment gateway).
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button onClick={() => void recharge()} disabled={!vendorId || !(Number(amount) > 0)}>
                Recharge
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#001B71]/08 bg-white/90 max-lg:gap-3 max-lg:py-4 [&>[data-slot=card-content]]:max-lg:px-3 [&>[data-slot=card-header]]:max-lg:px-4">
          <CardHeader>
            <CardTitle className="max-lg:text-base">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {txs.length === 0 ? (
              <DeliveryEmptyState title="No transactions yet" description="Recharges and delivery fees appear here." />
            ) : (
              <ul className="space-y-2 text-sm">
                {txs.map((t) => (
                  <li key={t.id} className="flex justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium">
                        {t.transactionType} · {t.referenceType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.createdAt ? formatIstDateTime(t.createdAt) : '—'}
                      </p>
                    </div>
                    <span
                      className={
                        t.transactionType === 'CREDIT' ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-800'
                      }
                    >
                      {t.transactionType === 'CREDIT' ? '+' : ''}₹{t.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DeliveryPageShell>
  );
}
