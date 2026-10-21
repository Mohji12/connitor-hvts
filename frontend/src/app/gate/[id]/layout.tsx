/** Placeholder for static export; real branch ids resolve from the URL. */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function HospitalGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
