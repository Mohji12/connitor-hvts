'use client';

import { Search, MapPin, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRotate } from '@/hooks/use-auto-rotate';
import { cn } from '@/lib/utils';
import { heroModules, type HeroModule } from './heroModules';
import { ClientButton } from '@/components/home/conninter/ClientButton';
import { ModuleToggle, SHOWCASE_MODULES } from './ModuleToggle';

const ROTATE_MS = 7000;

const cardMotion = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const WorkflowCard = ({ delay, data }: { delay: number; data: HeroModule['workflow'] }) => (
  <motion.div
    {...cardMotion(delay)}
    className="w-full max-w-[340px] rounded-2xl border bg-card p-5 shadow-lg lg:w-[340px]"
  >
    <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground">
      <span className={cn('h-2 w-2 rounded-full', data.liveDotClass)} />
      {data.title}
    </div>
    <p className="mb-4 text-sm font-bold text-foreground">{data.subject}</p>
    <div className="flex items-stretch text-[10px]">
      {data.steps.map((s, i) => {
        const done = s.status === 'done';
        const active = s.status === 'active';
        return (
          <Fragment key={s.label}>
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center rounded-md px-1 py-1.5 text-center',
                done ? data.doneBg : active ? data.activeBg : 'bg-muted',
              )}
            >
              <div
                className={cn(
                  'font-bold',
                  done ? data.doneText : active ? data.activeText : 'text-muted-foreground',
                )}
              >
                {s.label}
              </div>
              <div className="mt-0.5 leading-tight text-muted-foreground">{s.value}</div>
              <div className="mt-auto flex items-center justify-center gap-0.5 pt-1">
                {done && (
                  <>
                    <Check className={cn('h-2.5 w-2.5', data.doneText)} />
                    <span className={data.doneText}>done</span>
                  </>
                )}
                {active && (
                  <>
                    <span className={cn('h-1.5 w-1.5 animate-pulse-dot rounded-full', data.activeDot)} />
                    <span className={data.activeText}>active</span>
                  </>
                )}
                {s.status === 'pending' && <span className="text-muted-foreground">pending</span>}
              </div>
            </div>
            {i < data.steps.length - 1 && (
              <span className="flex w-4 shrink-0 items-center justify-center text-muted-foreground">→</span>
            )}
          </Fragment>
        );
      })}
    </div>
  </motion.div>
);

const SlotCard = ({ delay, data }: { delay: number; data: HeroModule['slots'] }) => (
  <motion.div
    {...cardMotion(delay)}
    className={cn('w-[210px] rounded-xl border border-l-4 bg-card p-4 shadow-md', data.borderClass)}
  >
    <div className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground">{data.title}</div>
    <div className="mb-3 space-y-2">
      {data.rows.map((d) => (
        <div key={d.initials} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-card',
              d.color,
            )}
          >
            {d.initials}
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">{d.name}</div>
            <div className="text-[10px] text-muted-foreground">{d.role}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="flex items-end gap-2">
      <span className={cn('text-2xl font-extrabold', data.countClass)}>{data.count}</span>
      <span className="mb-1 text-[10px] text-muted-foreground">{data.countLabel}</span>
      <div className="ml-auto flex items-end gap-0.5">
        {[40, 65, 50, 80].map((h, i) => (
          <div key={i} className={cn('w-2 rounded-sm', data.barClass)} style={{ height: `${h * 0.25}px` }} />
        ))}
      </div>
    </div>
  </motion.div>
);

const ConfirmCard = ({ delay, data }: { delay: number; data: HeroModule['confirm'] }) => {
  const Icon = data.icon;
  return (
    <motion.div
      {...cardMotion(delay)}
      className={cn('w-[240px] rounded-xl border border-l-4 bg-card p-3 shadow-md', data.borderClass)}
    >
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', data.iconWrapClass)}>
          <Icon className={cn('h-4 w-4', data.toneClass)} />
        </div>
        <div>
          <div className={cn('text-[10px] font-bold tracking-wider', data.toneClass)}>{data.title}</div>
          <p className="text-[11px] italic text-muted-foreground">{data.message}</p>
        </div>
      </div>
    </motion.div>
  );
};

const ScoreCard = ({ delay, data }: { delay: number; data: HeroModule['score'] }) => (
  <motion.div {...cardMotion(delay)} className="w-[170px] rounded-xl border bg-card p-4 shadow-md">
    <div className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground">{data.title}</div>
    {data.metrics.map((m) => (
      <div key={m.label} className="mb-1.5">
        <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{m.label}</span>
          <span className="font-bold text-foreground">{m.value}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full', data.barClass)} style={{ width: `${m.value}%` }} />
        </div>
      </div>
    ))}
    <div className="mt-2 text-center">
      <div className="text-[10px] text-muted-foreground">Overall</div>
      <div className="text-xl font-extrabold text-primary">{data.overall}</div>
    </div>
  </motion.div>
);

const StatsCard = ({ delay, count, data }: { delay: number; count: number; data: HeroModule['stats'] }) => (
  <motion.div {...cardMotion(delay)} className="min-w-[140px] max-w-[200px] rounded-xl border bg-card p-3 shadow-sm">
    <div className="text-[10px] font-bold tracking-wider text-muted-foreground">{data.label}</div>
    <div className="font-mono text-lg font-extrabold tabular-nums leading-tight text-foreground sm:text-xl">
      {Math.round(count * data.ratio).toLocaleString('en-IN')}
    </div>
    <div className="text-[10px] text-muted-foreground">{data.unit}</div>
  </motion.div>
);

type HeroSectionProps = {
  bookingsCount: number;
};

export default function HeroSection({ bookingsCount }: HeroSectionProps) {
  const [city] = useState('Bengaluru');
  const [query, setQuery] = useState('');
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const { index, select, running, cycleKey } = useAutoRotate({
    count: SHOWCASE_MODULES.length,
    intervalMs: ROTATE_MS,
    paused: hovering || focused || query.length > 0,
  });
  const moduleKey = SHOWCASE_MODULES[index];
  const mod = heroModules[moduleKey];

  const goBook = () => {
    router.push(mod.ctaHref);
  };

  const goQuickActionLogin = () => {
    router.push(mod.quickActionHref);
  };

  return (
    <section className="bg-muted/30 pb-16 pt-24 lg:pb-24 lg:pt-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ModuleToggle
              active={moduleKey}
              onSelect={(m) => select(SHOWCASE_MODULES.indexOf(m))}
              running={running}
              cycleKey={cycleKey}
              intervalMs={ROTATE_MS}
              ariaLabel="Showcase module"
              className="mb-6"
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={moduleKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="lg:min-h-[330px]"
              >
                <h1 className="mb-6 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-[56px]">
                  {mod.heading}
                </h1>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground">{mod.subtext}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mb-5 flex max-w-xl items-center rounded-xl border bg-background p-1.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring">
              <div className="flex shrink-0 items-center gap-1.5 border-r px-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                <span className="font-medium text-foreground">{city}</span>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goBook();
                }}
                placeholder={mod.searchPlaceholder}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60"
                suppressHydrationWarning
              />
              <ClientButton
                onClick={goBook}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#001B71] text-white transition-colors hover:bg-[#002a94]"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </ClientButton>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={moduleKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-wrap gap-2"
              >
                {mod.quickActions.map((a) => (
                  <ClientButton
                    key={a.label}
                    onClick={goQuickActionLogin}
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <a.icon className={cn('h-4 w-4', moduleKey === 'delivery' ? 'text-teal-600' : 'text-secondary')} />
                    {a.label}
                  </ClientButton>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div
            className="relative hidden min-h-[420px] lg:block"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={moduleKey}
                className="absolute inset-0"
                exit={{ opacity: 0, x: -24, transition: { duration: 0.3 } }}
              >
                <div className="absolute left-0 top-0 z-10">
                  <ScoreCard delay={0.6} data={mod.score} />
                </div>

                <div className="absolute right-0 top-2 z-20">
                  <SlotCard delay={0.3} data={mod.slots} />
                </div>

                <div className="absolute left-1/2 top-[120px] z-10 -translate-x-1/2">
                  <WorkflowCard delay={0.15} data={mod.workflow} />
                </div>

                <div className="absolute bottom-8 left-4 z-20">
                  <ConfirmCard delay={0.45} data={mod.confirm} />
                </div>

                <div className="absolute bottom-0 right-8 z-20">
                  <StatsCard delay={0.6} count={bookingsCount} data={mod.stats} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={moduleKey}
                className="space-y-4"
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <WorkflowCard delay={0.15} data={mod.workflow} />
                <StatsCard delay={0.3} count={bookingsCount} data={mod.stats} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
