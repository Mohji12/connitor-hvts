'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBackendApiPrefix } from '@/lib/backend-url';
import { ATTENDANT_HUB_LINKS, VISITOR_HUB_LINKS } from '@/lib/role-portals';
import { cn } from '@/lib/utils';

type HubOption = {
  value: string;
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

function resolveHref(href: string, external?: boolean): string {
  if (!external) return href;
  if (href.startsWith('http')) return href;
  const path = href.startsWith('/') ? href : `/${href}`;
  return `${getBackendApiPrefix()}${path}`;
}

interface PortalHubSelectCardProps {
  eyebrow: string;
  title: string;
  description: string;
  options: HubOption[];
  placeholder: string;
  className?: string;
  continueClassName?: string;
}

function PortalHubSelectCard({
  eyebrow,
  title,
  description,
  options,
  placeholder,
  className,
  continueClassName,
}: PortalHubSelectCardProps) {
  const router = useRouter();
  const [value, setValue] = useState<string>('');

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const onLogin = () => {
    if (!selected) return;
    const target = resolveHref(selected.href, selected.external);
    if (selected.external) {
      window.location.assign(target);
      return;
    }
    router.push(target);
  };

  return (
    <section className={cn('rounded-2xl border bg-white p-6 shadow-sm sm:p-8', className)}>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#4A90E2]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold text-[#001B71]">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor={`${title}-select`}>
            Choose an option
          </label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger id={`${title}-select`} className="h-11 w-full" suppressHydrationWarning>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="items-start py-2.5">
                  <span className="flex flex-col gap-0.5 text-left">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs font-normal leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{selected.description}</p>
        ) : null}

        <Button
          type="button"
          className={cn('w-full !rounded-full font-semibold', continueClassName)}
          disabled={!selected}
          onClick={onLogin}
        >
          Login
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

const visitorOptions: HubOption[] = VISITOR_HUB_LINKS.map((link) => ({
  value: link.id,
  label: link.label,
  description: link.description,
  href: link.href,
  external: link.external,
}));

const attendantOptions: HubOption[] = ATTENDANT_HUB_LINKS.map((link) => ({
  value: link.id,
  label: link.label,
  description: link.description,
  href: link.href,
}));

export function PortalHub() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <PortalHubSelectCard
        eyebrow="Visitors"
        title="Visitor appointments"
        description="Book hospital visits, manage your profile, or use OAuth / legacy email OTP."
        options={visitorOptions}
        placeholder="Select visitor option…"
        className="border-[#4A90E2]/25"
        continueClassName="bg-[#4A90E2] hover:bg-[#3a7bc8] text-white"
      />
      <PortalHubSelectCard
        eyebrow="Attendant pass"
        title="Family visit pass"
        description="Apply for an attendant pass or sign in as hospital AMS staff to manage passes."
        options={attendantOptions}
        placeholder="Select attendant option…"
        className="border-emerald-200/80"
        continueClassName="bg-emerald-700 hover:bg-emerald-800"
      />
    </div>
  );
}
