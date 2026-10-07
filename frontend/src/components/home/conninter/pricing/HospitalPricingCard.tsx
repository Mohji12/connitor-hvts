'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Check, Hospital, UserRound, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedPrice } from './AnimatedPrice';
import type { Billing, PricingPlan } from './pricingData';
import { formatInr } from './pricingData';

type Props = {
  plan: PricingPlan;
  billing: Billing;
  index: number;
};

const ICONS = {
  user: UserRound,
  building: Building2,
  users: Users,
  hospital: Hospital,
} as const;

export const HospitalPricingCard = ({ plan, billing, index }: Props) => {
  const accent = plan.accent ?? '#0F9F6E';
  const button = plan.accentButton ?? accent;
  const tint = plan.accentTint ?? '#F1F5F9';
  const Icon = ICONS[plan.icon ?? 'building'];
  const amount = billing === 'monthly' ? plan.monthlyAmount : plan.annualMonthlyEquivalent;
  const href = '/portal?intent=register';

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="relative h-[148px] overflow-hidden" style={{ backgroundColor: accent }}>
        {plan.headerImage && (
          <img
            src={plan.headerImage}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-[70%] object-cover"
            style={{ clipPath: 'ellipse(86% 150% at 82% 50%)' }}
          />
        )}
        <div
          className="absolute left-5 top-1/2 flex h-[72px] w-[72px] -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white/90 text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon className="h-8 w-8" strokeWidth={1.75} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <h3 className="text-[26px] font-extrabold uppercase leading-none tracking-tight" style={{ color: accent }}>
          {plan.name}
        </h3>
        <p className="mt-1.5 min-h-[40px] text-sm leading-snug text-[#64748B]">{plan.audienceTag}</p>

        <div className="mt-3 min-h-[72px]">
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-[34px] font-extrabold leading-none tracking-tight text-[#0F172A]">
              ₹<AnimatedPrice value={amount ?? 0} key={`${billing}-${plan.id}`} />
              <span style={{ color: accent }}>*</span>
            </span>
            <span className="text-sm text-[#94A3B8]">/month</span>
          </div>
          {billing === 'annual' && plan.annualTotal != null && (
            <p className="mt-1 text-xs font-medium text-[#16A34A]">
              20% less · billed ₹{formatInr(plan.annualTotal)}/year
            </p>
          )}
        </div>

        <ul className="mt-4 flex flex-1 flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: accent }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-[13.5px] leading-snug text-[#334155]">{feature.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-3 rounded-2xl px-3 py-3" style={{ backgroundColor: tint }}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            <Building2 className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-snug text-[#334155]">
            <span className="font-semibold">Best suited for</span>
            <br />
            {plan.suitedFor}
          </p>
        </div>

        <Link
          href={href}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-transform hover:-translate-y-px"
          style={{ backgroundColor: button }}
        >
          {plan.cta.text}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
};
