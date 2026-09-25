'use client';

import { Fragment, useState } from "react";
import { Check, ChevronDown, X, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Audience } from "./pricingData";
import { getComparison, getPlans } from "./pricingData";
import type { ComparisonCell } from "./pricingData";

type Props = {
  audience: Audience;
};

function CellIcon({ cell }: { cell: ComparisonCell }) {
  if (cell.type === "check") {
    return <Check className="mx-auto h-[18px] w-[18px] text-[#16A34A]" strokeWidth={2} />;
  }
  if (cell.type === "cross") {
    return <X className="mx-auto h-[18px] w-[18px] text-[#CBD5E1]" strokeWidth={2} />;
  }
  return <span className="text-center text-[13px] text-[#1E293B]">{cell.value}</span>;
}

export const PricingComparison = ({ audience }: Props) => {
  const [open, setOpen] = useState(false);
  const data = getComparison(audience);
  const plans = getPlans(audience);
  const reducedMotion = useReducedMotion();

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-4 lg:px-8">
      <motion.button
        type="button"
        suppressHydrationWarning
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        whileHover={reducedMotion ? undefined : { scale: 1.03 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="mx-auto flex items-center justify-center gap-2 rounded-full border border-[#4A90E2]/25 bg-[#4A90E2]/[0.06] px-5 py-2.5 text-[15px] font-semibold text-[#4A90E2] shadow-sm shadow-[#4A90E2]/10 transition-colors hover:border-[#4A90E2]/40 hover:bg-[#4A90E2]/10 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90E2]/40 focus-visible:ring-offset-2"
      >
        <span>Compare all features</span>
        <ArrowRight
          className={cn(
            "h-4 w-4 shrink-0",
            !reducedMotion && "animate-cta-arrow-nudge motion-reduce:animate-none",
          )}
          aria-hidden
        />
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-300",
            open && "rotate-180",
            !open && !reducedMotion && "animate-cta-chevron-hint motion-reduce:animate-none",
          )}
          aria-hidden
        />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-8 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              {/* Desktop / tablet table */}
              <div className="hidden max-h-[70vh] overflow-auto md:block">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead className="sticky top-0 z-20 bg-[#001B71] text-white">
                    <tr>
                      <th className="px-5 py-4 text-left font-semibold">Features</th>
                      {data.planNames.map((name, i) => (
                        <th
                          key={name}
                          className={cn(
                            "px-4 py-4 text-center font-semibold",
                            i === data.popularColumnIndex && "bg-[rgba(74,144,226,0.12)]",
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {name}
                            {i === data.popularColumnIndex && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#4A90E2]" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((cat) => (
                      <Fragment key={cat.label}>
                        <tr className="bg-[#F7F9FC]">
                          <td
                            colSpan={data.planNames.length + 1}
                            className="px-5 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-[#64748B]"
                          >
                            {cat.label}
                          </td>
                        </tr>
                        {cat.rows.map((row, ri) => (
                          <tr key={`${cat.label}-${row.feature}`} className={ri % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"}>
                            <td className="px-5 py-3 text-left text-sm text-[#1E293B]">{row.feature}</td>
                            {row.cells.map((cell, ci) => (
                              <td
                                key={ci}
                                className={cn(
                                  "px-3 py-3 text-center",
                                  ci === data.popularColumnIndex && "bg-[rgba(74,144,226,0.06)]",
                                )}
                              >
                                <CellIcon cell={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                    <tr className="border-t border-[#E2E8F0] bg-white">
                      <td className="px-5 py-4" />
                      {plans.map((plan, pi) => (
                        <td
                          key={plan.id}
                          className={cn(
                            "px-2 py-4",
                            pi === data.popularColumnIndex && "bg-[rgba(74,144,226,0.06)]",
                          )}
                        >
                          <Link
                            href="/portal?intent=register"
                            className={cn(
                              'block w-full rounded-lg py-2.5 text-center text-sm font-semibold',
                              plan.cta.variant === 'gradient'
                                ? 'bg-[#001B71] text-white shadow-sm hover:bg-[#002a94]'
                                : plan.cta.variant === 'outline-primary'
                                  ? 'border border-[#4A90E2] text-[#4A90E2]'
                                  : 'border border-[#E2E8F0] text-[#001B71]',
                            )}
                          >
                            {plan.cta.text}
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile: collapsible by plan */}
              <div className="md:hidden">
                {plans.map((plan, pi) => (
                  <Collapsible key={plan.id} className="border-b border-[#E2E8F0]">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left [&[data-state=open]>svg]:rotate-180">
                      <span className="font-semibold text-[#001B71]">{plan.name}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {data.categories.map((cat) => (
                          <div key={cat.label}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              {cat.label}
                            </p>
                            <ul className="space-y-2">
                              {cat.rows.map((row) => (
                                <li
                                  key={row.feature}
                                  className="flex items-center justify-between gap-2 text-sm"
                                >
                                  <span className="text-[#1E293B]">{row.feature}</span>
                                  <CellIcon cell={row.cells[pi]} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mx-auto mt-6 block text-[15px] font-medium text-[#4A90E2] underline-offset-4 hover:underline"
            >
              Hide comparison
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
