'use client';

import { OfferCard } from './OfferCard';
import type { DeliveryPriceOption } from './pricingData';

type Props = {
  option: DeliveryPriceOption;
  index: number;
};

export const DeliveryPricingCard = ({ option, index }: Props) => {
  return (
    <OfferCard
      index={index}
      featured
      title={option.title}
      price={`₹${option.amount}`}
      unit="/delivery"
      description={`${option.subtitle} · ${option.minutes} min slot`}
      cta="Select"
      href="/vendor/deliveries/book"
      features={option.features}
      media={
        <img
          src={option.image}
          alt=""
          className="h-full w-full object-contain object-right-bottom"
        />
      }
    />
  );
};
