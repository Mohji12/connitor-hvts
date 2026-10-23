'use client';

import Link from 'next/link';
import { Building2, CalendarCheck, Video } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';

const PORTAL_ACTIONS = [
  { label: 'Visitor pass', href: '/visitor-pass', icon: CalendarCheck },
  { label: 'Online session', href: '/online-session', icon: Video },
  { label: 'Meet a distributor', href: '/book-distributor-visit', icon: Building2 },
] as const;

function PortalContent() {
  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/15 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-[#001B71]/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[#001B71]/08 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <ConninterWordmark size="md" />
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Choose how to continue
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Book an in-person visit, start an online video session with a doctor, or meet a
            distributor at their office. Family visit passes for admitted patients start by
            scanning the hospital QR at reception or the gate.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_ACTIONS.map(({ label, href, icon: Icon }) => (
            <Button key={href} asChild variant="brand" className="h-14 !rounded-full font-semibold">
              <Link href={href}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function PortalPage() {
  return <PortalContent />;
}
