'use client';

import Link from 'next/link';
import { Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DeliveryPriceOption } from './pricingData';

type Props = {
  option: DeliveryPriceOption;
  index: number;
};

export const DeliveryPricingCard = ({ option, index }: Props) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="px-3 pt-3">
        <div
          className="rounded-2xl px-3 py-3 text-center text-white"
          style={{ backgroundColor: option.accent }}
        >
          <p className="text-[15px] font-extrabold uppercase leading-tight tracking-wide">{option.title}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">{option.subtitle}</p>
        </div>
      </div>

      <div className="flex h-[120px] items-center justify-center px-4">
        <img src={option.image} alt="" className="max-h-[108px] w-full object-contain" />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="flex items-center gap-2 text-[#64748B]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#334155]">
            <Clock className="h-4 w-4" />
          </span>
          <p className="leading-tight">
            <span className="block text-sm font-bold text-[#0F172A]">{option.minutes} MIN</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Delivery slot</span>
          </p>
        </div>

        <p className="mt-4 text-center text-[40px] font-extrabold leading-none tracking-tight text-[#0F172A]">
          ₹{option.amount}
        </p>

        <ul className="mt-4 flex flex-1 flex-col gap-2">
          {option.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-[13px] leading-snug text-[#334155]">{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/vendor/deliveries/book"
          className="mt-5 flex h-11 items-center justify-center rounded-full bg-[#1D4ED8] text-sm font-semibold text-white transition-transform hover:-translate-y-px"
        >
          Select
        </Link>
      </div>
    </motion.article>
  );
};
