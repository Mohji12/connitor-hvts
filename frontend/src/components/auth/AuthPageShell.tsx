'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/12 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#001B71]/08 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[#001B71]/08 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <ConninterWordmark size="md" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href="/portal">All portals</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="relative z-10 flex min-h-[calc(100vh-65px)] items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
