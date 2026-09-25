'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Branch, User } from '@/lib/schema/schema';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import { BranchService } from '@/lib/services/branchService';
import { UserService } from '@/lib/services/userService';
import {
  AnalyticsService,
  type ChainStats,
  type VisitorTrends,
  type BranchStats,
  type TrendPeriod,
} from '@/lib/services/analyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import {
  GitBranch,
  Users,
  Activity,
  CalendarCheck,
  TrendingUp,
  Building2,
  Clock,
  Eye,
} from 'lucide-react';

// Register Chart.js
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ExtendedUser extends User {
  hospitalChainId: string;
}

export default function ChainAdminOverview() {
  const user = useOverviewSessionUser<ExtendedUser>();

  const [chainStats, setChainStats] = useState<ChainStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesStats, setBranchesStats] = useState<BranchStats[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [visitorTrends, setVisitorTrends] = useState<VisitorTrends | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('weekly');
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const chainId = user?.hospitalChainId;

  // Fetch data
  useEffect(() => {
    if (!user || !chainId) return;
    if (user.role !== 'CHAIN_ADMIN') {
      setError('Only chain admins may view this dashboard.');
      return;
    }
    
    Promise.all([
      AnalyticsService.getChainAdminOverview(chainId),
      AnalyticsService.getChainBranchesStats(chainId),
      AnalyticsService.getChainVisitorTrends(chainId, trendPeriod),
      BranchService.getAll(chainId),
      UserService.getAll({ chainId }),
    ])
      .then(([stats, bStats, trends, branchList, userList]) => {
        setChainStats(stats);
        setBranchesStats(bStats);
        setVisitorTrends(trends);
        setBranches(branchList);
        setStaff(userList.filter((u) => u.role === 'STAFF' || u.role === 'BRANCH_ADMIN'));
      })
      .catch(() => setError('Failed to fetch data.'));
  }, [user, chainId, trendPeriod]);

  // Update trends when period changes
  useEffect(() => {
    if (!chainId) return;
    AnalyticsService.getChainVisitorTrends(chainId, trendPeriod)
      .then(setVisitorTrends)
      .catch(console.error);
  }, [chainId, trendPeriod]);

  const getBranchStaffCount = useCallback(
    (branchId: string | undefined) =>
      staff.filter((u) => String(u.branchId) === String(branchId)).length,
    [staff]
  );

  // Current date/time
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Branch distribution chart
  const branchChartData = useMemo(() => {
    const labels = branchesStats.map((b) => b.branchName);
    return {
      labels,
      datasets: [
        {
          label: 'Total Visitors',
          data: branchesStats.map((b) => b.totalVisitors),
          backgroundColor: '#6366f1',
          borderRadius: 8,
          barPercentage: 0.6,
        },
        {
          label: 'Active Now',
          data: branchesStats.map((b) => b.activeVisits),
          backgroundColor: '#22c55e',
          borderRadius: 8,
          barPercentage: 0.6,
        },
      ],
    };
  }, [branchesStats]);

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#64748b', usePointStyle: true } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
    },
  };

  // Staff distribution doughnut
  const staffDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    staff.forEach((s) => {
      const role = s.role?.replace('_', ' ') || 'Unknown';
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [staff]);

  const doughnutData = useMemo(() => ({
    labels: Object.keys(staffDistribution),
    datasets: [{
      data: Object.values(staffDistribution),
      backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#0ea5e9', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 8,
    }],
  }), [staffDistribution]);

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#64748b', padding: 16, usePointStyle: true } },
    },
  };

  // Line chart for trends
  const lineData = useMemo(() => {
    if (!visitorTrends) return { labels: [], datasets: [] };
    return {
      labels: visitorTrends.data.map((d) => d.label),
      datasets: [
        {
          label: 'Visits',
          data: visitorTrends.data.map((d) => d.visits),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#6366f1',
        },
        {
          label: 'Check-ins',
          data: visitorTrends.data.map((d) => d.checkIns),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#22c55e',
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
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
    },
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6 pb-4 lg:pb-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              {chainStats?.chainName || 'Chain'} Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-2 text-slate-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{formattedDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Row - 2x2 on tablet, 4 on desktop */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: "Today's Visitors", value: chainStats?.todayVisits || 0, icon: CalendarCheck, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Active Visits', value: chainStats?.activeVisits || 0, icon: Activity, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50' },
          { title: 'Total Branches', value: chainStats?.totalBranches || 0, icon: GitBranch, color: 'from-sky-500 to-cyan-600', bg: 'bg-sky-50' },
          { title: 'Total Staff', value: chainStats?.totalStaff || 0, icon: Users, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-md`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                {i === 1 && chainStats?.activeVisits ? (
                  <span className="flex items-center text-green-600 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                    Live
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Charts Row - 2 columns on tablet+ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Branch Performance */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-indigo-500" />
              Branch Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 min-w-0">
              <Bar data={branchChartData} options={barOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Staff Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Staff Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="h-64 w-full max-w-xs min-w-0">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Visitor Trends - Full width */}
      <section className="mb-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Visitor Trends
            </CardTitle>
            <div className="flex gap-1.5">
              {(['daily', 'weekly', 'monthly', 'yearly'] as TrendPeriod[]).map((p) => (
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
              <Line data={lineData} options={lineOptions} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Branches Table */}
      <section>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">Branch Overview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">Branch</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">Location</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600">Staff</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600">Visitors</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600">Active</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No branches found</td>
                  </tr>
                ) : (
                  branches.map((branch) => {
                    const stats = branchesStats.find((b) => b.branchId === branch.id);
                    return (
                      <tr key={branch.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{branch.name}</div>
                        </td>
                        <td className="p-3 text-slate-600 text-sm">{branch.city}</td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                            {getBranchStaffCount(branch.id)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
                            {stats?.totalVisitors || 0}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={stats?.activeVisits ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500'}>
                            {stats?.activeVisits || 0}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedBranch(branch); setIsDialogOpen(true); }}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Branch Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              {selectedBranch?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs">City</p>
                  <p className="font-medium text-slate-900">{selectedBranch.city}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs">Phone</p>
                  <p className="font-medium text-slate-900">{selectedBranch.phone}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs">Email</p>
                  <p className="font-medium text-slate-900 text-xs">{selectedBranch.email}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 text-xs">Staff</p>
                  <p className="font-medium text-slate-900">{getBranchStaffCount(selectedBranch.id)}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full cursor-pointer" 
                onClick={() => setIsDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
