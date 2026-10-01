import { ConnitorLoader } from '@/components/ConnitorLoader';

export default function SecurityDashboardLoading() {
  return (
    <ConnitorLoader variant="fullscreen" message="Opening your dashboard…" />
  );
}
