'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import { CalendarCheck, LayoutDashboard, Truck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { getVisitorToken } from '@/lib/services/visitorPortalService';

function isVisitorAccountToken(token: string): boolean {
  try {
    const payload = jwtDecode<{ sub?: string; role?: string }>(token);
    return payload.role === 'VISITOR' && Boolean(payload.sub && !String(payload.sub).includes('@'));
  } catch {
    return false;
  }
}

export function HomeHeader() {
  const [staffDashboardPath, setStaffDashboardPath] = useState<string | null>(null);
  const [hasVisitorSession, setHasVisitorSession] = useState(false);

  useEffect(() => {
    const visitorToken = getVisitorToken();
    if (visitorToken && isVisitorAccountToken(visitorToken)) {
      setHasVisitorSession(true);
    }

    const staffToken = getStoredAuthToken();
    if (!staffToken) return;

    try {
      const decoded = jwtDecode<{ role?: string }>(staffToken);
      if (decoded.role) {
        setStaffDashboardPath(getDashboardPathForRole(decoded.role));
      }
    } catch {
      // ignore invalid token
    }
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100/80 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src="/ConnInter.png"
            alt="Conninter"
            width={160}
            height={48}
            className="h-9 w-auto sm:h-10"
            priority
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="#delivery-portals"
            className="hidden text-sm text-amber-800 hover:text-amber-900 md:inline"
          >
            Delivery partners
          </Link>
          <Link
            href="#staff-portals"
            className="hidden text-sm text-teal-800 hover:text-teal-900 sm:inline"
          >
            Hospital staff
          </Link>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden border-amber-200 text-amber-900 md:inline-flex"
          >
            <Link href="/delivery/login">
              <Truck className="mr-2 h-4 w-4" />
              Distributor
            </Link>
          </Button>

          {hasVisitorSession ? (
            <Button asChild variant="ghost" size="sm" className="text-teal-800">
              <Link href="/visitor/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                My dashboard
              </Link>
            </Button>
          ) : staffDashboardPath ? (
            <Button asChild variant="ghost" size="sm" className="text-teal-800">
              <Link href={staffDashboardPath}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
          ) : null}

          <Button asChild variant="outline" size="sm" className="hidden border-teal-200 text-teal-800 sm:inline-flex">
            <Link href="/visitor/register">
              <UserPlus className="mr-2 h-4 w-4" />
              Create profile
            </Link>
          </Button>

          <Button asChild size="sm" className="bg-teal-600 text-white hover:bg-teal-700">
            <Link href="/book-appointment">
              <span className="hidden sm:inline">Book visit</span>
              <span className="sm:hidden">Book</span>
              <CalendarCheck className="ml-1.5 h-4 w-4 sm:ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
