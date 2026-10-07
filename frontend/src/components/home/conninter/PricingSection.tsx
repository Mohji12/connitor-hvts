'use client';

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PricingComparison } from "./pricing/PricingComparison";
import { PricingFaq } from "./pricing/PricingFaq";
import { PricingHero } from "./pricing/PricingHero";
import { DeliveryPricingCard } from "./pricing/DeliveryPricingCard";
import { HospitalPricingCard } from "./pricing/HospitalPricingCard";
import { VisitorPricingCard } from "./pricing/VisitorPricingCard";
import { PricingTestimonial } from "./pricing/PricingTestimonial";
import type { Billing, PricingFocus } from "./pricing/pricingData";
import { deliveryPrices, hospitalPlans, visitorPrices } from "./pricing/pricingData";

const PricingSection = () => {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [focus, setFocus] = useState<PricingFocus>("visit");

  return (
    <section id="pricing" className="relative overflow-hidden bg-[#F7F9FC] pb-20">
      {/* Navy curved backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(520px,58vh)] bg-[#001B71]"
        style={{ clipPath: "ellipse(90% 65% at 50% 0%)" }}
        aria-hidden
      />

      {/* High z + isolate: billing/audience controls must stay above the card grid for hit-testing */}
      <div className="relative z-[100] isolate pb-12 pt-20 md:pb-14">
        <PricingHero
          billing={billing}
          onBillingChange={setBilling}
          focus={focus}
          onFocusChange={setFocus}
        />
      </div>

      {/* Cards sit below hero in stacking order; gentler -mt so they don’t cover the toggle row */}
      <div className={`relative z-0 mx-auto -mt-10 px-4 pb-8 md:-mt-12 lg:px-8 ${focus === "delivery" ? "max-w-[1400px]" : "max-w-[1200px]"}`}>
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

      <div className="relative z-10 bg-[#F7F9FC] pt-8">
        {focus === "visit" && <PricingComparison audience="hospitals" />}
        <PricingTestimonial />
        <PricingFaq />
      </div>
    </section>
  );
};

export default PricingSection;
