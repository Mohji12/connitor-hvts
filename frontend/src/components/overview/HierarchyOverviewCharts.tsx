'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type HierarchyOverview,
  type TrendPeriod,
  type VisitorTrends,
} from '@/lib/services/analyticsService';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { ArrowRight, Clock, Timer } from 'lucide-react';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const CHART_COLORS = {
  primary: '#93C5FD',
  secondary: '#A7F3D0',
  tertiary: '#E0E7FF',
  background: 'rgba(147, 197, 253, 0.1)',
} as const;

const STATUS_LABELS: Record<string, string> = {
  REQUEST_SENT: 'Pending',
  APPROVED: 'Approved',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Completed',
  REJECTED: 'Rejected',
};

function getNiceColors(n: number) {
  return Array.from({ length: n }).map((_, i) => `hsl(${(360 * i) / n}, 50%, 65%)`);
}

interface HierarchyOverviewChartsProps {
  overview?: HierarchyOverview;
  overviewLoading: boolean;
  trendsFetcher: (period: TrendPeriod) => Promise<VisitorTrends>;
  trendsKey: string;
  quickLinks: { href: string; label: string }[];
}

export function HierarchyOverviewCharts({
  overview,
  overviewLoading,
  trendsFetcher,
  trendsKey,
  quickLinks,
}: HierarchyOverviewChartsProps) {
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('weekly');

  const { data: trends, isLoading: trendsLoading } = useSWR(
    `${trendsKey}-${trendPeriod}`,
    () => trendsFetcher(trendPeriod),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const statusChart = useMemo(() => {
    const breakdown = overview?.statusBreakdown ?? {};
    const entries = Object.entries(breakdown).filter(([, count]) => count > 0);
    const labels = entries.map(([status]) => STATUS_LABELS[status] ?? status);
    const values = entries.map(([, count]) => count);
    const colors = getNiceColors(Math.max(labels.length, 1));
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: '#fff',
        },
      ],
    };
  }, [overview?.statusBreakdown]);

  const trendChart = useMemo(() => {
    const points = trends?.data ?? [];
    return {
      labels: points.map((p) => p.label),
      datasets: [
        {
          label: 'Appointments',
          data: points.map((p) => p.visits),
          borderColor: CHART_COLORS.primary,
          backgroundColor: CHART_COLORS.background,
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Check-ins',
          data: points.map((p) => p.checkIns),
          borderColor: CHART_COLORS.secondary,
          backgroundColor: 'rgba(167, 243, 208, 0.15)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [trends]);

  const duration = overview?.visitDuration;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Appointment Trends</CardTitle>
            <div className="flex flex-wrap gap-1">
              {(['daily', 'weekly', 'monthly'] as TrendPeriod[]).map((period) => (
                <Button
                  key={period}
                  size="sm"
                  variant={trendPeriod === period ? 'default' : 'outline'}
                  onClick={() => setTrendPeriod(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <Line
                  data={trendChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="mx-auto h-48 w-48 rounded-full" />
            ) : statusChart.labels.length ? (
              <div className="mx-auto h-48 w-48">
                <Pie
                  data={statusChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No appointment data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Visit Duration</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : duration?.count ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Average</p>
                  <p className="text-2xl font-bold">{duration.avgMinutes} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed visits</p>
                  <p className="text-2xl font-bold">{duration.count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shortest</p>
                  <p className="font-semibold">{duration.minMinutes} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Longest</p>
                  <p className="font-semibold">{duration.maxMinutes} min</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No completed visits with duration yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {trends?.data?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Check-ins vs Check-outs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <Bar
                data={{
                  labels: trends.data.map((p) => p.label),
                  datasets: [
                    {
                      label: 'Check-ins',
                      data: trends.data.map((p) => p.checkIns),
                      backgroundColor: CHART_COLORS.primary,
                    },
                    {
                      label: 'Check-outs',
                      data: trends.data.map((p) => p.checkOuts),
                      backgroundColor: CHART_COLORS.secondary,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
