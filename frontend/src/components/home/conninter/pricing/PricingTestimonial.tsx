'use client';

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { testimonial } from "./pricingData";

export const PricingTestimonial = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.4 }}
    className="mx-auto mt-16 max-w-[640px] px-4"
  >
    <div className="relative rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
      <span className="absolute left-6 top-4 font-serif text-[48px] leading-none text-[#E2E8F0]">&ldquo;</span>
      <blockquote className="relative z-[1] pt-6 text-[17px] italic leading-relaxed text-[#1E293B]">
        {testimonial.quote}
      </blockquote>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4A90E2] text-sm font-bold text-white">
            {testimonial.initials}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1E293B]">{testimonial.name}</p>
            <p className="text-[13px] text-[#64748B]">{testimonial.title}</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);
