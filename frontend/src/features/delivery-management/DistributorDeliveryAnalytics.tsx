'use client';

import { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DELIVERY_STATUS_LABELS,
} from '@/features/delivery-management/ui/DeliveryStatusBadge';
import type { DistributorDeliveryAnalytics } from '@/lib/services/distributorDeliveryService';

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}): React.ReactElement {
  return (
    <Card className="min-w-0">
      <CardContent className="pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold text-slate-900 lg:text-3xl">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function DistributorDeliveryAnalytics({
  data,
}: {
  data: DistributorDeliveryAnalytics;
}): React.ReactElement {
  const statusEntries = Object.entries(data.byStatus ?? {}).sort((a, b) => b[1] - a[1]);
  const trend = data.trend ?? [];
  const hospitals = data.byHospital ?? [];
  const goods = data.byGoodsType ?? [];

  const trendChart = useMemo(
    () => ({
      labels: trend.map((p) => p.label),
      datasets: [
        {
          label: 'Booked',
          data: trend.map((p) => p.bookings),
          borderColor: '#001B71',
          backgroundColor: 'rgba(0, 27, 113, 0.12)',
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Completed',
          data: trend.map((p) => p.completed),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [trend],
  );

  const statusChart = useMemo(
    () => ({
      labels: statusEntries.map(([status]) => DELIVERY_STATUS_LABELS[status] ?? status),
      datasets: [
        {
          label: 'Deliveries',
          data: statusEntries.map(([, count]) => count),
          backgroundColor: '#4A90E2',
          borderRadius: 6,
        },
      ],
    }),
    [statusEntries],
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' as const } },
    layout: { padding: { right: 4, left: 0, top: 4, bottom: 0 } },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7, font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { font: { size: 10 }, maxTicksLimit: 5 } },
    },
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="All deliveries" value={String(data.total)} hint={`${data.thisMonth} this month`} />
        <Kpi label="Today" value={String(data.today)} hint={`${data.thisWeek} this week`} />
        <Kpi label="Completed" value={String(data.completed)} hint={`${data.inProgress} in progress`} />
        <Kpi
          label="Wallet spent"
          value={`₹${Math.round(data.totalSpend).toLocaleString('en-IN')}`}
          hint={`${data.totalBoxes} boxes`}
        />
        <Kpi label="Upcoming" value={String(data.upcoming)} />
        <Kpi label="On hold" value={String(data.onHold)} />
        <Kpi label="Rejected" value={String(data.rejected)} />
        <Kpi label="Avg unload" value={`${data.avgUnloadMinutes} min`} />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Bookings — last 14 days</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden px-3 lg:px-6">
            <div className="chart-frame h-52 lg:h-64">
              <Line data={trendChart} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden px-3 lg:px-6">
            {statusEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            ) : (
              <div className="chart-frame h-52 lg:h-64">
                <Bar data={statusChart} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>By hospital</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-hidden">
            {hospitals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hospitals appear here after you book.</p>
            ) : (
              <ul className="space-y-3">
                {hospitals.map((row) => (
                  <li key={row.branchId} className="flex min-w-0 flex-col gap-0.5 border-b pb-2 last:border-b-0">
                    <p className="truncate font-medium">{row.branchName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.total} booked · {row.completed} completed · ₹
                      {Math.round(row.spend).toLocaleString('en-IN')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>By goods</CardTitle>
          </CardHeader>
          <CardContent>
            {goods.length === 0 ? (
              <p className="text-sm text-muted-foreground">Goods types appear here after you book.</p>
            ) : (
              <ul className="space-y-3">
                {goods.map((row) => (
                  <li key={row.goodsType} className="flex min-w-0 items-center justify-between gap-3 border-b pb-2 last:border-b-0">
                    <p className="min-w-0 truncate font-medium">{row.goodsType}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {row.count} · {row.boxes} boxes
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
