'use client';

import { AnimatedPrice } from './AnimatedPrice';
import { OfferCard } from './OfferCard';
import type { Billing, PricingPlan } from './pricingData';
import { formatInr } from './pricingData';

type Props = {
  plan: PricingPlan;
  billing: Billing;
  index: number;
};

export const HospitalPricingCard = ({ plan, billing, index }: Props) => {
  const amount = billing === 'monthly' ? plan.monthlyAmount : plan.annualMonthlyEquivalent;
  const featured = plan.id === 'h-pro' || plan.id === 'h-premium';
  const description =
    billing === 'annual' && plan.annualTotal != null
      ? `${plan.audienceTag}. 20% less, billed ₹${formatInr(plan.annualTotal)}/year.`
      : plan.audienceTag;

  return (
    <OfferCard
      index={index}
      featured={featured}
      title={plan.name}
      price={
        <>
          ₹<AnimatedPrice value={amount ?? 0} key={`${billing}-${plan.id}`} />
        </>
      }
      unit="/monthly"
      description={description}
      cta={plan.cta.text}
      href="/portal?intent=register"
      features={plan.features.map((feature) => feature.text)}
    />
  );
};
