'use client';

import { useMemo, useState } from 'react';
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
import { UserService } from '@/lib/services/userService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Activity, Layers, Calendar } from 'lucide-react';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

type TrendPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface SessionUser extends User {
  hospitalChainId: string;
  branchId: string;
}

export default function HospitalAdminOverview() {
  const user = useOverviewSessionUser<SessionUser>();
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('weekly');

  const { data: overview } = useSWR<BranchStats>(
    user?.branchId ? '/api/analytics/hospital-admin/overview' : null,
    () => AnalyticsService.getHospitalAdminOverview(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: visitorTrends } = useSWR<VisitorTrends>(
    user?.branchId ? [`/api/analytics/hospital-admin/visitor-trends`, trendPeriod] : null,
    () => AnalyticsService.getHospitalAdminVisitorTrends(trendPeriod),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: departmentStats } = useSWR<HierarchyOverview[]>(
    user?.branchId ? '/api/analytics/hospital-admin/departments/stats' : null,
    () => AnalyticsService.getHospitalAdminDepartmentStats(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: users } = useSWR<User[]>(
    user?.branchId ? `/api/users/branch-${user.branchId}` : null,
    () => UserService.getAll({ branchId: user!.branchId }),
  );

  const deptAdminCount = users?.filter((u) => u.role === 'DEPARTMENT_ADMIN').length ?? 0;

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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-teal-700" />
          {overview?.branchName ?? 'Hospital'} Overview
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-5 w-5 text-teal-600" />
            {overview?.totalStaff ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visitors</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-5 w-5 text-teal-600" />
            {overview?.totalVisitors ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active now</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview?.activeVisits ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s visits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview?.todayVisits ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visitor trends</CardTitle>
            <div className="flex gap-1">
              {(['weekly', 'monthly'] as TrendPeriod[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={trendPeriod === p ? 'default' : 'outline'}
                  onClick={() => setTrendPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Departments ({departmentStats?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {!departmentStats?.length && (
              <p className="text-sm text-muted-foreground">No departments yet.</p>
            )}
            {departmentStats?.map((dept) => (
              <div
                key={dept.departmentId}
                className="flex items-center justify-between border-b pb-2 text-sm"
              >
                <div>
                  <p className="font-medium">{dept.departmentName}</p>
                  <p className="text-muted-foreground">
                    {dept.staffCount} staff · {dept.todayAppointments} today
                  </p>
                </div>
                <span className="text-muted-foreground">{dept.pendingAppointments} pending</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
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
