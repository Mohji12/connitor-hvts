'use client';

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HOW_IT_PHASES } from "./howItWorksData";

type Props = {
  reducedMotion: boolean;
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export const SectionHeader = ({ reducedMotion, title, subtitle, children }: Props) => (
  <motion.header
    initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
    whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6, ease: "easeOut", delay: HOW_IT_PHASES.header }}
    className="text-center mb-10 md:mb-12"
  >
    <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#4A90E2] mb-3">
      HOW IT WORKS
    </p>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={title}
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="md:min-h-[190px]"
      >
        <h2 className="text-[32px] md:text-[44px] font-extrabold text-[#001B71] leading-[1.15] tracking-[-0.02em] max-w-[700px] mx-auto text-balance">
          {title}
        </h2>
        <p className="mt-4 text-[17px] font-normal text-[#64748B] leading-relaxed max-w-[620px] mx-auto">
          {subtitle}
        </p>
      </motion.div>
    </AnimatePresence>
    {children && <div className="mt-6 flex justify-center">{children}</div>}
  </motion.header>
);
