'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import {
  ChevronRight,
  HeartHandshake,
  Stethoscope,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { getVisitorToken } from '@/lib/visitor-auth-storage';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import { isNativeApp } from '@/lib/platform';
import { cn } from '@/lib/utils';

const PERSONA_KEY = 'conninterPersona';

type PersonaId = 'visitor' | 'staff' | 'distributor' | 'attendant';

const PERSONAS: {
  id: PersonaId;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tint: string;
}[] = [
  {
    id: 'visitor',
    title: 'Visitor',
    description: 'Book a meeting with a doctor and show your pass at the gate',
    href: '/visitor-pass',
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

/** Mobile app home: role chooser. Marketing site stays at `/`. */
export default function AppLaunchPage(): React.ReactElement {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [lastPersona, setLastPersona] = useState<PersonaId | null>(null);
  const [nativeShell, setNativeShell] = useState(false);

  useEffect(() => {
    setNativeShell(isNativeApp());
    const staffToken = getStoredAuthToken();
    if (staffToken) {
      try {
        const { role } = jwtDecode<{ role?: string }>(staffToken);
        if (role) {
          router.replace(getDashboardPathForRole(role));
          return;
        }
      } catch {
        // Invalid token: fall through to the chooser.
      }
    }
    if (getVisitorToken()) {
      router.replace('/visitor/dashboard');
      return;
    }
    const saved = localStorage.getItem(PERSONA_KEY);
    if (saved && PERSONAS.some((p) => p.id === saved)) {
      setLastPersona(saved as PersonaId);
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return <ConnitorLoader variant="fullscreen" message="Opening Conninter…" />;
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
          <h1 className="text-2xl font-bold tracking-tight text-[#001B71]">Welcome</h1>
          <p className="m-meta mt-1 text-sm">Choose how you use Conninter.</p>
        </div>

        <ul className="flex-1 space-y-3 px-4 pb-4">
          {ordered.map((persona) => {
            const Icon = persona.icon;
            const isLast = persona.id === lastPersona;
            return (
              <li key={persona.id}>
                <Link
                  href={persona.href}
                  onClick={() => localStorage.setItem(PERSONA_KEY, persona.id)}
                  className={cn(
                    'flex min-h-20 items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm active:bg-[#F7F9FC]',
                    isLast ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                      persona.tint,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{persona.title}</span>
                      {isLast ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Last used
                        </span>
                      ) : null}
                    </span>
                    <span className="m-meta mt-0.5 block">{persona.description}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
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
