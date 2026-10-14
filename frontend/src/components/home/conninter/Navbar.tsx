'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';

const navLinks = [
  { label: 'Hospitals', href: '#hospitals' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Partners', href: '#hospitals' },
  { label: 'Demo', href: '/demo' },
];

const accessLinks = [
  { label: 'Attendant pass', href: '/attendant-pass' },
  { label: 'Visitor pass', href: '/visitor-pass' },
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
        scrolled ? 'bg-background/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t bg-background md:hidden"
          >
            <div className="flex flex-col gap-1.5 p-3">
              {navLinks.map((l) =>
                l.href.startsWith('/') ? (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="py-1.5 text-xs font-medium text-muted-foreground sm:text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    className="py-1.5 text-xs font-medium text-muted-foreground sm:text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </a>
                ),
              )}
              <div className="flex flex-col gap-1.5 pt-1.5">
                {accessLinks.map((item) => (
                  <Button key={item.href} variant="outline" size="sm" className="!rounded-full" asChild>
                    <Link href={item.href} onClick={() => setMobileOpen(false)}>
                      {item.label}
                    </Link>
                  </Button>
                ))}
                <Button variant="brand" size="sm" className="!rounded-full" asChild>
                  <Link href="/staff/login" onClick={() => setMobileOpen(false)}>
                    Staff login
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
