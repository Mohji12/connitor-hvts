import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'Create profile', href: '/visitor/register' },
  { label: 'Sign in', href: '/visitor/login' },
  { label: 'Book appointment', href: '/book-appointment' },
  { label: 'How it works', href: '/book-appointment/how-it-works' },
  { label: 'Distributor apply', href: '/vendor/register' },
  { label: 'Hospital staff', href: '#staff-portals' },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-teal-100/80 bg-white/50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="mb-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-teal-800 hover:text-teal-900 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-center text-sm text-slate-500" suppressHydrationWarning>
          © {new Date().getFullYear()} Connitor · Hospital Visitor Tracking System
        </p>
      </div>
    </footer>
  );
}
