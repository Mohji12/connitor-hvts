'use client';

import Link from 'next/link';
import { Building2, IdCard, Shield, Truck, LayoutGrid } from 'lucide-react';

const STAFF_LINKS = [
  { label: 'Staff login', href: '/staff/login', icon: Building2 },
  { label: 'Security', href: '/security/login', icon: Shield },
  { label: 'Attendant pass', href: '/attendant-pass', icon: IdCard },
  { label: 'Vendor', href: '/vendor/register', icon: Truck },
  { label: 'Portal hub', href: '/portal', icon: LayoutGrid },
] as const;

export default function StaffAccessStrip() {
  return (
    <section
      aria-label="Hospital staff and partner access"
      className="border-y border-[#001B71]/10 bg-[#001B71]/[0.04]"
    >
      <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between lg:px-8">
        <p className="text-sm font-semibold text-[#001B71]">For hospitals &amp; staff</p>
        <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {STAFF_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#001B71]/15 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#001B71] transition-colors hover:border-[#4A90E2]/40 hover:bg-[#4A90E2]/10"
            >
              <Icon className="h-3.5 w-3.5 text-[#4A90E2]" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
