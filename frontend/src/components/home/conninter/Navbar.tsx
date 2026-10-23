'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navLinks = [
  { label: 'Hospitals', href: '#hospitals' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Partners', href: '#hospitals' },
  { label: 'Demo', href: '/demo' },
];

const accessLinks = [
  { label: 'Visitor pass', href: '/visitor-pass' },
  { label: 'Online session', href: '/online-session' },
  { label: 'Meet a distributor', href: '/book-distributor-visit' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto flex h-16 min-w-0 items-center justify-between gap-2 px-4 lg:h-20 lg:px-8">
        <span className="min-w-0 md:hidden">
          <ConninterWordmark size="md" />
        </span>
        <span className="hidden md:inline-flex">
          <ConninterWordmark size="lg" />
        </span>

        <div className="hidden items-center gap-8 xl:flex">
          {navLinks.map((l) =>
            l.href.startsWith('/') ? (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ),
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {accessLinks.map((item) => (
            <Button key={item.href} variant="outline" size="sm" className="!rounded-full" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>

        <button
          type="button"
          className="-mr-2 shrink-0 p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="pb-safe max-h-[85dvh] gap-0 rounded-t-2xl p-0 md:hidden">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
          <SheetHeader className="px-4 pb-2 pt-3">
            <SheetTitle className="m-title">Menu</SheetTitle>
            <SheetDescription className="sr-only">Passes, staff sign-in and site links</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-5">
            <div className="flex flex-col gap-2">
              {accessLinks.map((item) => (
                <Button key={item.href} variant="outline" className="h-12 !rounded-xl text-sm" asChild>
                  <Link href={item.href} onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </Link>
                </Button>
              ))}
              <Button variant="brand" className="h-12 !rounded-xl text-sm" asChild>
                <Link href="/staff/login" onClick={() => setMobileOpen(false)}>
                  Staff login
                </Link>
              </Button>
            </div>
            <ul className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {navLinks.map((l) => {
                const className = 'flex min-h-12 items-center px-3 m-body active:bg-muted';
                return (
                  <li key={l.label} className="border-b border-slate-100 last:border-b-0">
                    {l.href.startsWith('/') ? (
                      <Link href={l.href} className={className} onClick={() => setMobileOpen(false)}>
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className={className} onClick={() => setMobileOpen(false)}>
                        {l.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
