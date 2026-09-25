'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useOverviewSessionUser } from '@/hooks/useOverviewSessionUser';
import { IS_DEMO_MODE } from '@/lib/demo-config';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { jwtDecode } from 'jwt-decode';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { VisitorService } from '@/lib/services/visitorService';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { Shield, Clock, Users, Phone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getLocalDateISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type ActiveVisitor = {
  id: number;
  visitorName?: string;
  visitorType?: string;
  visitorPhone?: string;
  checkInTime: string;
  purpose?: string;
  checkedInLocation?: string;
  personToMeet?: string;
  department?: string;
  entryGate?: string;
};

type VisitorSummary = {
  id: number;
  visitorName: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  purpose?: string;
  department?: string;
  checkedInLocation?: string;
  visitorPhone?: string;
  personToMeet?: string;
  visitorType?: string;
  entryGate?: string;
};

type TrendPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface DecodedToken {
  branchId?: string;
}

export default function SecurityOverview() {
  const demoUser = useOverviewSessionUser<{ branchId?: string | null }>();
  const todayISO = getLocalDateISO();
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

    if (IS_DEMO_MODE) {
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

  // Fetch active visitors
  const { data: activeVisitors = [] } = useSWR<ActiveVisitor[]>(
    'active-visitors',
    async () => {
      try {
        const result = await VisitorService.getActiveVisitors();
        return result ?? [];
      } catch (error) {
        console.error('Error fetching active visitors:', error);
        return [];
      }
    },
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  // Fetch today's summary
  const { data: summary = [] } = useSWR<VisitorSummary[]>(
    ['visitor-summary', todayISO],
    async () => {
      try {
        const res = await VisitorService.getVisitorSummary({ date: todayISO });
        return res?.data ?? [];
      } catch (error) {
        console.error('Error fetching visitor summary:', error);
        return [];
      }
    },
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  // Fetch visitor trends based on period
  const { data: visitorTrends } = useSWR(
    branchId ? ['security-visitor-trends', branchId, trendPeriod] : null,
    () => AnalyticsService.getSecurityVisitorTrends(branchId!, trendPeriod),
    { refreshInterval: DASHBOARD_REFRESH_MS },
  );

  // KPIs
  const pendingCount = summary.filter((v) => v.status === 'PENDING').length;
  const totalCheckIns = summary.filter((v) => v.status === 'CHECKED_IN' || v.checkInTime).length;

  // 1 Hour overstay limit (60 minutes)
  const OVERSTAY_LIMIT = 60 * 60 * 1000;

  // Overstay visitors (> 1 hour)
  const overstayVisitors = useMemo(() => {
    const currentTime = Date.now();
    const overstays: ActiveVisitor[] = [];

    activeVisitors.forEach((v) => {
      if (v.checkInTime) {
        const checkInTime = new Date(v.checkInTime).getTime();
        if (currentTime - checkInTime > OVERSTAY_LIMIT) {
          overstays.push(v);
        }
      }
    });

    summary.forEach((sv) => {
      if (sv.status === 'CHECKED_IN' && sv.checkInTime) {
        const checkInTime = new Date(sv.checkInTime).getTime();
        if (currentTime - checkInTime > OVERSTAY_LIMIT) {
          const exists = overstays.some((o) => o.id === sv.id);
          if (!exists) {
            overstays.push({
              id: sv.id,
              visitorName: sv.visitorName,
              visitorPhone: sv.visitorPhone,
              checkInTime: sv.checkInTime,
              purpose: sv.purpose,
              personToMeet: sv.personToMeet,
              department: sv.department,
            });
          }
        }
      }
    });

    return overstays;
  }, [activeVisitors, summary, OVERSTAY_LIMIT]);

  // Chart data from trends API
  const lineChartData = useMemo(() => {
    if (!visitorTrends?.data || visitorTrends.data.length === 0) {
      return { labels: [], datasets: [] };
    }
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
    };
  }, [visitorTrends]);

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', maxRotation: 45, font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: { color: '#64748b', stepSize: 1 },
      },
    },
  };

  const handleCallVisitor = (phone?: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const periodButtons: { value: TrendPeriod; label: string }[] = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          Security Dashboard
        </h1>
        <div className="flex items-center gap-2 mt-2 text-slate-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{clientDate || '—'}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md w-fit">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{activeVisitors.length}</p>
              <p className="text-sm text-slate-500 mt-1">Currently Inside</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md w-fit">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500 mt-1">Pending Approvals</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md w-fit">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{overstayVisitors.length}</p>
              <p className="text-sm text-slate-500 mt-1">Overstay Alerts (1hr+)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md w-fit">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{totalCheckIns}</p>
              <p className="text-sm text-slate-500 mt-1">Today&apos;s Check-ins</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Visitor Traffic Chart with Period Selector */}
      <section className="mb-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                Visitor Traffic
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {periodButtons.map((btn) => (
                  <Button
                    key={btn.value}
                    size="sm"
                    variant={trendPeriod === btn.value ? 'default' : 'outline'}
                    onClick={() => setTrendPeriod(btn.value)}
                    className="cursor-pointer text-xs"
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 min-w-0">
              {visitorTrends ? (
                <Line data={lineChartData} options={lineOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>Loading chart data...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Overstay Visitors Section */}
      <section>
        <Card className="border-0 shadow-md border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Overstay Alerts (1hr+)
              {overstayVisitors.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {overstayVisitors.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overstayVisitors.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No visitors overstaying the 1-hour limit</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {overstayVisitors.map((visitor) => {
                    const checkInTime = new Date(visitor.checkInTime).getTime();
                    const durationMs = Date.now() - checkInTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

                    return (
                      <div key={visitor.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{visitor.visitorName || 'Unknown'}</p>
                          <p className="text-sm text-slate-500">
                            Meeting: {visitor.personToMeet || 'N/A'} • Purpose: {visitor.purpose || 'N/A'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="text-slate-600">Check-in: {formatTime(visitor.checkInTime)}</span>
                            <Badge variant="destructive" className="text-xs">
                              {durationHours}h {durationMins}m
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {visitor.visitorPhone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCallVisitor(visitor.visitorPhone)}
                              className="flex items-center gap-2 cursor-pointer border-green-500 text-green-600 hover:bg-green-50"
                            >
                              <Phone className="h-4 w-4" />
                              {visitor.visitorPhone}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
