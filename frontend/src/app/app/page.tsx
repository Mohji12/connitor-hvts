'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Stethoscope,
  Truck,
  UserRound,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import {
  getLastNativePersona,
  isNativePersonaId,
  resolveNativeResumePath,
  setLastNativePersona,
  type NativePersonaId,
} from '@/lib/native-session';
import { isNativeApp } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { CameraAccessCard } from '@/components/mobile/CameraAccessCard';

type PersonaId = NativePersonaId;

type LaunchChoice = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tint: string;
  lastUsed?: boolean;
};

const PERSONAS: (LaunchChoice & { id: PersonaId })[] = [
  {
    id: 'visitor',
    title: 'Visitor',
    description: 'Book a meeting with a doctor or start an online session',
    href: '/app/?visitor=1',
    icon: UserRound,
    tint: 'bg-[#4A90E2]/12 text-[#1d5fae]',
  },
  {
    id: 'staff',
    title: 'Hospital staff',
    description: 'Doctors, reception, admins and security',
    href: '/staff/login',
    icon: Stethoscope,
    tint: 'bg-[#001B71]/10 text-[#001B71]',
  },
  {
    id: 'distributor',
    title: 'Distributor',
    description: 'Book delivery windows and manage drivers',
    href: '/delivery/login',
    icon: Truck,
    tint: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'attendant',
    title: 'Attendant',
    description: 'Scan the hospital QR for a family visit pass',
    href: '/attendant/scan',
    icon: HeartHandshake,
    tint: 'bg-emerald-100 text-emerald-800',
  },
];

const VISITOR_JOURNEYS: LaunchChoice[] = [
  {
    title: 'Visitor pass',
    description: 'Book an in-person hospital visit and show your QR at the gate',
    href: '/visitor-pass',
    icon: CalendarCheck,
    tint: 'bg-[#4A90E2]/12 text-[#1d5fae]',
  },
  {
    title: 'Online session',
    description: 'Book a video consult with a doctor and join from your phone',
    href: '/online-session',
    icon: Video,
    tint: 'bg-[#001B71]/10 text-[#001B71]',
  },
  {
    title: 'Meet a distributor',
    description: 'Book an office visit — the distributor approves and sends your meeting pass',
    href: '/book-distributor-visit',
    icon: Building2,
    tint: 'bg-amber-100 text-amber-800',
  },
];

function isVisitorChoiceOpen(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('visitor') === '1';
}

function LaunchRow({
  choice,
  onSelect,
}: {
  choice: LaunchChoice;
  onSelect?: () => void;
}): React.ReactElement {
  const Icon = choice.icon;
  const className = cn(
    'flex min-h-20 w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm active:bg-[#F7F9FC]',
    choice.lastUsed ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200',
  );
  const body = (
    <>
      <span
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
          choice.tint,
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-base font-semibold text-foreground">{choice.title}</span>
          {choice.lastUsed ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Last used
            </span>
          ) : null}
        </span>
        <span className="m-meta mt-0.5 block">{choice.description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </>
  );

  return (
    <li>
      {choice.href.startsWith('/app/') ? (
        <button type="button" className={className} onClick={onSelect}>
          {body}
        </button>
      ) : (
        <Link href={choice.href} onClick={onSelect} className={className}>
          {body}
        </Link>
      )}
    </li>
  );
}

/** Mobile app home: role chooser. Marketing site stays at `/`. */
export default function AppLaunchPage(): React.ReactElement {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [lastPersona, setLastPersona] = useState<PersonaId | null>(null);
  const [nativeShell, setNativeShell] = useState(false);
  const [visitorChoice, setVisitorChoice] = useState(false);

  useEffect(() => {
    setNativeShell(isNativeApp());
    const resume = resolveNativeResumePath();
    if (resume) {
      router.replace(resume);
      return;
    }
    const saved = getLastNativePersona();
    if (saved && isNativePersonaId(saved)) {
      setLastPersona(saved);
    }
    setVisitorChoice(isVisitorChoiceOpen());
    setChecking(false);

    const syncVisitorChoice = (): void => {
      setVisitorChoice(isVisitorChoiceOpen());
    };
    window.addEventListener('popstate', syncVisitorChoice);
    return () => window.removeEventListener('popstate', syncVisitorChoice);
  }, [router]);

  if (checking) {
    return (
      <div
        className="min-h-dvh bg-[#F7F9FC]"
        aria-busy="true"
        aria-label="Opening Conninter"
        suppressHydrationWarning
      />
    );
  }

  const ordered = lastPersona
    ? [...PERSONAS].sort((a, b) => (a.id === lastPersona ? -1 : b.id === lastPersona ? 1 : 0))
    : PERSONAS;

  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F9FC]">
      {/* Top chrome — clears status bar so content is not under system UI */}
      <header
        className="shrink-0 border-b border-slate-200 bg-white"
        style={{ paddingTop: 'max(1.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex justify-center px-5 py-3">
          <ConninterWordmark
            size="lg"
            variant="full"
            href={null}
            className="mx-auto object-center"
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-5 pb-3 pt-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#001B71]">
            {visitorChoice ? 'Visitor' : 'Welcome'}
          </h1>
          <p className="m-meta mt-1 text-sm">
            {visitorChoice
              ? 'Visitor pass, Online session, or a distributor visit.'
              : 'Choose how you use Conninter.'}
          </p>
        </div>

        {visitorChoice ? (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={() => {
                setVisitorChoice(false);
                router.replace('/app/');
              }}
              className="flex h-11 items-center gap-1 text-sm font-medium text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
          </div>
        ) : null}

        <ul className="flex-1 space-y-3 px-4 pb-4">
          {visitorChoice
            ? VISITOR_JOURNEYS.map((choice) => (
                <LaunchRow
                  key={choice.href}
                  choice={choice}
                  onSelect={() => setLastNativePersona('visitor')}
                />
              ))
            : ordered.map((persona) => (
                <LaunchRow
                  key={persona.id}
                  choice={{ ...persona, lastUsed: persona.id === lastPersona }}
                  onSelect={() => {
                    setLastNativePersona(persona.id);
                    if (persona.id === 'visitor') {
                      setVisitorChoice(true);
                      router.push('/app/?visitor=1');
                    }
                  }}
                />
              ))}
        </ul>

        {nativeShell ? (
          <div className="px-4 pb-4">
            <CameraAccessCard />
          </div>
        ) : null}
      </main>

      {/* Bottom chrome — clears gesture / nav bar */}
      <footer
        className="shrink-0 border-t border-slate-200 bg-white"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="space-y-2 px-5 py-3 text-center">
          <Link href="/security/login" className="block text-sm font-medium text-primary">
            Security guard? Sign in at the gate
          </Link>
          {!nativeShell ? (
            <Link href="/" className="m-meta block">
              About Conninter
            </Link>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
