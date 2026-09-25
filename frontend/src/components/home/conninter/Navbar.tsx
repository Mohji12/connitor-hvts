'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Hospitals', href: '#hospitals' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Partners', href: '#hospitals' },
  { label: 'Demo', href: '/demo' },
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
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-extrabold tracking-tight text-primary">
            CONN
            <span className="relative inline-block">
              I
              <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#4A90E2]" />
            </span>
            NTER
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
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

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" size="sm" asChild>
            <Link href="/portal">Sign In</Link>
          </Button>
          <Button variant="brand" size="sm" className="!rounded-full px-5 font-semibold" asChild>
            <Link href="/portal?intent=register">Get Started</Link>
          </Button>
        </div>

        <button
          type="button"
          className="p-2 md:hidden"
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
            <div className="flex flex-col gap-3 p-4">
              {navLinks.map((l) =>
                l.href.startsWith('/') ? (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="py-2 text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    className="py-2 text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </a>
                ),
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href="/portal">Sign In</Link>
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  className="flex-1 !rounded-full font-semibold"
                  asChild
                >
                  <Link href="/portal?intent=register">Get Started</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
