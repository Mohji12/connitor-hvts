/** Placeholder for static export; real tokens resolve from the URL. */
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ProfileCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
