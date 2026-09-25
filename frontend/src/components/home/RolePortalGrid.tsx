'use client';

import Link from 'next/link';
import {
  Building2,
  ClipboardList,
  Hospital,
  LogIn,
  Shield,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  HOSPITAL_ROLE_PORTALS,
  getLoginPathForRole,
  type PortalRole,
} from '@/lib/role-portals';

const ICONS: Record<PortalRole, LucideIcon> = {
  SUPER_ADMIN: ClipboardList,
  HOSPITAL_ADMIN: Hospital,
  DEPARTMENT_ADMIN: Building2,
  SUB_DEPARTMENT_ADMIN: Users,
  STAFF: Stethoscope,
  SECURITY: Shield,
};

interface RolePortalGridProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function RolePortalGrid({
  title = 'Hospital staff sign-in',
  description = 'Choose your role to sign in with your work email and password. You will be taken to the dashboard for that role.',
  compact = false,
}: RolePortalGridProps) {
  return (
    <section id="staff-portals" className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className={compact ? 'space-y-1' : 'space-y-2 text-center lg:text-left'}>
        <h2 className={compact ? 'text-xl font-semibold text-slate-900' : 'text-2xl font-bold text-slate-900'}>
          {title}
        </h2>
        <p className="text-sm text-slate-600 max-w-3xl">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {HOSPITAL_ROLE_PORTALS.map((portal) => {
          const Icon = ICONS[portal.role];
          return (
            <Card
              key={portal.role}
              className="flex flex-col border-teal-100/80 bg-white/90 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="text-base leading-snug">{portal.label}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {portal.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-2 pt-0">
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
                  <Link href={getLoginPathForRole(portal.role)}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
                <p className="text-center text-[11px] text-muted-foreground leading-tight">
                  Dashboard:{' '}
                  <span className="font-medium text-slate-600">{portal.dashboardPath.split('?')[0]}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
