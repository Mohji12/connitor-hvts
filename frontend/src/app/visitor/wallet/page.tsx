'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatIstDateTime } from '@/lib/datetime';
import { clearVisitorToken, getVisitorToken } from '@/lib/services/visitorPortalService';
import {
  VisitorWalletService,
  type VisitorWalletSummary,
  type VisitorWalletTransaction,
} from '@/lib/services/visitorWalletService';

const PRESETS = [100, 500, 1000];

const TYPE_LABELS: Record<string, string> = {
  CREDIT: 'Recharge',
  HOLD: 'Reserved for visit',
  DEBIT: 'Visit fee',
  RELEASE: 'Reservation released',
  REFUND: 'Refund',
};

export default function VisitorWalletPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<VisitorWalletSummary | null>(null);
  const [txs, setTxs] = useState<VisitorWalletTransaction[]>([]);
  const [amount, setAmount] = useState('500');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [summary, rows] = await Promise.all([
      VisitorWalletService.getWallet(),
      VisitorWalletService.listTransactions(),
    ]);
    setWallet(summary);
    setTxs(rows);
  }, []);

  useEffect(() => {
    if (!getVisitorToken()) {
      router.replace('/visitor/login?returnTo=/visitor/wallet');
      return;
    }
    setReady(true);
    void load().catch(() => toast.error('Could not load wallet'));
  }, [load, router]);

  const recharge = async (rupees: number) => {
    if (rupees < 100) {
      toast.error('Minimum recharge is ₹100');
      return;
    }
    setBusy(true);
    try {
      const summary = await VisitorWalletService.dummyRecharge(rupees);
      setWallet(summary);
      await load();
      toast.success(`₹${rupees} added to your wallet`);
    } catch {
      toast.error('Could not recharge the wallet');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <VisitorPortalShell
      headerExtra={
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            clearVisitorToken();
            router.push('/visitor/login');
          }}
        >
          Sign out
        </Button>
      }
    >
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8 sm:p-6">
        <Button asChild variant="ghost" size="sm" className="px-0 text-[#001B71]">
          <Link href="/visitor/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#001B71] via-[#0B2F8A] to-[#4A90E2] p-6 text-white shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/80">
                <Wallet className="h-4 w-4" />
                Visitor wallet
              </p>
              <p className="mt-3 text-4xl font-bold tracking-tight">
                ₹{wallet ? wallet.balance.toFixed(2) : '—'}
              </p>
              <p className="mt-1 text-sm text-white/80">Balance</p>
            </div>
            <div className="text-right text-sm">
              <p>
                Available{' '}
                <span className="font-semibold">
                  ₹{wallet ? wallet.available.toFixed(2) : '—'}
                </span>
              </p>
              <p className="mt-1 text-white/80">
                Reserved ₹{wallet ? wallet.reserved.toFixed(2) : '—'}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            Demo recharge adds the amount straight to your wallet. Visit fees stay reserved until
            the doctor confirms, then the amount is deducted. There is no withdrawal.
          </p>
        </section>

        <Card className="border-[#001B71]/10">
          <CardHeader>
            <CardTitle className="text-[#001B71]">Recharge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === String(preset) ? 'default' : 'outline'}
                  className={amount === String(preset) ? 'bg-[#001B71] hover:bg-[#001B71]/90' : ''}
                  onClick={() => setAmount(String(preset))}
                >
                  ₹{preset}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="number"
                min={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Recharge amount in rupees"
              />
              <Button
                className="bg-[#4A90E2] hover:bg-[#3b7ccc]"
                disabled={busy}
                onClick={() => void recharge(Number(amount))}
              >
                {busy ? 'Adding…' : 'Recharge'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum recharge is ₹100.</p>
          </CardContent>
        </Card>

        <Card className="border-[#001B71]/10">
          <CardHeader>
            <CardTitle className="text-[#001B71]">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {txs.length === 0 && (
              <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
            )}
            <ul className="divide-y">
              {txs.map((tx) => {
                const credit = tx.transactionType === 'CREDIT' || tx.transactionType === 'REFUND';
                return (
                  <li key={tx.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">
                        {TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.createdAt ? formatIstDateTime(tx.createdAt) : '—'}
                        {tx.status === 'OPEN' ? ' · pending confirmation' : ''}
                      </p>
                    </div>
                    <p className={credit ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-800'}>
                      {credit ? '+' : '−'}₹{tx.amount.toFixed(2)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </main>
    </VisitorPortalShell>
  );
}
