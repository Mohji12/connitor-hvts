'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import { DEMO_BRANCH_ID, IS_DEMO_MODE } from '@/lib/demo-config';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { useIsAppShell } from '@/hooks/use-mobile';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { HeartHandshake, Truck, UserRound } from 'lucide-react';

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
  | 'attendant-scan'
  | 'on-spot';

type ScanMode = 'check-in' | 'delivery-scan' | 'attendant-scan';

const SCAN_MODES: { value: ScanMode; label: string; icon: React.ElementType }[] = [
  { value: 'check-in', label: 'Visitor', icon: UserRound },
  { value: 'delivery-scan', label: 'Delivery', icon: Truck },
  { value: 'attendant-scan', label: 'Attendant', icon: HeartHandshake },
];

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
    value === 'attendant-scan' ||
    value === 'on-spot'
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
  const appShell = useIsAppShell();
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

  if (!sessionUser) {
    return <ConnitorLoader variant="fullscreen" message="Loading dashboard…" />;
  }

  if (!user) {
    return <ConnitorLoader variant="section" message="Opening your dashboard…" className="min-h-[50vh] py-16" />;
  }

  if (appShell) {
    return (
      <MobileSecurityPanel
        activeTab={activeTab}
        branchId={branchId}
        branchName={branchName}
        authToken={authToken}
        appointmentsRefresh={appointmentsRefresh}
        onCheckInSuccess={handleCheckInSuccess}
        onScanModeChange={(mode) => router.replace(`/security/dashboard?tab=${mode}`)}
      />
    );
  }

  const panel = (
    <SecurityTabPanel
      activeTab={activeTab}
      branchId={branchId}
      branchName={branchName}
      authToken={authToken}
      appointmentsRefresh={appointmentsRefresh}
      onCheckInSuccess={handleCheckInSuccess}
    />
  );

  return (
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 lg:p-6">
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
        {panel}
      </div>
  );
}

function SecuritySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="bg-card rounded-lg border border-border shadow-sm" aria-labelledby={id}>
      <div className="px-4 py-3 border-b border-border">
        <h2 id={id} className="text-lg font-semibold text-card-foreground">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SecurityTabPanel({
  activeTab,
  branchId,
  branchName,
  authToken,
  appointmentsRefresh,
  onCheckInSuccess,
}: {
  activeTab: SecurityTab;
  branchId: string;
  branchName?: string;
  authToken: string;
  appointmentsRefresh: number;
  onCheckInSuccess: () => void;
}): React.ReactElement {
  if (activeTab === 'appointments') {
    return (
      <SecuritySection id="appointments-heading" title="Today's Appointments">
        <TodayAppointmentsTab branchId={branchId} refreshKey={appointmentsRefresh} />
      </SecuritySection>
    );
  }
  if (activeTab === 'visitor-passes') {
    return (
      <SecuritySection id="visitor-passes-heading" title="Visitor passes">
        <VisitorPassesTab branchId={branchId} refreshKey={appointmentsRefresh} />
      </SecuritySection>
    );
  }
  if (activeTab === 'logs') {
    return (
      <SecuritySection id="logs-heading" title="Visitor Logs">
        <LogsTab branchId={branchId} authToken={authToken} />
      </SecuritySection>
    );
  }
  if (activeTab === 'delivery-scan') {
    return (
      <SecuritySection id="delivery-scan-heading" title="Delivery Scan">
        <DeliveryScanTab branchId={branchId} />
      </SecuritySection>
    );
  }
  if (activeTab === 'attendant-scan') {
    return (
      <SecuritySection id="attendant-scan-heading" title="Attendant Pass Scan">
        <AttendantPassScanTab branchId={branchId} />
      </SecuritySection>
    );
  }
  if (activeTab === 'deliveries') {
    return (
      <SecuritySection id="deliveries-heading" title="Today's Deliveries">
        <TodayDeliveriesTab branchId={branchId} />
      </SecuritySection>
    );
  }
  if (activeTab === 'on-spot') {
    return <OnSpotQrPanel branchId={branchId} branchName={branchName} />;
  }
  return (
    <div className="space-y-6">
      <OnSpotQrPanel branchId={branchId} branchName={branchName} />
      <SecuritySection id="check-in-heading" title="Quick Check-In">
        <CheckInTab branchId={branchId} onCheckInSuccess={onCheckInSuccess} />
      </SecuritySection>
    </div>
  );
}

/** Phone / app layout: scan-first, no section chrome (the app top bar carries the title). */
function MobileSecurityPanel({
  activeTab,
  branchId,
  branchName,
  authToken,
  appointmentsRefresh,
  onCheckInSuccess,
  onScanModeChange,
}: {
  activeTab: SecurityTab;
  branchId: string;
  branchName?: string;
  authToken: string;
  appointmentsRefresh: number;
  onCheckInSuccess: () => void;
  onScanModeChange: (mode: ScanMode) => void;
}): React.ReactElement {
  if (activeTab === 'check-in' || activeTab === 'delivery-scan' || activeTab === 'attendant-scan') {
    return (
      <div className="space-y-4 p-4">
        <SegmentedControl
          value={activeTab}
          onChange={onScanModeChange}
          options={SCAN_MODES}
          ariaLabel="What are you scanning?"
        />
        {activeTab === 'check-in' ? (
          <CheckInTab branchId={branchId} onCheckInSuccess={onCheckInSuccess} />
        ) : activeTab === 'delivery-scan' ? (
          <DeliveryScanTab branchId={branchId} />
        ) : (
          <AttendantPassScanTab branchId={branchId} />
        )}
      </div>
    );
  }

  let content: React.ReactNode;
  switch (activeTab) {
    case 'appointments':
      content = <TodayAppointmentsTab branchId={branchId} refreshKey={appointmentsRefresh} />;
      break;
    case 'visitor-passes':
      content = <VisitorPassesTab branchId={branchId} refreshKey={appointmentsRefresh} />;
      break;
    case 'logs':
      content = <LogsTab branchId={branchId} authToken={authToken} />;
      break;
    case 'deliveries':
      content = <TodayDeliveriesTab branchId={branchId} />;
      break;
    default:
      content = <OnSpotQrPanel branchId={branchId} branchName={branchName} />;
  }
  return <div className="p-4">{content}</div>;
}
