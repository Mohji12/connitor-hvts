'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import { AppointmentService } from '@/lib/services/appointmentService';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { HierarchyOverviewCharts } from '@/components/overview/HierarchyOverviewCharts';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { Building2, Users, Calendar, Activity, CheckCircle2, UserCheck } from 'lucide-react';

export default function DepartmentAdminOverview() {
  const user = useOverviewSessionUser<{ departmentId?: string }>();

  const { data: overview, isLoading } = useSWR(
    user?.departmentId ? '/api/analytics/department-admin/overview' : null,
    () => AnalyticsService.getDepartmentAdminOverview(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: appointments } = useSWR(
    user ? '/api/appointments/dept' : null,
    () => AppointmentService.list(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const stats = [
    { label: 'Sub-Departments', value: overview?.subDepartmentCount ?? 0, icon: Building2 },
    { label: 'Staff', value: overview?.staffCount ?? 0, icon: Users },
    { label: 'Today Appointments', value: overview?.todayAppointments ?? 0, icon: Calendar },
    { label: 'Pending Approvals', value: overview?.pendingAppointments ?? 0, icon: Activity },
    { label: 'Active Visits', value: overview?.activeVisits ?? 0, icon: UserCheck },
    { label: 'Completed', value: overview?.completedAppointments ?? 0, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {overview?.departmentName ?? 'Department'} Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your department and monitor appointments</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/departments">Manage sub-departments</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <HierarchyOverviewCharts
        overview={overview}
        overviewLoading={isLoading}
        trendsKey="dept-trends"
        trendsFetcher={(period) => AnalyticsService.getDepartmentVisitorTrends(period)}
        quickLinks={[
          { href: '/dashboard/departments', label: 'Sub-departments' },
          { href: '/dashboard/users', label: 'Staff & admins' },
          { href: '/dashboard/appointments', label: 'Appointments' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Appointments</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/appointments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!appointments?.length ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.slice(0, 8).map((a) => (
                <li key={a.id} className="flex justify-between border-b pb-2 text-sm">
                  <span>
                    {a.visitor
                      ? `${a.visitor.firstName} ${a.visitor.lastName}`
                      : 'Visitor'}{' '}
                    → {a.staffName}
                  </span>
                  <span className="text-muted-foreground">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
