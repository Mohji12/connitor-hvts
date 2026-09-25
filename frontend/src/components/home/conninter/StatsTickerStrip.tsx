'use client';

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STATS_TICKER, type TickerStat } from "@/data/statsTickerData";

const LOOP_STATS = [...STATS_TICKER, ...STATS_TICKER, ...STATS_TICKER];

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-block h-2 w-2 shrink-0 align-middle">
      <span
        className="absolute inset-0 animate-pulse-ring rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="absolute inset-px rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function LiveIndicator() {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-600/15 bg-green-600/8 py-1 pl-2 pr-3"
      aria-hidden
    >
      <span className="h-1.5 w-1.5 animate-live-blink rounded-full bg-green-600" />
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-green-600">Live</span>
    </div>
  );
}

function StatItem({
  stat,
  bookingsCount,
  compact,
}: {
  stat: TickerStat;
  bookingsCount: number;
  compact?: boolean;
}) {
  const display =
    stat.useLiveBookings ? bookingsCount.toLocaleString("en-IN") : stat.value;

  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center gap-4 border-r border-[rgba(0,27,113,0.06)] px-8 last:border-r-0",
        compact && "px-6",
      )}
    >
      <div className="flex items-center gap-2">
        <PulseDot color={stat.color} />
        <span
          className={cn(
            "font-mono font-extrabold tabular-nums tracking-tight text-[#001B71]",
            compact ? "text-lg" : "text-xl",
          )}
        >
          {display}
          <span
            className="ml-0.5 text-[13px] font-semibold"
            style={{ color: stat.color }}
          >
            {stat.suffix}
          </span>
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-800">
          {stat.label}
        </span>
        <span className="text-[11px] font-normal text-slate-400">{stat.trend}</span>
      </div>
    </div>
  );
}

type StatsTickerStripProps = {
  bookingsCount: number;
};

export default function StatsTickerStrip({ bookingsCount }: StatsTickerStripProps) {
  const reducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Live platform statistics"
      className="group relative w-full overflow-hidden border-y border-[rgba(0,27,113,0.06)] bg-white/60 backdrop-blur-xl"
    >
      <div className="flex items-stretch">
        <div className="relative z-[3] flex shrink-0 items-center py-2 pl-4 pr-1 md:pl-6">
          <LiveIndicator />
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {/* Edge fades */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 bg-gradient-to-r from-background to-transparent md:w-20"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-10 bg-gradient-to-l from-background to-transparent md:w-20"
            aria-hidden
          />

          {reducedMotion ? (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 py-3 pr-4">
              {STATS_TICKER.map((stat) => (
                <StatItem
                  key={stat.id}
                  stat={stat}
                  bookingsCount={bookingsCount}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden py-0">
              <div className="flex w-max animate-ticker-scroll items-center group-hover:[animation-play-state:paused]">
                {LOOP_STATS.map((stat, i) => (
                  <StatItem
                    key={`${stat.id}-${i}`}
                    stat={stat}
                    bookingsCount={bookingsCount}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
