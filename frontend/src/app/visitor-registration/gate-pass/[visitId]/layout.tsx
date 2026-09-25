import { DEMO_VISIT_IDS } from '@/lib/demo-visit-ids';

export function generateStaticParams() {
  return DEMO_VISIT_IDS.map((visitId) => ({ visitId }));
}

export default function GatePassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
