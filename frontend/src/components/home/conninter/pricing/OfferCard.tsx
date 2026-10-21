'use client';

import type { ReactElement, ReactNode } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  price: ReactNode;
  unit?: string;
  description: string;
  cta: string;
  href: string;
  features: string[];
  index?: number;
  /** Soft pink–purple wash (design B). Grey header is design A. */
  featured?: boolean;
  /** Delivery vehicle (or other) artwork, kept in the header. */
  media?: ReactNode;
  extra?: ReactNode;
};

const FEATURED_HEADER =
  'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,232,244,0.9) 42%, rgba(255,214,204,0.95) 100%), radial-gradient(120% 90% at 100% 0%, rgba(196,132,252,0.72) 0%, rgba(196,132,252,0) 58%)';

export function OfferCard({
  title,
  price,
  unit,
  description,
  cta,
  href,
  features,
  index = 0,
  featured = false,
  media,
  extra,
}: Props): ReactElement {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <div
        className={cn(
          'relative isolate overflow-hidden px-6 pb-6 pt-6',
          featured ? 'text-[#111827]' : 'bg-[#F3F4F6] text-[#111827]',
        )}
        style={featured ? { backgroundImage: FEATURED_HEADER } : undefined}
      >
        {media ? (
          <div className="pointer-events-none absolute -right-1 bottom-3 z-0 h-[92px] w-[42%] max-w-[150px]">
            {media}
          </div>
        ) : null}
        <div className={cn('relative z-10', media && 'pr-[38%]')}>
          <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
          <p className="mt-3 flex flex-wrap items-end gap-1 leading-none">
            <span className="text-[40px] font-extrabold tracking-tight">{price}</span>
            {unit ? (
              <span className="mb-1 text-[13px] font-medium text-[#6B7280]">{unit}</span>
            ) : null}
          </p>
          <p className="mt-3 min-h-[40px] text-[13px] leading-snug text-[#4B5563]">{description}</p>
          <Link
            href={href}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white transition-transform hover:-translate-y-px"
          >
            {cta}
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-5">
        {extra}
        <ul className="flex flex-1 flex-col gap-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[#D1D5DB] text-[#111827]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-[13.5px] leading-snug text-[#374151]">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}
