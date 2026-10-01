'use client';

import { todayIstDateIso } from '@/lib/datetime';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import type { Branch, User, VisitorSummary } from '@/lib/schema/schema';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import { BranchService } from '@/lib/services/branchService';
import { UserService } from '@/lib/services/userService';
import { VisitorService } from '@/lib/services/visitorService';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { AnalyticsService, type VisitorTrends } from '@/lib/services/analyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Users,
  Activity,
  Clock,
  Building2,
  TrendingUp,
  ShieldCheck,
  LogIn,
  AlertCircle,
  Eye,
} from 'lucide-react';

// Register ChartJS
ChartJS.register(
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

type TrendPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ExtendedUser extends User {
  hospitalChainId: string;
  branchId: string;
}

export default function BranchAdminOverview() {
  const user = useOverviewSessionUser<ExtendedUser>();
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('hourly');

  const branchId = user?.branchId;
  const chainId = user?.hospitalChainId;

  // Fetch branch data
  const { data: branch } = useSWR<Branch>(
    branchId && chainId ? `/api/branches/${branchId}` : null,
    () => BranchService.getById(chainId!, branchId!)
  );

  // Fetch users
  const { data: users } = useSWR<User[]>(
    branchId ? `/api/users?branchId=${branchId}` : null,
    () => UserService.getAll({ branchId })
  );

  // Fetch visitor summary
  const { data: rawSummary } = useSWR<VisitorSummary[]>(
    branchId ? [`/api/visitor/summary`, branchId] : null,
    async () => {
      const today = todayIstDateIso();
      const res = await VisitorService.getVisitorSummary({
        search: branchId ? String(branchId) : undefined,
        date: today,
      });
      return res.data as VisitorSummary[];
    },
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  // Fetch visitor trends from analytics API
  const { data: visitorTrends } = useSWR<VisitorTrends>(
    branchId ? [`/api/analytics/branch-admin/visitor-trends`, branchId, trendPeriod] : null,
    () => AnalyticsService.getBranchVisitorTrends(branchId!, trendPeriod),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const summary = useMemo(() => rawSummary ?? [], [rawSummary]);

  // Calculated metrics
  const currentlyActive = summary.filter((v) => v.status === 'CHECKED_IN').length;
  const totalCheckIns = summary.filter((v) => v.status === 'CHECKED_IN').length;
  const totalCheckOuts = summary.filter((v) => v.status === 'CHECKED_OUT').length;
  const pendingCount = summary.filter(
    (v) => v.status === 'PENDING' || v.status === 'REQUEST_SENT'
  ).length;
  const totalStaff = users?.filter((u) => u.role === 'STAFF').length ?? 0;
  const securityCount = users?.filter(
    (u) => u.role === 'SECURITY' || u.role === 'SECURITY_SUPERVISOR'
  ).length ?? 0;

  // Today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Line chart data from API
  const lineChartData = useMemo(() => {
    if (!visitorTrends) return { labels: [], datasets: [] };
    return {
      labels: visitorTrends.data.map((d) => d.label),
      datasets: [
        {
          label: 'Check-ins',
          data: visitorTrends.data.map((d) => d.checkIns),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#22c55e',
        },
        {
          label: 'Check-outs',
          data: visitorTrends.data.map((d) => d.checkOuts),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
        },
      ],
    };
  }, [visitorTrends]);

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#64748b', usePointStyle: true } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', maxRotation: 45 } },
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
    },
  };

  // Visitor status distribution
  const visitorStatusCounts = useMemo(() => {
    const counts = { CheckedIn: 0, CheckedOut: 0, Pending: 0, Others: 0 };
    for (const v of summary) {
      if (v.status === 'CHECKED_IN') counts.CheckedIn++;
      else if (v.status === 'CHECKED_OUT') counts.CheckedOut++;
      else if (['PENDING', 'REQUEST_SENT'].includes(v.status)) counts.Pending++;
      else counts.Others++;
    }
    return counts;
  }, [summary]);

  const doughnutData = {
    labels: ['Checked In', 'Checked Out', 'Pending', 'Others'],
    datasets: [{
      data: [
        visitorStatusCounts.CheckedIn,
        visitorStatusCounts.CheckedOut,
        visitorStatusCounts.Pending,
        visitorStatusCounts.Others,
      ],
      backgroundColor: ['#22c55e', '#6366f1', '#f59e0b', '#94a3b8'],
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#64748b', padding: 16, usePointStyle: true } },
    },
  };

  // Staff on duty list - ONLY STAFF role, not branch admins
  const activeStaff = users?.filter((u) => u.role === 'STAFF' && u.isActive) ?? [];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6 pb-4 lg:pb-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          {branch?.name || 'Branch'} Dashboard
        </h1>
        <div className="flex items-center gap-2 mt-2 text-slate-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{formattedDate}</span>
        </div>
      </header>

      {/* Stats Row - 2x2 on tablet, 4 on desktop */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Currently In Facility - Clickable */}
        <Card 
          className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setIsVisitorDialogOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{currentlyActive}</p>
              <p className="text-sm text-slate-500 mt-1">Currently In Facility</p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md w-fit">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500 mt-1">Pending Approvals</p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Visitors */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md w-fit">
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{totalCheckIns + totalCheckOuts}</p>
              <p className="text-sm text-slate-500 mt-1">Today&apos;s Visitors</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Staff */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md w-fit">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{totalStaff}</p>
              <p className="text-sm text-slate-500 mt-1">Total Staff</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Visitor Traffic Chart with Period Selector */}
      <section className="mb-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Visitor Traffic
            </CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              {(['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as TrendPeriod[]).map((p) => (
                <Button
                  key={p}
                  variant={trendPeriod === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTrendPeriod(p)}
                  className={`capitalize text-xs px-3 cursor-pointer ${
                    trendPeriod === p ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600'
                  }`}
                >
                  {p}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 min-w-0">
              <Line data={lineChartData} options={lineOptions} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Two Column Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Visitor Status Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Visitor Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="h-64 w-full max-w-xs min-w-0">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Staff On Duty - ONLY STAFF */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              Staff On Duty
            </CardTitle>
            <Badge variant="outline" className="text-indigo-600 border-indigo-200">
              {activeStaff.length} Active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-56 overflow-y-auto">
              {activeStaff.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {activeStaff.slice(0, 8).map((staff) => (
                    <div key={staff.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{staff.name}</p>
                        <p className="text-xs text-slate-500">
                          {staff.department || 'Staff'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {staff.location || 'N/A'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No staff on duty</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Security Summary Card */}
      <section>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Security Personnel</p>
                  <p className="text-sm text-slate-500">Active security staff on duty</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{securityCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Active Visitors Dialog */}
      <Dialog open={isVisitorDialogOpen} onOpenChange={setIsVisitorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Currently In Facility ({currentlyActive})
            </DialogTitle>
            <DialogDescription>Visitors currently checked-in</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {currentlyActive === 0 ? (
              <p className="text-center text-slate-400 py-8">No active visitors</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 font-semibold text-slate-600">Name</th>
                    <th className="text-left p-3 font-semibold text-slate-600">Phone</th>
                    <th className="text-center p-3 font-semibold text-slate-600">Check-In</th>
                    <th className="text-left p-3 font-semibold text-slate-600">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {summary
                    .filter((v) => v.status === 'CHECKED_IN')
                    .map((v) => (
                      <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900">{v.visitorName}</td>
                        <td className="p-3 text-slate-600">{v.visitorPhone || 'N/A'}</td>
                        <td className="p-3 text-center text-slate-600">
                          {v.checkInTime
                            ? new Date(v.checkInTime).toLocaleTimeString()
                            : 'N/A'}
                        </td>
                        <td className="p-3 text-slate-600">{v.purpose || 'N/A'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsVisitorDialogOpen(false)} className="cursor-pointer">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
