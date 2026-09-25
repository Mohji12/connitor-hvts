'use client';

import Link from 'next/link';
import { Linkedin, Twitter, Instagram } from 'lucide-react';

const productLinks = [
  { label: 'Hospitals', href: '#hospitals' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Book appointment', href: '/book-appointment' },
  { label: 'Visitor register', href: '/visitor/register' },
];

const companyLinks = [
  { label: 'About Us', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Partners', href: '#hospitals' },
  { label: 'Contact', href: '#' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
  { label: 'HIPAA Compliance', href: '#' },
];

const staffLinks = [
  { label: 'Portal hub', href: '/portal' },
  { label: 'Staff login', href: '/auth/login' },
  { label: 'Attendant pass', href: '/attendant-pass' },
  { label: 'Vendor register', href: '/vendor/register' },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} className="text-sm text-white/65 transition-colors hover:text-white">
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className="text-sm text-white/65 transition-colors hover:text-white">
      {label}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#001B71] py-12 text-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-8 grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <h3 className="mb-2 text-lg font-extrabold">
              CONN
              <span className="relative inline-block">
                I
                <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#4A90E2]" />
              </span>
              NTER
            </h3>
            <p className="mb-2 text-sm font-medium text-white/85">Meetings Made Easy</p>
            <p className="text-sm text-white/65">
              India&apos;s most advanced platform for medical rep scheduling and hospital visitor
              management.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold">For hospitals &amp; staff</h4>
            <ul className="space-y-2">
              {staffLinks.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/55" suppressHydrationWarning>
            © {new Date().getFullYear()} Conninter. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {[Linkedin, Twitter, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="text-white/55 transition-colors hover:text-white">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
