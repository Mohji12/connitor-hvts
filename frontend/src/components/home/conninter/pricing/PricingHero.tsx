'use client';

import { AnimatePresence, motion } from "framer-motion";
import { ClientButton } from '@/components/home/conninter/ClientButton';
import type { Audience, Billing } from "./pricingData";

type Props = {
  billing: Billing;
  onBillingChange: (b: Billing) => void;
  audience: Audience;
  onAudienceChange: (a: Audience) => void;
};

export const PricingHero = ({ billing, onBillingChange, audience, onAudienceChange }: Props) => {
  return (
    <div className="relative z-[100] mx-auto max-w-[1200px] px-4 text-center lg:px-8">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
        className="mb-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-white/50"
      >
        PRICING
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white md:text-[44px]"
      >
        Invest in smarter scheduling
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mx-auto mt-3 max-w-[520px] text-[17px] font-normal leading-relaxed text-white/60"
      >
        Start free for 14 days. No credit card required. Upgrade, downgrade, or cancel anytime.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="relative z-[110] mx-auto mt-8 flex w-full max-w-[280px] flex-col items-center sm:max-w-none"
      >
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="relative h-12 w-[280px] shrink-0 rounded-full bg-white/[0.08] p-1 shadow-inner backdrop-blur-md">
            {/* Thumb: width = half of inner track; x = 100% moves exactly one column (translate % is of self) */}
            <motion.div
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              initial={false}
              animate={{ x: billing === "monthly" ? 0 : "100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            />
            <div className="relative z-10 grid h-full grid-cols-2">
              <ClientButton
                onClick={() => onBillingChange("monthly")}
                className={`rounded-full text-sm transition-colors ${
                  billing === "monthly" ? "font-semibold text-[#001B71]" : "font-normal text-white/60"
                }`}
              >
                Monthly
              </ClientButton>
              <ClientButton
                onClick={() => onBillingChange("annual")}
                className={`rounded-full text-sm transition-colors ${
                  billing === "annual" ? "font-semibold text-[#001B71]" : "font-normal text-white/60"
                }`}
              >
                Annual
              </ClientButton>
            </div>
          </div>
          <AnimatePresence>
            {billing === "annual" && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap rounded-full bg-[#16A34A] px-2.5 py-1 text-xs font-semibold text-white"
              >
                Save 20%
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.2 }}
          className="relative z-[120] mt-5 inline-flex h-10 items-center rounded-full border border-white/15 bg-[#001B71] p-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          {(["hospitals", "companies"] as const).map((a) => (
            <ClientButton
              key={a}
              onClick={() => onAudienceChange(a)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                audience === a ? "bg-white text-[#001B71] shadow-sm" : "text-white/55 hover:text-white/80"
              }`}
            >
              For {a === "hospitals" ? "Hospitals" : "Companies"}
            </ClientButton>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
