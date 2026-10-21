'use client';

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PricingHero } from "./pricing/PricingHero";
import { DeliveryPricingCard } from "./pricing/DeliveryPricingCard";
import { HospitalPricingCard } from "./pricing/HospitalPricingCard";
import { VisitorPricingCard } from "./pricing/VisitorPricingCard";
import type { Billing, PricingFocus } from "./pricing/pricingData";
import { deliveryPrices, hospitalPlans, visitorPrices } from "./pricing/pricingData";

const PricingSection = () => {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [focus, setFocus] = useState<PricingFocus>("visit");

  return (
    <section id="pricing" className="relative overflow-hidden bg-[#F7F9FC] pb-16 pt-12 md:pt-16">
      <div className="relative pb-6">
        <PricingHero
          billing={billing}
          onBillingChange={setBilling}
          focus={focus}
          onFocusChange={setFocus}
        />
      </div>

      <div className={`relative z-10 mx-auto px-4 pb-8 lg:px-8 ${focus === "delivery" ? "max-w-[1400px]" : "max-w-[1200px]"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={focus}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={
              focus === "delivery"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
                : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
            }
          >
            {focus === "visit"
              ? hospitalPlans.map((plan, index) => (
                  <HospitalPricingCard key={plan.id} plan={plan} billing={billing} index={index} />
                ))
              : focus === "delivery"
                ? deliveryPrices.map((option, index) => (
                    <DeliveryPricingCard key={option.id} option={option} index={index} />
                  ))
                : visitorPrices.map((plan, index) => (
                    <VisitorPricingCard key={plan.id} plan={plan} index={index} />
                  ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default PricingSection;
