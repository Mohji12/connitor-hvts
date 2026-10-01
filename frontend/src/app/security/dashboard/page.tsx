'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import { DEMO_BRANCH_ID, IS_DEMO_MODE } from '@/lib/demo-config';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { useResponsive } from '@/hooks/use-mobile';
import { ConnitorLoader } from '@/components/ConnitorLoader';

interface User {
  sub: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branchId?: string;
  branchName?: string;
  hospitalId?: string;
  hospitalChainName?: string;
  hospitalChain?: { name: string } | null;
  branch?: { name: string } | null;
}

type SecurityTab =
  | 'check-in'
  | 'appointments'
  | 'visitor-passes'
  | 'logs'
  | 'delivery-scan'
  | 'deliveries'
  | 'attendant-scan';

function PanelFallback(): React.ReactElement {
  return <div className="h-28 animate-pulse rounded-md bg-muted" aria-hidden="true" />;
}

const CheckInTab = dynamic(
  () => import('./components/CheckInTab').then((mod) => mod.CheckInTab),
  { loading: () => <PanelFallback /> },
);
const TodayAppointmentsTab = dynamic(
  () => import('./components/TodayAppointmentsTab').then((mod) => mod.TodayAppointmentsTab),
  { loading: () => <PanelFallback /> },
);
const TodayDeliveriesTab = dynamic(
  () => import('./components/TodayDeliveriesTab').then((mod) => mod.TodayDeliveriesTab),
  { loading: () => <PanelFallback /> },
);
const OnSpotQrPanel = dynamic(
  () => import('./components/OnSpotQrPanel').then((mod) => mod.OnSpotQrPanel),
  { loading: () => <PanelFallback /> },
);
const VisitorPassesTab = dynamic(
  () => import('./components/VisitorPassesTab').then((mod) => mod.VisitorPassesTab),
  { loading: () => <PanelFallback /> },
);
const LogsTab = dynamic(
  () => import('@/components/security/logs-tab/logs-tab').then((mod) => mod.LogsTab),
  { loading: () => <PanelFallback /> },
);
const DeliveryScanTab = dynamic(
  () => import('@/features/delivery-management/DeliveryScanTab').then((mod) => mod.DeliveryScanTab),
  { loading: () => <PanelFallback /> },
);
const AttendantPassScanTab = dynamic(
  () =>
    import('@/features/attendant-passes/AttendantPassScanTab').then((mod) => mod.AttendantPassScanTab),
  { loading: () => <PanelFallback /> },
);

function parseTab(value: string | null): SecurityTab {
  if (
    value === 'appointments' ||
    value === 'visitor-passes' ||
    value === 'logs' ||
    value === 'check-in' ||
    value === 'delivery-scan' ||
    value === 'deliveries' ||
    value === 'attendant-scan'
  ) {
    return value;
  }
  return 'check-in';
}

export default function SecurityDashboardPage(): React.ReactElement {
  return (
    <React.Suspense
      fallback={<ConnitorLoader variant="section" message="Opening your dashboard…" />}
    >
      <SecurityDashboard />
    </React.Suspense>
  );
}

function SecurityDashboard(): React.ReactElement {
  const searchParams = useSearchParams();
  const { isDesktop } = useResponsive();
  const sessionUser = useAuthSession<User>();
  const router = useRouter();
  const [isLive, setIsLive] = React.useState(true);
  const [appointmentsRefresh, setAppointmentsRefresh] = React.useState(0);

  const handleCheckInSuccess = React.useCallback(() => {
    setAppointmentsRefresh((key) => key + 1);
  }, []);

  React.useEffect(() => {
    if (sessionUser && sessionUser.role !== 'SECURITY' && sessionUser.role !== 'SECURITY_SUPERVISOR') {
      router.replace(getDashboardPathForRole(sessionUser.role));
    }
  }, [sessionUser, router]);

  const activeTab = parseTab(searchParams.get('tab'));
  const user =
    sessionUser?.role === 'SECURITY' || sessionUser?.role === 'SECURITY_SUPERVISOR'
      ? sessionUser
      : null;
  const authToken = IS_DEMO_MODE
    ? 'demo-mode'
    : typeof window !== 'undefined'
      ? (getStoredAuthToken() ?? '')
      : '';
  const branchId = user?.branchId ?? DEMO_BRANCH_ID;
  const branchName = user?.branchName ?? user?.branch?.name;

  React.useEffect(() => {
    const interval = setInterval(() => setIsLive(true), 5000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return <></>;
  }

  if (isDesktop) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Security Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage visitor check-ins and view logs
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border shrink-0"
            aria-live="polite"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-muted-foreground">
              {isLive ? 'System Live' : 'Offline'}
            </span>
          </div>
        </div>

        <OnSpotQrPanel branchId={branchId} branchName={branchName} />

        <section
          className="bg-card rounded-lg border border-border shadow-sm"
          aria-labelledby="appointments-heading"
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 id="appointments-heading" className="text-lg font-semibold text-card-foreground">
              Today&apos;s Appointments
            </h2>
          </div>
          <div className="p-4">
            <TodayAppointmentsTab branchId={branchId} refreshKey={appointmentsRefresh} />
          </div>
        </section>

        <section
          className="bg-card rounded-lg border border-border shadow-sm"
          aria-labelledby="visitor-passes-heading"
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 id="visitor-passes-heading" className="text-lg font-semibold text-card-foreground">
              Visitor passes
            </h2>
          </div>
          <div className="p-4">
            <VisitorPassesTab branchId={branchId} refreshKey={appointmentsRefresh} />
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section
            className="bg-card rounded-lg border border-border shadow-sm"
            aria-labelledby="delivery-scan-heading"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 id="delivery-scan-heading" className="text-lg font-semibold text-card-foreground">
                Delivery Scan
              </h2>
            </div>
            <div className="p-4">
              <DeliveryScanTab branchId={branchId} />
            </div>
          </section>

          <section
            className="bg-card rounded-lg border border-border shadow-sm"
            aria-labelledby="deliveries-heading"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 id="deliveries-heading" className="text-lg font-semibold text-card-foreground">
                Today&apos;s Deliveries
              </h2>
            </div>
            <div className="p-4">
              <TodayDeliveriesTab branchId={branchId} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section
            className="bg-card rounded-lg border border-border shadow-sm"
            aria-labelledby="check-in-heading"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 id="check-in-heading" className="text-lg font-semibold text-card-foreground">
                Quick Check-In
              </h2>
            </div>
            <div className="p-4">
              <CheckInTab branchId={branchId} onCheckInSuccess={handleCheckInSuccess} />
            </div>
          </section>

          <section
            className="bg-card rounded-lg border border-border shadow-sm"
            aria-labelledby="attendant-scan-heading"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 id="attendant-scan-heading" className="text-lg font-semibold text-card-foreground">
                Attendant Pass Scan
              </h2>
            </div>
            <div className="p-4">
              <AttendantPassScanTab branchId={branchId} />
            </div>
          </section>

          <section
            className="bg-card rounded-lg border border-border shadow-sm xl:col-span-2"
            aria-labelledby="logs-heading"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 id="logs-heading" className="text-lg font-semibold text-card-foreground">
                Visitor Logs
              </h2>
            </div>
            <div className="p-4">
              <LogsTab branchId={branchId} authToken={authToken} />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <OnSpotQrPanel branchId={branchId} branchName={branchName} />
      {activeTab === 'check-in' ? (
        <CheckInTab branchId={branchId} onCheckInSuccess={handleCheckInSuccess} />
      ) : activeTab === 'appointments' ? (
        <TodayAppointmentsTab branchId={branchId} refreshKey={appointmentsRefresh} />
      ) : activeTab === 'visitor-passes' ? (
        <VisitorPassesTab branchId={branchId} refreshKey={appointmentsRefresh} />
      ) : activeTab === 'delivery-scan' ? (
        <DeliveryScanTab branchId={branchId} />
      ) : activeTab === 'attendant-scan' ? (
        <AttendantPassScanTab branchId={branchId} />
      ) : activeTab === 'deliveries' ? (
        <TodayDeliveriesTab branchId={branchId} />
      ) : (
        <LogsTab branchId={branchId} authToken={authToken} />
      )}
    </div>
  );
}
