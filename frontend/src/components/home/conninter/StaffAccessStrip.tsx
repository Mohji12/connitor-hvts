'use client';

import Link from 'next/link';
import { Building2, IdCard, Shield, Truck } from 'lucide-react';

const STAFF_LINKS = [
  { id: 'staff-login', label: 'Staff login', href: '/portal/hospital-staff', icon: Building2 },
  { id: 'delivery-login', label: 'Delivery login', href: '/portal/delivery', icon: Truck },
  { id: 'security', label: 'Security', href: '/security/login', icon: Shield },
  { id: 'attendant-pass', label: 'Attendant pass', href: '/attendant-pass', icon: IdCard },
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
          {STAFF_LINKS.map(({ id, label, href, icon: Icon }) => (
            <Link
              key={id}
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
