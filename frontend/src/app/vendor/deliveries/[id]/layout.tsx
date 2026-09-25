/** Placeholder for static export; real IDs resolve client-side / Amplify 404 rewrite. */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function VendorDeliveryDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
