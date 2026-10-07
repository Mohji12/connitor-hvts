'use client';

import Image from 'next/image';
import { Search, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRotate } from '@/hooks/use-auto-rotate';
import { cn } from '@/lib/utils';
import { heroModules, type HeroModule } from './heroModules';
import { ModuleToggle, SHOWCASE_MODULES, type ShowcaseModule } from './ModuleToggle';

const ROTATE_MS = 7000;

const cardMotion = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const heroImageSrc = (moduleKey: ShowcaseModule): string =>
  moduleKey === 'delivery'
    ? '/Delivered%20Confirmation%20with%20Delivery%20Team.png'
    : '/Meeting%20Successful%20Team%20Promotion.png';

const HeroArtwork = ({
  moduleKey,
  mod,
  bookingsCount,
}: {
  moduleKey: ShowcaseModule;
  mod: HeroModule;
  bookingsCount: number;
}) => (
  <div className="relative aspect-[3/2] w-full">
    <Image
      key={moduleKey}
      src={heroImageSrc(moduleKey)}
      alt=""
      fill
      priority
      sizes="(min-width: 1024px) 40vw, 90vw"
      className="object-contain"
    />
    <div className="absolute left-0 top-0 z-10 -translate-x-[30%] -translate-y-[30%] scale-[0.7]">
      <ScoreCard delay={0.2} data={mod.score} />
    </div>
    <div className="absolute right-0 top-0 z-10 origin-top-right scale-[0.7]">
      <StatsCard delay={0.3} count={bookingsCount} data={mod.stats} />
    </div>
    <div className="absolute bottom-0 left-0 z-10 origin-bottom-left scale-[0.7]">
      <ConfirmCard delay={0.4} data={mod.confirm} />
    </div>
    <div className="absolute bottom-0 right-0 z-10 translate-x-[30%] translate-y-[30%] scale-[0.7]">
      <SlotCard delay={0.5} data={mod.slots} />
    </div>
  </div>
);

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
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const { index, select, running, cycleKey } = useAutoRotate({
    count: SHOWCASE_MODULES.length,
    intervalMs: ROTATE_MS,
    paused: focused || query.length > 0,
  });
  const moduleKey = SHOWCASE_MODULES[index];
  const mod = heroModules[moduleKey];

  const goBook = () => {
    router.push(mod.ctaHref);
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
                {mod.eyebrow ? (
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {mod.eyebrow}
                  </p>
                ) : null}
                <h1 className="@container mb-6 w-full text-[0px] leading-none text-foreground">
                  <span
                    className={cn(
                      'block font-serif font-medium leading-[0.72] tracking-[-0.03em] text-primary antialiased',
                      moduleKey === 'visitor'
                        ? 'text-[clamp(2.15rem,9.4cqw,3.75rem)]'
                        : 'text-[clamp(1.85rem,8.2cqw,3.25rem)]',
                    )}
                  >
                    {mod.heading.lead.split('\n').map((line) => (
                      <span key={line} className="block whitespace-nowrap">
                        {line}
                      </span>
                    ))}
                  </span>
                  <span
                    className={cn(
                      'block font-serif font-medium italic leading-[0.72] tracking-[-0.02em] text-[var(--logo-accent-green)] antialiased',
                      moduleKey === 'visitor'
                        ? 'text-[clamp(2.15rem,9.4cqw,3.75rem)]'
                        : 'text-[clamp(1.85rem,8.2cqw,3.25rem)]',
                    )}
                  >
                    {mod.heading.accent.split('\n').map((line) => (
                      <span key={line} className="block whitespace-nowrap">
                        {line}
                      </span>
                    ))}
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
          </motion.div>

          <div className="hidden lg:col-span-7 lg:block" aria-hidden />

          <div className="relative z-10 mx-auto mt-8 w-full px-8 pb-4 pt-14 lg:hidden">
            <HeroArtwork moduleKey={moduleKey} mod={mod} bookingsCount={bookingsCount} />
          </div>
        </div>
      </div>

      {/* Right hero visual — flush to viewport right edge */}
      <div
        className="pointer-events-none absolute right-0 top-16 z-0 hidden h-[min(680px,80vh)] w-[min(59vw,860px)] lg:top-14 lg:block"
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
          <div className="absolute right-[84px] top-1/2 w-[76%] -translate-y-[calc(50%-0.5rem)]">
            <HeroArtwork moduleKey={moduleKey} mod={mod} bookingsCount={bookingsCount} />
          </div>
        </div>
      </div>

    </section>
  );
}
