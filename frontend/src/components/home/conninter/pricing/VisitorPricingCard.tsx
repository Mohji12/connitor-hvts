'use client';

import { OfferCard } from './OfferCard';
import type { VisitorPricePlan } from './pricingData';

type Props = {
  plan: VisitorPricePlan;
  index: number;
};

export const VisitorPricingCard = ({ plan, index }: Props) => {
  return (
    <OfferCard
      index={index}
      featured={plan.id === 'team' || plan.id === 'business'}
      title={plan.title}
      price={plan.price}
      unit={plan.unit || undefined}
      description={plan.summary}
      cta={plan.cta}
      href={plan.href}
      features={plan.features}
      extra={
        plan.sessions ? (
          <ul className="mb-4 space-y-1 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#334155]">
            {plan.sessions.map((session) => (
              <li key={session.label} className="flex items-center justify-between gap-3">
                <span>{session.label}</span>
                <span className="font-semibold text-[#111827]">{session.amount}</span>
              </li>
            ))}
          </ul>
        ) : null
      }
    />
  );
};
