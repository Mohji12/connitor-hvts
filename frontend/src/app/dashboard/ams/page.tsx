'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuthSession } from '@/hooks/useAuthSession';
import { AttendantPassService } from '@/lib/services/attendantPassService';
import {
  AmsKpiStrip,
  AmsPageShell,
  AmsStatusLegend,
  type AmsStats,
} from '@/features/attendant-management/ui';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EMPTY_STATS: AmsStats = {
  patientsAdmitted: 0,
  attendantsRegistered: 0,
  currentlyInside: 0,
  exitedToday: 0,
  pendingApproval: 0,
  emergencyPasses: 0,
};

export default function AmsDashboardPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<AmsStats>(EMPTY_STATS);
  const [activity, setActivity] = React.useState<
    Array<{
      time?: string | null;
      name: string;
      patient: string;
      ward?: string | null;
      bed?: string | null;
      status: string;
      companionName?: string | null;
    }>
  >([]);
  const [meetings, setMeetings] = React.useState<
    Array<{ message: string; companionName?: string | null; ward?: string | null; passNumber: string }>
  >([]);

  const load = React.useCallback(() => {
    if (!branchId) return;
    AttendantPassService.dashboardSummary(branchId)
      .then((data) => {
        setStats(data.stats);
        setActivity(data.recentActivity ?? []);
        setMeetings(data.meetings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [branchId]);

  React.useEffect(() => {
    if (!user) return;
    if (!branchId) {
      setLoading(false);
      return;
    }
    load();
    const id = window.setInterval(load, DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [user, branchId, load]);

  return (
    <AmsPageShell
      title="Dashboard"
      subtitle="Today's attendant activity across your hospital branch."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-[#0052CC] hover:bg-[#0041a3]">
            <Link href="/dashboard/ams/register">Allot pass</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/security/dashboard?tab=attendant-scan">Scan QR</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/ams/shift-change">Shift Change</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/ams/emergency">Emergency Pass</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/ams/reports">Reports</Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <ConnitorLoader
          variant="section"
          message="Loading attendant data…"
          className="min-h-[40vh] py-16"
        />
      ) : (
        <>
      {meetings.length > 0 && (
        <section className="space-y-2">
          {meetings.map((meeting) => (
            <div
              key={meeting.passNumber}
              className="rounded-xl border border-[#0052CC]/20 bg-[#4A90E2]/10 px-4 py-3 text-sm text-[#001B71]"
            >
              <p className="font-medium">{meeting.message}</p>
              {meeting.companionName ? (
                <p className="mt-1">With {meeting.companionName}</p>
              ) : null}
              {meeting.ward ? <p className="mt-1 text-slate-700">{meeting.ward}</p> : null}
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Today&apos;s Statistics</h2>
        <AmsKpiStrip stats={stats} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Live Status</h2>
        <AmsStatusLegend />
      </section>

      <Card className="rounded-xl border-[#0052CC]/15">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Ward</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    No recent activity.
                  </td>
                </tr>
              ) : (
                activity.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      {row.time ? new Date(row.time).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {row.name}
                      {row.companionName ? (
                        <span className="block text-xs font-normal text-slate-600">
                          With {row.companionName}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">
                      {row.patient}
                      {row.bed ? ` · Bed ${row.bed}` : ''}
                    </td>
                    <td className="py-2 pr-3">{row.ward ?? '—'}</td>
                    <td className="py-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
        </>
      )}
    </AmsPageShell>
  );
}
