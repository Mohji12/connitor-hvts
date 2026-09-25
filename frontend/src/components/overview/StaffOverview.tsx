'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IST_TIMEZONE, todayIstDateIso } from '@/lib/datetime';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import { hasRealAuthSession, IS_DEMO_MODE } from '@/lib/demo-config';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { jwtDecode } from 'jwt-decode';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
import { StaffService } from '@/lib/services/staffService';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';

type TrendPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface DecodedToken {
  branchId?: string;
}

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

// Function to generate colors matching SuperAdminOverview
function getNiceColors(n: number) {
  return Array.from({ length: n }).map(
    (_, i) => `hsl(${(360 * i) / n}, 50%, 65%)`, // Muted colors: lower saturation (50%), mid lightness (65%)
  );
}

// Light color palette (retained for other charts, e.g., line)
const CHART_COLORS = {
  primary: '#93C5FD', // Light blue
  secondary: '#A7F3D0', // Light green
  tertiary: '#E0E7FF', // Light purple
  quaternary: '#FED7AA', // Light orange
  background: 'rgba(147, 197, 253, 0.1)', // Light blue with transparency
  border: '#D1D5DB', // Light gray border
} as const;

interface Visitor {
  // API may return either a single 'name' string or separate name parts; make these optional
  name?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  phone: string;
}

interface VisitorRequest {
  id: string; // changed from number to string
  visitor: Visitor;
  createdAt: string;
  purpose: string;
  notes?: string;
  status: string;
}

interface Appointment {
  id: string; // changed from number to string
  visitor: Visitor;
  createdAt: string;
  purpose: string;
  status: string;
  entryGate?: string;
}

export default function StaffOverview() {
  const demoUser = useOverviewSessionUser<{ branchId?: string | null }>();
  const todayISO = todayIstDateIso();
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('hourly');
  const [branchId, setBranchId] = useState<string | null>(null);

  const [clientDate, setClientDate] = useState('');
  useEffect(() => {
    setClientDate(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    );

    if (IS_DEMO_MODE && !hasRealAuthSession()) {
      setBranchId(demoUser?.branchId ?? null);
      return;
    }

    const token = getStoredAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setBranchId(decoded.branchId || null);
      } catch {
        console.error('Failed to decode token');
      }
    }
  }, [demoUser?.branchId]);

  // Fetch data
  const {
    data: pendingRequests = [],
    error: pendingError,
    isLoading: isPendingLoading,
  } = useSWR<VisitorRequest[]>(
    '/api/staff/pending-visits',
    StaffService.getPendingVisits,
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const {
    data: visitorHistory = [],
    error: historyError,
    isLoading: isHistoryLoading,
  } = useSWR<Appointment[]>(
    '/api/staff/history',
    StaffService.getVisitorHistory,
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  // Fetch visitor trends based on period
  const { data: visitorTrends } = useSWR(
    branchId ? ['staff-visitor-trends', branchId, trendPeriod] : null,
    () => AnalyticsService.getStaffVisitorTrends(branchId!, trendPeriod),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  const isLoading = isPendingLoading || isHistoryLoading;
  const error = pendingError || historyError;

  // KPI counts
  const pendingCount = pendingRequests.length;
  const todaysAppointmentCount = useMemo(
    () =>
      visitorHistory.filter(
        (appt) =>
          appt.createdAt.slice(0, 10) === todayISO &&
          ['APPROVED', 'CHECKED_IN'].includes(appt.status),
      ).length,
    [visitorHistory, todayISO],
  );
  const currentlyVisitingCount = useMemo(
    () => visitorHistory.filter((v) => v.status === 'CHECKED_IN').length,
    [visitorHistory],
  );

  // Calculate range for the last 7 days (used by charts below)
  const last7Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(
        new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(d),
      );
    }
    return days;
  }, []);

  // Purpose distribution (from last 7 days)
  const purposeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visitorHistory.forEach((v) => {
      const date = v.createdAt.slice(0, 10);
      if (last7Days.includes(date)) {
        counts[v.purpose?.trim() || 'Unknown'] =
          (counts[v.purpose?.trim() || 'Unknown'] || 0) + 1;
      }
    });
    return counts;
  }, [visitorHistory, last7Days]);

  // Bar Chart for Distribution by Purpose
  const barDataPurpose = useMemo(() => {
    const colors = getNiceColors(Object.keys(purposeCounts).length || 1);
    return {
      labels: Object.keys(purposeCounts),
      datasets: [
        {
          label: 'Visitors',
          data: Object.values(purposeCounts),
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [purposeCounts]);

  // Appointments status distribution (from last 7 days)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visitorHistory.forEach((v) => {
      const date = v.createdAt.slice(0, 10);
      if (last7Days.includes(date)) {
        counts[v.status || 'Unknown'] =
          (counts[v.status || 'Unknown'] || 0) + 1;
      }
    });
    return counts;
  }, [visitorHistory, last7Days]);

  // Pie Chart for Appointments Status (using same colors as SuperAdminOverview)
  const pieDataStatus = useMemo(() => {
    const colors = getNiceColors(Object.keys(statusCounts).length || 1);
    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: colors,
          borderColor: '#fff', // White border to match SuperAdminOverview
          borderWidth: 4, // Match SuperAdminOverview doughnut chart
          hoverOffset: 12, // Match hover behavior
        },
      ],
    };
  }, [statusCounts]);

  // Enhanced chart options
  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#93C5FD', // Light blue
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#374151', // Dark gray for better visibility
            font: {
              size: 12,
              weight: 500,
            },
            maxRotation: 0,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: CHART_COLORS.border,
            borderDash: [5, 5],
          },
          ticks: {
            color: '#374151', // Dark gray for better visibility
            font: {
              size: 11,
            },
            padding: 8,
          },
          border: {
            display: false,
          },
        },
      },
    }),
    [],
  );

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          labels: {
            color: '#000000',
            font: {
              size: 12,
              weight: 500,
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#E0E7FF', // Light purple
          borderWidth: 1,
          cornerRadius: 6,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function (context: {
              label: string;
              parsed: number;
              dataset: { data: number[] };
            }) {
              const total = context.dataset.data.reduce(
                (a: number, b: number) => a + b,
                0,
              );
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
      cutout: '70%', // Increased to make the doughnut chart thinner
    }),
    [],
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#A7F3D0', // Light green
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: false,
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#000000',
            font: {
              size: 12,
              weight: 500,
            },
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: CHART_COLORS.border,
            borderDash: [5, 5],
          },
          ticks: {
            color: '#000000',
            font: {
              size: 11,
            },
            padding: 8,
            stepSize: 1,
          },
          border: {
            display: false,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    }),
    [],
  );

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          Staff Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-2">{clientDate || '—'}</p>
      </header>

      {error && (
        <div className="mb-6 text-gray-700 font-medium bg-gray-50 border-l-4 border-gray-400 p-4 rounded-lg shadow-sm">
          <p>An error occurred while loading the dashboard data.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-gray-600 underline mt-2 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md w-fit">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500 mt-1">Pending Requests</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md w-fit">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{todaysAppointmentCount}</p>
              <p className="text-sm text-slate-500 mt-1">Today&apos;s Appointments</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md w-fit">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{currentlyVisitingCount}</p>
              <p className="text-sm text-slate-500 mt-1">Currently Visiting</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-800 font-semibold flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
              Distribution by Purpose (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-6">
            {Object.keys(purposeCounts).length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div>No data available</div>
                </div>
              </div>
            ) : (
              <Bar data={barDataPurpose} options={barOptions} />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-gray-800 font-semibold flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-200 rounded-full"></div>
              Appointments Status (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-6">
            {Object.keys(statusCounts).length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">🥧</div>
                  <div>No data available</div>
                </div>
              </div>
            ) : (
              <Pie data={pieDataStatus} options={pieOptions} />
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-gray-800 font-semibold flex items-center gap-2">
                <div className="w-3 h-3 bg-green-200 rounded-full"></div>
                Visitor Traffic
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {(['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as TrendPeriod[]).map((period) => (
                  <Button
                    key={period}
                    size="sm"
                    variant={trendPeriod === period ? 'default' : 'outline'}
                    onClick={() => setTrendPeriod(period)}
                    className="cursor-pointer text-xs capitalize"
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-80 p-6 min-w-0">
            {visitorTrends?.data && visitorTrends.data.length > 0 ? (
              <Line 
                data={{
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
                      borderWidth: 2,
                    },
                    {
                      label: 'Check-outs',
                      data: visitorTrends.data.map((d) => d.checkOuts),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 4,
                      borderWidth: 2,
                    },
                  ],
                }} 
                options={lineOptions} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <div>Loading chart data...</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
