'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import { DistributorDeliveryService } from '@/lib/services/distributorDeliveryService';
import { formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DeliveryEmptyState, DeliveryPageShell } from '@/features/delivery-management/ui';

export default function VendorWalletPage(): React.ReactElement {
  const user = useAuthSession<{ distributorId?: string }>();
  const vendorId = user?.distributorId;
  const [balance, setBalance] = React.useState<number | null>(null);
  const [amount, setAmount] = React.useState('1000');
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
    try {
      await DistributorDeliveryService.rechargeWallet(vendorId, Number(amount));
      toast.success('Wallet recharged');
      await load();
    } catch {
      toast.error('Recharge failed');
    }
  };

  return (
    <DeliveryPageShell
      title="Wallet"
      subtitle="Delivery booking fees are debited from this balance when wallet billing is enabled."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#001B71]/08 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold text-slate-900">₹{balance ?? '—'}</p>
            <div className="flex gap-2">
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button onClick={() => void recharge()}>
                Recharge
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#001B71]/08 bg-white/90">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
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
