'use client';

import Image from 'next/image';
import { Search, MapPin, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRotate } from '@/hooks/use-auto-rotate';
import { cn } from '@/lib/utils';
import { heroModules, type HeroModule } from './heroModules';
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
    className="w-[min(100%,340px)] rounded-2xl border bg-card px-3.5 py-3 shadow-lg"
  >
    <div className="mb-2 flex items-center justify-center gap-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', data.liveDotClass)} />
      <span className="leading-tight">{data.title}</span>
    </div>
    <p className="mb-2.5 text-center text-sm font-bold leading-snug text-foreground">{data.subject}</p>
    <div className="flex items-stretch justify-center gap-0.5 text-[10px]">
      {data.steps.map((s, i) => {
        const done = s.status === 'done';
        const active = s.status === 'active';
        return (
          <Fragment key={s.label}>
            <div
              className={cn(
                'flex min-w-[4.25rem] flex-1 flex-col items-center rounded-md px-1.5 py-1.5 text-center',
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
              <span className="flex w-5 shrink-0 items-center justify-center px-0.5 text-muted-foreground">→</span>
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
    className={cn(
      'flex h-full min-h-[11.5rem] w-[168px] flex-col rounded-xl border border-l-4 bg-card p-2.5 shadow-md',
      data.borderClass,
    )}
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
    <div className="mt-auto flex items-end gap-2">
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
      className={cn('w-[190px] rounded-xl border border-l-4 bg-card p-2 shadow-md', data.borderClass)}
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
  <motion.div
    {...cardMotion(delay)}
    className="flex h-full min-h-[11.5rem] w-[136px] flex-col rounded-xl border bg-card p-2.5 shadow-md"
  >
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
    <div className="mt-auto pt-2 text-center">
      <div className="text-[10px] text-muted-foreground">Overall</div>
      <div className="text-xl font-extrabold text-primary">{data.overall}</div>
    </div>
  </motion.div>
);

const StatsCard = ({ delay, count, data }: { delay: number; count: number; data: HeroModule['stats'] }) => (
  <motion.div {...cardMotion(delay)} className="min-w-[112px] max-w-[158px] rounded-xl border bg-card p-2 shadow-sm">
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
    <section className="relative overflow-x-clip bg-muted/30 pb-16 pt-24 lg:pb-24 lg:pt-32">
      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-20 min-w-0 lg:col-span-5 xl:col-span-5"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={moduleKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="lg:min-h-[360px]"
              >
                <h1 className="mb-6 max-w-[32rem] text-balance text-foreground lg:max-w-[38rem]">
                  <span
                    className="block font-serif text-[2.85rem] font-medium leading-[0.92] tracking-[-0.03em] text-[var(--logo-accent-green)] antialiased md:text-[3.65rem] lg:text-[4.15rem] xl:text-[4.45rem]"
                  >
                    {mod.heading.lead}
                  </span>
                  <span
                    className="mt-1.5 block max-w-full font-serif text-[clamp(2.85rem,5.5vw,4.1rem)] font-medium italic leading-[0.94] tracking-[-0.02em] text-primary antialiased lg:text-[clamp(3rem,4.8vw,4.35rem)]"
                  >
                    {mod.heading.accent}
                  </span>
                </h1>
                <p className="mb-8 max-w-xl font-sans text-lg font-normal leading-relaxed text-muted-foreground md:text-xl">
                  {mod.subtext}
                </p>
              </motion.div>
            </AnimatePresence>

            <ModuleToggle
              active={moduleKey}
              onSelect={(m) => select(SHOWCASE_MODULES.indexOf(m))}
              running={running}
              cycleKey={cycleKey}
              intervalMs={ROTATE_MS}
              ariaLabel="Showcase module"
              className="mb-4"
            />

            <div className="mb-5 flex max-w-xl items-center rounded-xl border bg-background p-1.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring">
              <div className="flex shrink-0 items-center gap-1.5 border-r px-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                <span className="font-sans font-medium text-foreground">{city}</span>
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
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                suppressHydrationWarning
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={goBook}
                suppressHydrationWarning
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#001B71] text-white transition-colors hover:bg-[#002a94]"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
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
                  <button
                    key={a.label}
                    type="button"
                    onClick={goQuickActionLogin}
                    suppressHydrationWarning
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <a.icon className={cn('h-4 w-4', moduleKey === 'delivery' ? 'text-teal-600' : 'text-secondary')} />
                    {a.label}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="hidden lg:col-span-7 lg:block" aria-hidden />

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

      {/* Right hero visual — flush to viewport right edge */}
      <div
        className="pointer-events-none absolute right-0 top-24 z-0 hidden h-[min(680px,80vh)] w-[min(59vw,860px)] lg:top-36 lg:block"
        aria-hidden
      >
        <div
          className="absolute inset-0 z-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 top-6 z-0 lg:top-10">
          <Image
            src="/images/hero-team-background.png?v=20260926"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 59vw, 0vw"
            className="origin-bottom-right scale-[1.32] object-contain object-right object-[100%_40%]"
          />
        </div>
      </div>

      <div
        className="absolute right-0 top-24 z-[1] hidden h-[min(680px,80vh)] w-[min(59vw,860px)] overflow-visible lg:top-36 lg:block"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={moduleKey}
            className="relative z-10 flex h-full w-full items-end justify-center overflow-visible px-1 pb-16 lg:pb-[4.5rem]"
            exit={{ opacity: 0, x: -24, transition: { duration: 0.3 } }}
          >
            <div className="relative mx-auto h-[min(420px,54vh)] w-full max-w-[600px] origin-center scale-[0.86] -translate-y-1 lg:max-w-[660px] lg:scale-[0.8] lg:-translate-y-2">
              {/* Score / vendor — over delivery (left); slots — over security (right) */}
              <div className="absolute left-0 top-[4%] z-10 -translate-x-[10%] lg:-translate-x-[14%]">
                <ScoreCard delay={0.6} data={mod.score} />
              </div>
              <div className="absolute right-0 top-[9%] z-10 translate-x-[10%] translate-y-1 lg:translate-x-[14%] lg:translate-y-2">
                <SlotCard delay={0.3} data={mod.slots} />
              </div>

              <div className="absolute left-1/2 top-[46%] z-20 w-[min(100%,340px)] -translate-x-1/2 -translate-y-1/2">
                <WorkflowCard delay={0.15} data={mod.workflow} />
              </div>

              <div className="absolute bottom-0 left-0 z-10 max-w-[48%]">
                <ConfirmCard delay={0.45} data={mod.confirm} />
              </div>
              <div className="absolute bottom-0 right-0 z-10">
                <StatsCard delay={0.6} count={bookingsCount} data={mod.stats} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
