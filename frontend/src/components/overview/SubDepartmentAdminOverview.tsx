'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import { AppointmentService } from '@/lib/services/appointmentService';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { HierarchyOverviewCharts } from '@/components/overview/HierarchyOverviewCharts';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { Users, Stethoscope, Calendar, Clock, CheckCircle2, UserCheck } from 'lucide-react';

export default function SubDepartmentAdminOverview() {
  const user = useOverviewSessionUser<{ subDepartmentId?: string }>();

  const { data: overview, isLoading } = useSWR(
    user?.subDepartmentId ? '/api/analytics/sub-department-admin/overview' : null,
    () => AnalyticsService.getSubDepartmentAdminOverview(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const { data: appointments, isLoading: appointmentsLoading } = useSWR(
    user ? '/api/appointments/subdept' : null,
    () => AppointmentService.list(),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  if (!user || (user.subDepartmentId && isLoading && !overview)) {
    return (
      <ConnitorLoader
        variant="section"
        message="Loading section data…"
        className="min-h-[50vh] py-16"
      />
    );
  }

  const stats = [
    { label: 'Total Staff', value: overview?.staffCount ?? 0, icon: Users },
    { label: 'Doctors', value: overview?.doctorCount ?? 0, icon: Stethoscope },
    { label: 'Today Appointments', value: overview?.todayAppointments ?? 0, icon: Calendar },
    { label: 'Pending', value: overview?.pendingAppointments ?? 0, icon: Clock },
    { label: 'Active Visits', value: overview?.activeVisits ?? 0, icon: UserCheck },
    { label: 'Completed', value: overview?.completedAppointments ?? 0, icon: CheckCircle2 },
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 p-4 lg:space-y-6 md:p-6">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-lg:hidden">
          <h1 className="truncate text-2xl font-bold">
            {overview?.subDepartmentName ?? 'Sub-Department'} Dashboard
          </h1>
          <p className="text-muted-foreground">Manage staff and section appointments</p>
        </div>
        <Button asChild variant="outline" className="w-full shrink-0 lg:w-auto">
          <Link href="/dashboard/sub-departments">Manage section</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
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
        trendsKey="subdept-trends"
        trendsFetcher={(period, range) => AnalyticsService.getSubDepartmentVisitorTrends(period, range)}
        quickLinks={[
          { href: '/dashboard/sub-departments', label: 'Section settings' },
          { href: '/dashboard/users', label: 'Staff & doctors' },
          { href: '/dashboard/appointments', label: 'Appointments' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Section Appointments</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/appointments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <ConnitorLoader variant="inline" message="Loading appointments…" />
          ) : !appointments?.length ? (
            <p className="text-sm text-muted-foreground">No appointments in this section.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.slice(0, 8).map((a) => (
                <li key={a.id} className="flex justify-between border-b pb-2 text-sm">
                  <span>
                    {a.visitor
                      ? `${a.visitor.firstName} ${a.visitor.lastName}`
                      : 'Visitor'}{' '}
                    with {a.staffName}
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
