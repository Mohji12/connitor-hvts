'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { VisitorPricePlan } from './pricingData';

type Props = {
  plan: VisitorPricePlan;
  index: number;
};

export const VisitorPricingCard = ({ plan, index }: Props) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E8EEF6] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="px-5 pt-5">
        <p className="text-xs font-bold tracking-wide" style={{ color: plan.accent }}>
          {plan.indexLabel}
        </p>
        <h3 className="mt-1 text-[22px] font-extrabold uppercase leading-none tracking-tight" style={{ color: plan.accent }}>
          {plan.title}
        </h3>
        <p className="mt-1 text-sm text-[#64748B]">{plan.subtitle}</p>
      </div>

      <div className="mx-4 mt-3 overflow-hidden rounded-2xl bg-[#F8FAFC]">
        <img src={plan.image} alt="" className="h-[132px] w-full object-cover object-center" />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <p className="text-[28px] font-extrabold leading-none tracking-tight" style={{ color: plan.accent }}>
          {plan.price}
          {plan.unit ? (
            <span className="ml-1 text-sm font-semibold text-[#64748B]">{plan.unit}</span>
          ) : null}
        </p>
        <p className="mt-2 text-sm leading-snug text-[#64748B]">{plan.summary}</p>

        {plan.sessions && (
          <ul className="mt-3 space-y-1 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#334155]">
            {plan.sessions.map((session) => (
              <li key={session.label} className="flex items-center justify-between gap-3">
                <span>{session.label}</span>
                <span className="font-semibold" style={{ color: plan.accent }}>
                  {session.amount}
                </span>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-4 flex flex-1 flex-col gap-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-[#334155]">
              <span
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: plan.accent }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <Link
          href={plan.href}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: plan.accent }}
        >
          {plan.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
};
