'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { User } from '@/lib/schema/schema';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import {
  AnalyticsService,
  type BranchStats,
  type HierarchyOverview,
  type VisitorTrends,
} from '@/lib/services/analyticsService';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendPeriodFilter, useTrendFilter } from '@/components/filters/TrendPeriodFilter';
import { Building2, Users, Activity, Layers, Calendar } from 'lucide-react';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

interface SessionUser extends User {
  hospitalChainId: string;
  branchId: string;
}

export default function HospitalAdminOverview() {
  const user = useOverviewSessionUser<SessionUser>();
  const { period: trendPeriod, range: trendRange, onPeriodChange, onRangeApply } = useTrendFilter('weekly');

  const { data: overview, isLoading: overviewLoading } = useSWR<BranchStats>(
    user?.branchId ? '/api/analytics/hospital-admin/overview' : null,
    () => AnalyticsService.getHospitalAdminOverview(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: visitorTrends, isLoading: trendsLoading } = useSWR<VisitorTrends>(
    user?.branchId
      ? [`/api/analytics/hospital-admin/visitor-trends`, trendPeriod, trendRange?.fromTime, trendRange?.toTime]
      : null,
    () => AnalyticsService.getHospitalAdminVisitorTrends(trendPeriod, trendRange),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: departmentStats, isLoading: departmentsLoading } = useSWR<HierarchyOverview[]>(
    user?.branchId ? '/api/analytics/hospital-admin/departments/stats' : null,
    () => AnalyticsService.getHospitalAdminDepartmentStats(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const deptAdminCount = overview?.departmentAdminCount ?? 0;

  const lineChartData = useMemo(() => {
    if (!visitorTrends) return { labels: [], datasets: [] };
    return {
      labels: visitorTrends.data.map((d) => d.label),
      datasets: [
        {
          label: 'Visits',
          data: visitorTrends.data.map((d) => d.visits),
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [visitorTrends]);

  if (!user || (user.branchId && (overviewLoading || departmentsLoading))) {
    return (
      <ConnitorLoader
        variant="section"
        message="Loading hospital data…"
        className="min-h-[50vh] py-16"
      />
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-4 p-4 lg:space-y-6 md:p-6">
      <div className="min-w-0 max-lg:hidden">
        <h1 className="flex items-center gap-2 text-xl font-bold lg:text-2xl">
          <Building2 className="h-6 w-6 shrink-0 text-teal-700 lg:h-7 lg:w-7" />
          <span className="min-w-0 truncate">{overview?.branchName ?? 'Hospital'} Overview</span>
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-5 w-5 shrink-0 text-teal-600" />
            {overview?.totalStaff ?? 0}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visitors</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-5 w-5 shrink-0 text-teal-600" />
            {overview?.totalVisitors ?? 0}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active now</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview?.activeVisits ?? 0}</CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s visits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview?.todayVisits ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="shrink-0">Visitor trends</CardTitle>
            <TrendPeriodFilter
              periods={['daily', 'weekly', 'monthly']}
              period={trendPeriod}
              onPeriodChange={onPeriodChange}
              onRangeApply={onRangeApply}
              idPrefix="hospital-trend"
            />
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden px-3 lg:px-6">
            {trendsLoading ? (
              <ConnitorLoader variant="inline" message="Loading trends…" />
            ) : (
              <div className="chart-frame h-52 lg:h-64">
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    layout: { padding: { right: 4, left: 0, top: 4, bottom: 0 } },
                    scales: {
                      x: {
                        ticks: {
                          maxRotation: 0,
                          autoSkip: true,
                          maxTicksLimit: 4,
                          font: { size: 10 },
                        },
                      },
                      y: { beginAtZero: true, ticks: { font: { size: 10 }, maxTicksLimit: 6 } },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex min-w-0 items-center gap-2">
              <Layers className="h-5 w-5 shrink-0" />
              <span className="truncate">Departments ({departmentStats?.length ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-3 overflow-y-auto overflow-x-hidden">
            {!departmentsLoading && !departmentStats?.length && (
              <p className="text-sm text-muted-foreground">No departments yet.</p>
            )}
            {departmentStats?.map((dept) => (
              <div
                key={dept.departmentId}
                className="flex min-w-0 flex-col gap-1 border-b pb-2 text-sm lg:flex-row lg:items-start lg:justify-between lg:gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{dept.departmentName}</p>
                  <p className="truncate text-muted-foreground">
                    {dept.staffCount} staff · {dept.todayAppointments} today
                  </p>
                </div>
                <span className="w-fit shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {dept.pendingAppointments} pending
                </span>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              {deptAdminCount} department admin{deptAdminCount === 1 ? '' : 's'} in this hospital
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Hospital-wide snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Manage departments, users, visitors, and appointments for your entire hospital site from
          the sidebar. Department admins handle day-to-day operations within their clinical units.
        </CardContent>
      </Card>
    </div>
  );
}
