'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMounted } from '@/hooks/useMounted';
import { VISITOR_JOURNEYS, type VisitorJourneyId } from '@/lib/home-journeys';

function JourneyPreview({ journeyId }: { journeyId: VisitorJourneyId }) {
  const journey = VISITOR_JOURNEYS.find((j) => j.id === journeyId)!;

  return (
    <Card className="h-full border-teal-100/80 bg-white/90 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl text-slate-900">{journey.shortTitle}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{journey.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-3">
          {journey.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {journey.note && (
          <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
            {journey.note}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link href={journey.primaryCta.href}>
              {journey.primaryCta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-teal-200 text-teal-800">
            <Link href={journey.secondaryCta.href}>{journey.secondaryCta.label}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function VisitorJourneyPicker() {
  const mounted = useMounted();

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="journey-picker-heading">
      <div className="mb-6 text-center lg:text-left">
        <h2 id="journey-picker-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          What would you like to do?
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Choose your path — each option shows the steps and takes you to the right place.
        </p>
      </div>

      {!mounted ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <JourneyPreview journeyId="pre-register" />
        </div>
      ) : (
      <Tabs defaultValue="pre-register">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="mb-6 inline-flex h-auto min-w-full w-max gap-1 bg-teal-50/80 p-1.5 sm:w-full sm:flex-wrap sm:justify-start">
            {VISITOR_JOURNEYS.map((j) => {
              const Icon = j.icon;
              return (
                <TabsTrigger
                  key={j.id}
                  value={j.id}
                  className="gap-2 px-3 py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-teal-900 sm:px-4"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {j.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {VISITOR_JOURNEYS.map((j) => (
          <TabsContent key={j.id} value={j.id} className="mt-0">
            <JourneyPreview journeyId={j.id} />
          </TabsContent>
        ))}
      </Tabs>
      )}
    </section>
  );
}
