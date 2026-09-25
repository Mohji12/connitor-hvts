'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedPrice } from './AnimatedPrice';
import type { Billing, PricingPlan } from './pricingData';
import { formatInr } from './pricingData';

type Props = {
  plan: PricingPlan;
  billing: Billing;
  index: number;
  isLg: boolean;
};

export const PricingPlanCard = ({ plan, billing, index, isLg }: Props) => {
  const isContact = plan.tier === "contact";
  const isPopular = plan.popular;

  const prevName = plan.inheritsFrom;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        type: isPopular && isLg ? "spring" : "tween",
        stiffness: isPopular && isLg ? 260 : undefined,
        damping: isPopular && isLg ? 22 : undefined,
      }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[20px] bg-white transition-all duration-500 ease-out",
        isPopular ? "p-0" : "p-8",
        plan.tier === "contact" && "border-2 border-dashed border-[#CBD5E1]",
        plan.tier !== "contact" && "border border-[#E2E8F0]",
        isPopular && "border-2 border-[#4A90E2] shadow-[0_8px_32px_rgba(74,144,226,0.15)]",
        !isPopular && "shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
        /* origin-top: scale grows downward so the ribbon doesn’t reach up over the billing toggles */
        isPopular && isLg && "lg:z-10 lg:origin-top lg:scale-[1.04]",
        "hover:-translate-y-1.5",
        isPopular && "hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(74,144,226,0.2)]",
        !isPopular && "hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]",
      )}
    >
      {isPopular && (
        <div className="flex h-9 w-full shrink-0 items-center justify-center bg-gradient-to-br from-[#4A90E2] to-[#001B71] text-[11px] font-bold uppercase tracking-[0.1em] text-white">
          MOST POPULAR
        </div>
      )}

      <div
        className={cn(
          "relative flex flex-1 flex-col",
          isPopular ? "p-8 pt-6" : "",
        )}
      >
        {isPopular && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "repeating-linear-gradient(135deg, #4A90E2 0, #4A90E2 1px, transparent 1px, transparent 8px)",
            }}
          />
        )}

        <div className="relative">
        <h3 className="text-[22px] font-bold text-[#001B71]">{plan.name}</h3>
        <p className="mb-5 text-xs text-[#94A3B8]">{plan.audienceTag}</p>

        {/* Price */}
        <div className="mb-6 min-h-[88px]">
          {isContact ? (
            <div>
              <p className="text-base text-[#94A3B8]">{plan.contactLabel ?? "Custom"}</p>
              <p className="text-[40px] font-extrabold italic leading-tight text-[#001B71]">
                {plan.contactHeadline ?? "Let's Talk"}
              </p>
              <p className="mt-1 text-[13px] text-[#64748B]">Tailored to your scale</p>
            </div>
          ) : billing === "monthly" ? (
            <div className="flex flex-wrap items-baseline gap-0.5">
              <span className="text-xl text-[#94A3B8]">₹</span>
              <span className="text-5xl font-extrabold tabular-nums text-[#001B71]">
                <AnimatedPrice value={plan.monthlyAmount!} key={`m-${plan.id}`} />
              </span>
              <span className="text-base text-[#94A3B8]">/mo</span>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-base text-[#94A3B8] line-through">₹{formatInr(plan.monthlyAmount!)}</span>
                <div className="flex flex-wrap items-baseline gap-0.5">
                  <span className="text-xl text-[#94A3B8]">₹</span>
                  <span className="text-5xl font-extrabold tabular-nums text-[#001B71]">
                    <AnimatedPrice value={plan.annualMonthlyEquivalent!} key={`a-${plan.id}`} />
                  </span>
                  <span className="text-base text-[#94A3B8]">/mo</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-[#94A3B8]">Billed ₹{formatInr(plan.annualTotal!)}/year</p>
              <AnimatePresence>
                <motion.span
                  key="save"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, delay: 0.05 * index }}
                  className="mt-2 inline-block rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-medium text-[#16A34A]"
                >
                  {plan.annualSavingsLabel}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/portal?intent=register"
          className={cn(
            'mb-6 flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold transition-all',
            plan.cta.variant === 'outline' &&
              'border border-[#E2E8F0] bg-white text-[#001B71] hover:border-[#CBD5E1] hover:bg-[#F7F9FC]',
            plan.cta.variant === 'outline-primary' &&
              'border border-[#4A90E2] bg-white text-[#4A90E2] hover:bg-[#F7F9FC]',
            plan.cta.variant === 'gradient' &&
              'bg-[#001B71] text-white shadow-[0_4px_12px_rgba(0,27,113,0.35)] hover:-translate-y-px hover:bg-[#002a94] hover:shadow-[0_6px_16px_rgba(0,27,113,0.45)]',
          )}
        >
          {plan.cta.text}
        </Link>

        <div className="mb-6 h-px w-full bg-[#E2E8F0]" />

        {/* Features */}
        <div className="flex flex-1 flex-col gap-2.5">
          {prevName && (
            <p className="mb-1 text-[13px] italic text-[#64748B]">Includes everything in {prevName}, plus:</p>
          )}
          {plan.features.map((f) => (
            <div key={f.text} className="flex items-start gap-2">
              {f.kind === "unavailable" ? (
                <>
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
                  <span className="text-sm text-[#CBD5E1] line-through decoration-[#CBD5E1]">{f.text}</span>
                </>
              ) : (
                <>
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      f.kind === "highlight" ? "text-[#4A90E2]" : "text-[#16A34A]",
                    )}
                    strokeWidth={2}
                  />
                  <span
                    className={cn(
                      "text-sm text-[#475569]",
                      f.kind === "highlight" && "font-medium text-[#1E293B]",
                    )}
                  >
                    {f.text}
                    {f.showNewBadge && (
                      <span className="ml-1.5 inline-block rounded bg-[#4A90E2] px-1 py-px text-[9px] font-bold uppercase text-white">
                        NEW
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <p
          className={cn(
            "mt-6 text-xs",
            isPopular ? "text-[#4A90E2]" : "text-[#94A3B8]",
          )}
        >
          {plan.socialProof}
        </p>
        </div>
      </div>
    </motion.div>
  );
};
