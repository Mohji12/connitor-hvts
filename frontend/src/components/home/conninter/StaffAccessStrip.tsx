'use client';

import Link from 'next/link';

const STAFF_LINKS = [
  { label: 'Staff', href: '/staff/login' },
  { label: 'Distributor', href: '/delivery/login' },
] as const;

export default function StaffAccessStrip() {
  return (
    <section aria-label="Staff and distributor sign in" className="bg-background">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-3 px-4 py-8 lg:px-8">
        {STAFF_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center rounded-full border border-[#001B71]/15 bg-white px-5 py-2 text-sm font-medium text-[#001B71] transition-colors hover:border-[#4A90E2]/40 hover:bg-[#4A90E2]/10"
          >
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
