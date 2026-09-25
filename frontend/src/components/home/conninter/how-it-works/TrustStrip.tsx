'use client';

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { HOW_IT_PHASES, trustBadges } from "./howItWorksData";

type Props = {
  reducedMotion: boolean;
};

export const TrustStrip = ({ reducedMotion }: Props) => (
  <motion.div
    initial={reducedMotion ? false : { opacity: 0 }}
    whileInView={reducedMotion ? undefined : { opacity: 1 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.4, delay: HOW_IT_PHASES.trustStrip }}
    className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-4 md:mt-10"
  >
    {trustBadges.map((label) => (
      <div key={label} className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={2} aria-hidden />
        <span className="text-sm font-medium text-[#475569]">{label}</span>
      </div>
    ))}
  </motion.div>
);
