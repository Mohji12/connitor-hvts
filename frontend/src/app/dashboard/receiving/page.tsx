'use client';

import * as React from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { useAuthSession } from '@/hooks/useAuthSession';
import { formatIstDateTime } from '@/lib/datetime';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DeliveryEmptyState,
  DeliveryPageShell,
  DeliveryStatusBadge,
} from '@/features/delivery-management/ui';

interface Dock {
  id: string;
  dockName: string;
  dockCode: string;
}

interface QueueDelivery {
  id: string;
  deliveryNumber: string;
  status: string;
  goodsType?: string | null;
  totalBoxes?: number | null;
  expectedArrivalTime?: string | null;
  vendorName?: string | null;
  agentName?: string | null;
  vehicleNumber?: string | null;
  dockId?: string | null;
  receivingStarted?: boolean;
}

function apiDetail(e: unknown): string {
  if (typeof e === 'object' && e && 'response' in e) {
    return String(
      (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
    );
  }
  return '';
}

const COLUMNS: Array<{ key: string; title: string; statuses: string[] }> = [
  { key: 'gate', title: 'At gate', statuses: ['ARRIVED_AT_GATE', 'GATE_VERIFIED'] },
  { key: 'dock', title: 'At dock', statuses: ['IN_PROGRESS'] },
  { key: 'grn', title: 'GRN done', statuses: ['RECEIVED'] },
];

export default function ReceivingDashboardPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [docks, setDocks] = React.useState<Dock[]>([]);
  const [deliveries, setDeliveries] = React.useState<QueueDelivery[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dockId, setDockId] = React.useState('');

  const load = React.useCallback(async (quiet = false) => {
    if (!branchId) return;
    try {
      const res = await apiClient.get('/api/delivery/receiving/queue', {
        params: { branchId },
      });
      setDocks(res.data.docks ?? []);
      setDeliveries(res.data.deliveries ?? []);
    } catch {
      if (!quiet) toast.error('Could not load receiving board');
      if (!quiet) {
        setDocks([]);
        setDeliveries([]);
      }
    }
  }, [branchId]);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(true), DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const selected = deliveries.find((d) => d.id === selectedId) ?? null;

  const assignDock = async () => {
    if (!selected || !dockId) return;
    try {
      await apiClient.post('/api/delivery/receiving/assign-dock', {
        deliveryId: selected.id,
        dockId,
      });
      toast.success('Dock assigned — start receiving next');
      await load();
    } catch (e: unknown) {
      toast.error(apiDetail(e) || 'Assign dock failed');
    }
  };

  const startReceiving = async () => {
    if (!selected) return;
    try {
      await apiClient.post('/api/delivery/receiving/start', { deliveryId: selected.id });
      toast.success('Receiving started — you can generate GRN');
      await load();
    } catch (e: unknown) {
      toast.error(apiDetail(e) || 'Start receiving failed');
    }
  };

  const generateGrn = async () => {
    if (!selected) return;
    try {
      const res = await apiClient.post('/api/delivery/grn/generate', {
        deliveryId: selected.id,
      });
      toast.success(`GRN ${res.data.grnNumber}`);
      await load();
    } catch (e: unknown) {
      toast.error(apiDetail(e) || 'GRN failed');
    }
  };

  return (
    <DeliveryPageShell
      title="Receiving board"
      subtitle="Move deliveries from gate to dock, then generate GRN. Security marks exit after receiving."
    >
      <div className="flex flex-wrap gap-2">
        {docks.map((d) => {
          const occupied = deliveries.some(
            (x) => x.dockId === d.id && x.status === 'IN_PROGRESS',
          );
          return (
            <div
              key={d.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                occupied
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : 'border-teal-200 bg-teal-50/60 text-teal-900'
              }`}
            >
              <p className="font-semibold">
                {d.dockName} ({d.dockCode})
              </p>
              <p className="text-xs">{occupied ? 'Occupied' : 'Free'}</p>
            </div>
          );
        })}
        {docks.length === 0 && (
          <p className="text-sm text-muted-foreground">No docks configured for this branch.</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const cards = deliveries.filter((d) => col.statuses.includes(d.status));
          return (
            <Card key={col.key} className="border-amber-100/80 bg-white/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {col.title}{' '}
                  <span className="text-muted-foreground">({cards.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  cards.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        selectedId === d.id
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{d.deliveryNumber}</span>
                        <DeliveryStatusBadge status={d.status} />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {d.vendorName ?? 'Vendor'} · {d.goodsType ?? 'Goods'}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-teal-100 bg-white/90">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <DeliveryEmptyState
              title="Select a delivery"
              description="Choose a card from the board to assign a dock or generate GRN."
            />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{selected.deliveryNumber}</p>
                  <p className="text-muted-foreground">
                    {selected.vendorName} · {selected.agentName ?? '—'} /{' '}
                    {selected.vehicleNumber ?? '—'}
                    {selected.expectedArrivalTime
                      ? ` · ${formatIstDateTime(selected.expectedArrivalTime)}`
                      : ''}
                  </p>
                </div>
                <DeliveryStatusBadge status={selected.status} />
              </div>

              {(selected.status === 'ARRIVED_AT_GATE' ||
                selected.status === 'GATE_VERIFIED') && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem]">
                    <Select value={dockId} onValueChange={setDockId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dock" />
                      </SelectTrigger>
                      <SelectContent>
                        {docks.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.dockName} ({d.dockCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={!dockId}
                    onClick={() => void assignDock()}
                  >
                    Assign dock
                  </Button>
                </div>
              )}

              {selected.status === 'IN_PROGRESS' && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {selected.receivingStarted
                      ? 'Receiving started. Generate GRN when goods are counted.'
                      : 'Start receiving before generating GRN.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!selected.receivingStarted && (
                      <Button variant="outline" onClick={() => void startReceiving()}>
                        Start receiving
                      </Button>
                    )}
                    <Button
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={!selected.receivingStarted}
                      onClick={() => void generateGrn()}
                    >
                      Generate GRN
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === 'RECEIVED' && (
                <p className="rounded-lg bg-emerald-50 p-3 text-emerald-900">
                  GRN complete. Security can mark vehicle exit at the gate.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DeliveryPageShell>
  );
}
