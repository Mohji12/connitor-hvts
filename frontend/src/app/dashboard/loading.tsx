import { ConnitorLoader } from '@/components/ConnitorLoader';

export default function DashboardLoading() {
  return (
    <ConnitorLoader
      variant="section"
      message="Loading page…"
      className="min-h-[50vh] py-16"
    />
  );
}
