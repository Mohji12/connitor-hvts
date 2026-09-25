'use client';

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { PricingComparison } from "./pricing/PricingComparison";
import { PricingFaq } from "./pricing/PricingFaq";
import { PricingHero } from "./pricing/PricingHero";
import { PricingPlanCard } from "./pricing/PricingPlanCard";
import { PricingTestimonial } from "./pricing/PricingTestimonial";
import type { Audience, Billing } from "./pricing/pricingData";
import { getPlans } from "./pricing/pricingData";

const PricingSection = () => {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [audience, setAudience] = useState<Audience>("hospitals");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const plans = getPlans(audience);

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
          audience={audience}
          onAudienceChange={setAudience}
        />
      </div>

      {/* Cards sit below hero in stacking order; gentler -mt so they don’t cover the toggle row */}
      <div className="relative z-0 mx-auto -mt-10 max-w-[1200px] px-4 pb-8 md:-mt-12 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={audience}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {plans.map((plan, index) => (
              <PricingPlanCard
                key={plan.id}
                plan={plan}
                billing={billing}
                index={index}
                isLg={isLg}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 bg-[#F7F9FC] pt-8">
        <PricingComparison audience={audience} />
        <PricingTestimonial />
        <PricingFaq />
      </div>
    </section>
  );
};

export default PricingSection;
