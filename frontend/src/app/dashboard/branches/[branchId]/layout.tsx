/** Placeholder for static export; real branch IDs resolve from the browser URL. */
export function generateStaticParams() {
  return [{ branchId: '_' }];
}

export default function ChainBranchReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
