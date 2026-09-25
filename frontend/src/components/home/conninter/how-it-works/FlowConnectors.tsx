'use client';

import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

type Variant = "incoming" | "outgoing";

type Props = {
  variant: Variant;
  /** Mobile / stacked layout: dots flow downward */
  vertical?: boolean;
  className?: string;
};

const dotColor: Record<Variant, string> = {
  incoming: "bg-[#4A90E2]",
  outgoing: "bg-[#16A34A]",
};

function FlowLane({
  variant,
  vertical,
  laneIndex,
  reducedMotion,
}: {
  variant: Variant;
  vertical?: boolean;
  laneIndex: number;
  reducedMotion: boolean | null;
}) {
  const color = dotColor[variant];
  const delay = `${laneIndex * 0.5}s`;

  if (vertical) {
    return (
      <div className="relative flex-1 min-h-[56px] w-full max-w-[100px] mx-auto">
        <svg
          className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 overflow-visible"
          viewBox="0 0 8 100"
          preserveAspectRatio="none"
        >
          <line x1="4" y1="0" x2="4" y2="100" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 8" vectorEffect="non-scaling-stroke" />
        </svg>
        {!reducedMotion ? (
          <span
            className={cn(
              "absolute left-1/2 w-1.5 h-1.5 -translate-x-1/2 rounded-full opacity-80 z-[1] animate-flow-dot-y",
              color,
            )}
            style={{ animationDelay: delay, top: 0 }}
          />
        ) : (
          <span
            className={cn("absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 z-[1]", color)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative h-3 w-full">
      <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 8">
        <line x1="0" y1="4" x2="100" y2="4" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 8" vectorEffect="non-scaling-stroke" />
      </svg>
      {!reducedMotion ? (
        <span
          className={cn("absolute top-1/2 left-0 w-1.5 h-1.5 -translate-y-1/2 rounded-full opacity-80 z-[1] animate-flow-dot-x", color)}
          style={{ animationDelay: delay }}
        />
      ) : (
        <span
          className={cn(
            "absolute top-1/2 left-1/2 z-[1] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80",
            color,
          )}
        />
      )}
    </div>
  );
}

export const FlowConnectors = ({ variant, vertical, className }: Props) => {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative flex shrink-0 justify-center",
        vertical ? "mx-auto w-full max-w-[100px] flex-col gap-3 py-2" : "w-14 flex-col gap-3 self-stretch py-2 md:w-16 lg:w-[52px]",
        className,
      )}
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <FlowLane key={i} variant={variant} vertical={vertical} laneIndex={i} reducedMotion={reducedMotion} />
      ))}
      {/* Junction cluster */}
      <div
        className={cn(
          "flex gap-0.5",
          vertical ? "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full flex-row pt-2" : "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex-col",
        )}
      >
        <span className="h-1 w-1 rounded-full bg-[#94A3B8] animate-junction-pulse" />
        <span className="h-1 w-1 rounded-full bg-[#94A3B8] animate-junction-pulse [animation-delay:120ms]" />
        <span className="h-1 w-1 rounded-full bg-[#94A3B8] animate-junction-pulse [animation-delay:240ms]" />
      </div>
    </div>
  );
}
