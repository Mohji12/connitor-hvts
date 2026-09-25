'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useMounted } from '@/hooks/useMounted';
import { VISITOR_FLOW_STEPS } from '@/lib/home-journeys';
import { cn } from '@/lib/utils';

export function VisitorFlowTimeline() {
  const mounted = useMounted();
  const [openStep, setOpenStep] = useState<number | null>(1);

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="flow-timeline-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center lg:text-left">
          <h2 id="flow-timeline-heading" className="text-2xl font-bold text-slate-900">
            Your visit, step by step
          </h2>
          <p className="mt-2 text-slate-600">
            From booking to check-out — tap a step to see what happens next.
          </p>
        </div>
        <Button asChild variant="link" className="text-teal-700">
          <Link href="/book-appointment/how-it-works">
            View full guide
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {!mounted ? (
        <div className="space-y-2">
          {VISITOR_FLOW_STEPS.map((item) => (
            <Skeleton key={item.step} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
      <div className="space-y-2">
        {VISITOR_FLOW_STEPS.map((item) => {
          const isOpen = openStep === item.step;
          return (
            <Collapsible
              key={item.step}
              open={isOpen}
              onOpenChange={(open) => setOpenStep(open ? item.step : null)}
            >
              <div
                className={cn(
                  'rounded-xl border bg-white/90 transition-shadow',
                  isOpen ? 'border-teal-200 shadow-md' : 'border-teal-100/80 shadow-sm',
                )}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      isOpen ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800',
                    )}
                    aria-hidden="true"
                  >
                    {item.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 sm:px-5 sm:pl-[4.25rem]">
                  <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 border-teal-200 text-teal-800">
                    <Link href={item.href}>
                      {item.label}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
      )}
    </section>
  );
}
