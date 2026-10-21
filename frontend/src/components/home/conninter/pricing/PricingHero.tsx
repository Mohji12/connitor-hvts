'use client';

import { AnimatePresence, motion } from "framer-motion";
import { ClientButton } from '@/components/home/conninter/ClientButton';
import type { Billing, PricingFocus } from "./pricingData";

type Props = {
  billing: Billing;
  onBillingChange: (b: Billing) => void;
  focus: PricingFocus;
  onFocusChange: (focus: PricingFocus) => void;
};

export const PricingHero = ({ billing, onBillingChange, focus, onFocusChange }: Props) => {
  return (
    <div className="relative z-10 mx-auto max-w-[1200px] px-4 text-center lg:px-8">
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.4 }}
        className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#001B71]/50"
      >
        PRICING
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[#001B71] md:text-[28px]"
      >
        Invest in smarter scheduling
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mx-auto mt-1.5 max-w-[520px] text-center text-[13px] leading-snug text-[#64748B] md:text-sm"
      >
        {focus === "visit"
          ? "Monthly hospital plans. Annual billing is 20% less."
          : focus === "delivery"
            ? "Per delivery. Choose the vehicle that matches the load."
            : "What a visitor pays for an on-site visit, a digital meeting, or a group session."}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="relative mx-auto mt-4 flex w-full flex-col items-center"
      >
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          {focus === "visit" && (
          <>
          <div className="relative h-10 w-[240px] shrink-0 rounded-full bg-white p-1 shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0]">
            <motion.div
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-[#001B71] shadow-sm"
              initial={false}
              animate={{ x: billing === "monthly" ? 0 : "100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            />
            <div className="relative z-10 grid h-full grid-cols-2">
              <ClientButton
                onClick={() => onBillingChange("monthly")}
                className={`rounded-full text-[13px] transition-colors ${
                  billing === "monthly" ? "font-semibold text-white" : "font-medium text-[#64748B]"
                }`}
              >
                Monthly
              </ClientButton>
              <ClientButton
                onClick={() => onBillingChange("annual")}
                className={`rounded-full text-[13px] transition-colors ${
                  billing === "annual" ? "font-semibold text-white" : "font-medium text-[#64748B]"
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
                className="whitespace-nowrap rounded-full bg-[#16A34A] px-2 py-0.5 text-[11px] font-semibold text-white"
              >
                Save 20%
              </motion.span>
            )}
          </AnimatePresence>
          </>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="relative mt-3 inline-flex h-10 items-center rounded-full bg-white p-1 shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0]"
        >
          {(
            [
              ["visit", "Visiting"],
              ["delivery", "Delivery"],
              ["visitor", "Visitor"],
            ] as const
          ).map(([item, label]) => (
            <ClientButton
              key={item}
              onClick={() => onFocusChange(item)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors sm:px-4 ${
                focus === item ? "bg-[#001B71] text-white shadow-sm" : "text-[#64748B] hover:text-[#001B71]"
              }`}
            >
              {label}
            </ClientButton>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
