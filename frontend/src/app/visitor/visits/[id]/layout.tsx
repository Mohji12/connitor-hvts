/** Placeholder for static export; real visit IDs resolve from the URL. */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function VisitorVisitDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
