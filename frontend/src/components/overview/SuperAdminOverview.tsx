'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { HospitalChain, Branch, User } from '@/lib/schema/schema';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import {
  getBackendUnreachableMessage,
  isBackendUnreachable,
} from '@/lib/api-errors';
import {
  AnalyticsService,
  type VisitorTrends,
  type VisitStatusDistribution,
  type VisitCategoryDistribution,
  type UserRoleDistribution,
  type ChainStats,
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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
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
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import {
  Building2,
  GitBranch,
  Users,
  UserCheck,
  Activity,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';

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

// Premium color palette
const CHART_COLORS = {
  primary: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
  secondary: ['#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f97316'],
  gradient: {
    purple: 'rgba(99, 102, 241, 0.1)',
    blue: 'rgba(6, 182, 212, 0.1)',
  },
};

function getNiceColors(n: number) {
  const colors = [...CHART_COLORS.primary, ...CHART_COLORS.secondary];
  return Array.from({ length: n }).map((_, i) => colors[i % colors.length]);
}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  REQUEST_SENT: '#f59e0b',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  CHECKED_IN: '#6366f1',
  CHECKED_OUT: '#8b5cf6',
};

// Role display names
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CHAIN_ADMIN: 'Chain Admin',
  BRANCH_ADMIN: 'Branch Admin',
  HOSPITAL_ADMIN: 'Hospital Admin',
  SECURITY_SUPERVISOR: 'Security Supervisor',
  SECURITY: 'Security',
  STAFF: 'Staff',
};

type SystemMetrics = {
  totalChains: number;
  totalBranches: number;
  totalStaff: number;
  totalVisitors: number;
  activeVisits: number;
  todayVisits: number;
};

export default function SuperAdminOverview() {
  const sessionUser = useOverviewSessionUser<{ role?: string }>();
  const isSuperAdmin = sessionUser?.role === 'SUPER_ADMIN';

  const [chains, setChains] = useState<HospitalChain[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalChains: 0,
    totalBranches: 0,
    totalStaff: 0,
    totalVisitors: 0,
    activeVisits: 0,
    todayVisits: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Analytics state
  const [visitorTrends, setVisitorTrends] = useState<VisitorTrends | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('weekly');
  const [visitStatusDist, setVisitStatusDist] = useState<VisitStatusDistribution[]>([]);
  const [visitCategoryDist, setVisitCategoryDist] = useState<VisitCategoryDistribution[]>([]);
  const [userRoleDist, setUserRoleDist] = useState<UserRoleDistribution[]>([]);
  const [chainStats, setChainStats] = useState<ChainStats[]>([]);

  const [selectedChain, setSelectedChain] = useState<HospitalChain | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getChainTotalStaff = useCallback(
    (chainId: string): number =>
      staff.filter((user) => user.hospitalChainId === chainId).length,
    [staff],
  );

  const getChainVisitors = useCallback(
    (chainId: string): number => {
      const chain = chainStats.find((c) => c.chainId === chainId);
      return chain?.totalVisitors || 0;
    },
    [chainStats],
  );

  // Fetch dashboard + trends (single super-admin endpoint; period selects trend range)
  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    let cancelled = false;
    setError(null);

    const applyDashboard = (data: Awaited<ReturnType<typeof AnalyticsService.getSuperAdminDashboard>>) => {
      setChains(data.chains as HospitalChain[]);
      setBranches(data.branches as Branch[]);
      setStaff(data.staff as User[]);
      setMetrics({
        totalChains: data.overview.totalChains,
        totalBranches: data.overview.totalBranches,
        totalStaff: data.overview.totalStaff,
        totalVisitors: data.overview.totalVisitors,
        activeVisits: data.overview.activeVisits,
        todayVisits: data.overview.todayVisits,
      });
      setVisitorTrends(data.visitorTrends);
      setVisitStatusDist(data.visitStatusDistribution);
      setVisitCategoryDist(data.visitCategoryDistribution);
      setUserRoleDist(data.userRoleDistribution);
      setChainStats(data.chainStats);
    };

    const load = (attempt = 0) => {
      AnalyticsService.getSuperAdminDashboard(trendPeriod)
        .then((data) => {
          if (!cancelled) {
            applyDashboard(data);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          if (attempt < 2 && isBackendUnreachable(err)) {
            window.setTimeout(() => load(attempt + 1), 2000);
            return;
          }
          console.error('[SuperAdminOverview] load failed:', err);
          const message = isBackendUnreachable(err)
            ? getBackendUnreachableMessage()
            : 'Failed to load dashboard data. Check the console and ensure the Python API is running.';
          setError(message);
        });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, reloadKey, trendPeriod]);

  // Branch counts per chain
  const branchCounts = useMemo(
    () =>
      chains.map(
        (c) => branches.filter((b) => b.hospitalChainId === c.id).length,
      ),
    [chains, branches],
  );

  // Branch distribution doughnut
  const branchDoughnutData: ChartData<'doughnut', number[], string> = useMemo(() => {
    const colors = getNiceColors(chains.length || 1);
    return {
      labels: chains.map((c) => c.name),
      datasets: [
        {
          data: branchCounts,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 4,
        },
      ],
    };
  }, [chains, branchCounts]);

  const branchDoughnutOptions: ChartOptions<'doughnut'> = {
    cutout: '70%',
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: { color: '#374151', font: { size: 12 }, boxWidth: 16 },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const dataArr = context.dataset.data as number[];
            const total = dataArr.reduce((a, v) => a + v, 0);
            const val = context.parsed;
            const perc = total ? ((val / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${val} branches (${perc}%)`;
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 16 },
  };

  // Staff bar chart
  const staffBarData: ChartData<'bar', number[], string> = useMemo(() => {
    const colors = getNiceColors(chains.length || 1);
    return {
      labels: chains.map((c) => c.name),
      datasets: [
        {
          label: 'Staff Count',
          data: chains.map((c) => getChainTotalStaff(c.id)),
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [chains, getChainTotalStaff]);

  const staffBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<'bar'>[]) =>
            chains[items[0].dataIndex]?.name || '',
          label: (item) => `${item.parsed.y || item.parsed.x} staff`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { color: '#374151', font: { size: 13 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#374151', font: { size: 13 } },
      },
    },
    layout: { padding: 16 },
  };

  // Visitor trends line chart
  const visitorLineData: ChartData<'line', number[], string> = useMemo(() => ({
    labels: visitorTrends?.data.map((d) => d.label) || [],
    datasets: [
      {
        label: 'Total Visits',
        data: visitorTrends?.data.map((d) => d.visits) || [],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        pointRadius: 4,
        pointBackgroundColor: '#6366f1',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Check-Ins',
        data: visitorTrends?.data.map((d) => d.checkIns) || [],
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        pointRadius: 4,
        pointBackgroundColor: '#22c55e',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Check-Outs',
        data: visitorTrends?.data.map((d) => d.checkOuts) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        pointRadius: 4,
        pointBackgroundColor: '#8b5cf6',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
    ],
  }), [visitorTrends]);

  const visitorLineOptions: ChartOptions<'line'> = {
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#374151', usePointStyle: true },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      x: { ticks: { color: '#374151' }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { color: '#374151' },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  // Visit status doughnut
  const visitStatusData: ChartData<'doughnut', number[], string> = useMemo(() => ({
    labels: visitStatusDist.map((d) => d.status.replace(/_/g, ' ')),
    datasets: [
      {
        data: visitStatusDist.map((d) => d.count),
        backgroundColor: visitStatusDist.map((d) => STATUS_COLORS[d.status] || '#94a3b8'),
        borderColor: '#fff',
        borderWidth: 3,
      },
    ],
  }), [visitStatusDist]);

  // Visit category pie
  const visitCategoryData: ChartData<'pie', number[], string> = useMemo(() => ({
    labels: visitCategoryDist.map((d) => d.category),
    datasets: [
      {
        data: visitCategoryDist.map((d) => d.count),
        backgroundColor: ['#6366f1', '#22c55e'],
        borderColor: '#fff',
        borderWidth: 3,
      },
    ],
  }), [visitCategoryDist]);

  // User role distribution bar
  const userRoleData: ChartData<'bar', number[], string> = useMemo(() => ({
    labels: userRoleDist.map((d) => ROLE_DISPLAY_NAMES[d.role] || d.role),
    datasets: [
      {
        label: 'Users',
        data: userRoleDist.map((d) => d.count),
        backgroundColor: getNiceColors(userRoleDist.length),
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  }), [userRoleDist]);

  const userRoleOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#374151' } },
    },
  };

  function handleViewDetails(chain: HospitalChain) {
    setSelectedChain(chain);
    setIsDialogOpen(true);
  }



  if (error) {
    return (
      <div className="w-full min-h-[240px] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-600 max-w-md">{error}</p>
        <Button type="button" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          Super Admin Dashboard
        </h1>
        <p className="text-slate-600 text-base md:text-lg">
          Real-time monitoring of all chains, branches & visitors
        </p>
      </div>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-0 shadow-lg shadow-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Chains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {metrics.totalChains}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg shadow-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100 flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {metrics.totalBranches}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-0 shadow-lg shadow-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {metrics.totalStaff}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-lg shadow-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {metrics.totalVisitors}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 shadow-lg shadow-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {metrics.activeVisits}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-pink-500 border-0 shadow-lg shadow-rose-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-100 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {metrics.todayVisits}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Visitor Trends Card */}
      <section className="mb-8">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
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
          <CardContent className="h-80">
            <Line data={visitorLineData} options={visitorLineOptions} />
          </CardContent>
        </Card>
      </section>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Visit Status Distribution */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Visit Status
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <Doughnut
              data={visitStatusData}
              options={{
                cutout: '60%',
                plugins: {
                  legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                },
                maintainAspectRatio: false,
              }}
            />
          </CardContent>
        </Card>

        {/* Visit Category */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Visit Category
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <Pie
              data={visitCategoryData}
              options={{
                plugins: {
                  legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14 } },
                },
                maintainAspectRatio: false,
              }}
            />
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Branch Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <Doughnut data={branchDoughnutData} options={{ ...branchDoughnutOptions, plugins: { ...branchDoughnutOptions.plugins, legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } } } }} />
          </CardContent>
        </Card>

        {/* User Role Distribution */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              User Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <Bar data={userRoleData} options={userRoleOptions} />
          </CardContent>
        </Card>
      </section>

      {/* Staff by Chain */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Staff by Chain
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <Bar data={staffBarData} options={staffBarOptions} />
          </CardContent>
        </Card>

        {/* Chains Table */}
        <Card className="bg-white border border-slate-200 shadow-sm ">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Hospital Chains Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="p-2 text-left font-semibold text-slate-700">#</th>
                    <th className="p-2 text-left font-semibold text-slate-700">Name</th>
                    <th className="p-2 text-center font-semibold text-slate-700">Branches</th>
                    <th className="p-2 text-center font-semibold text-slate-700">Staff</th>
                    <th className="p-2 text-center font-semibold text-slate-700">Visitors</th>
                    <th className="p-2 text-center font-semibold text-slate-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {chains.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No hospital chains found.
                      </td>
                    </tr>
                  ) : (
                    chains.map((chain, idx) => {
                      const branchCount = branches.filter(
                        (b) => b.hospitalChainId === chain.id,
                      ).length;
                      return (
                        <tr
                          key={chain.id}
                          className="hover:bg-slate-50 transition border-b border-slate-100"
                        >
                          <td className="p-2 text-slate-600">{idx + 1}</td>
                          <td className="p-2 font-medium text-slate-900">{chain.name}</td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {branchCount}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                              {getChainTotalStaff(chain.id)}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              {getChainVisitors(chain.id)}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(chain)}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Branch Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              {selectedChain?.name} - Branches
            </DialogTitle>
          </DialogHeader>
          {selectedChain && (
            <div className="pt-2 overflow-auto max-h-96">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 font-semibold text-slate-700 text-left rounded-tl-lg">Branch</th>
                    <th className="p-3 font-semibold text-slate-700 text-left">City</th>
                    <th className="p-3 font-semibold text-slate-700 text-left">Phone</th>
                    <th className="p-3 font-semibold text-slate-700 text-center">Staff</th>
                    <th className="p-3 font-semibold text-slate-700 text-center rounded-tr-lg">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.filter(
                    (b) => b.hospitalChainId === selectedChain.id,
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No branches found.
                      </td>
                    </tr>
                  ) : (
                    branches
                      .filter((b) => b.hospitalChainId === selectedChain.id)
                      .map((b) => (
                        <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-3 font-medium text-slate-900">{b.name}</td>
                          <td className="p-3 text-slate-600">{b.city}</td>
                          <td className="p-3 text-slate-600">{b.phone}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                              {staff.filter((u) => u.branchId === b.id).length}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              {chainStats.find((c) => c.chainId === selectedChain.id)?.totalVisitors || 0}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="pt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-slate-300 hover:bg-slate-100"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
