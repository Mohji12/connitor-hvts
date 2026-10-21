'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

const PINK_WASH =
  'radial-gradient(90% 80% at 100% 0%, rgba(255,214,204,0.32) 0%, rgba(255,214,204,0) 58%), radial-gradient(80% 70% at 0% 100%, rgba(196,132,252,0.22) 0%, rgba(196,132,252,0) 52%)';

const EASE = [0.22, 1, 0.36, 1] as const;

type BannerCopy = {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
};

const visitorCopy: BannerCopy = {
  eyebrow: 'Visitor visits',
  headline: 'Every Visitor. Every Visit. Under Control.',
  body: 'Simplify visitor registration, streamline approvals, and provide a seamless visitor pass experience for your organization.',
  cta: 'Book a Visitor Pass',
  href: '/visitor-pass',
};

const deliveryCopy: BannerCopy = {
  eyebrow: 'Deliveries',
  headline: 'Every Delivery. Verified and Delivered.',
  body: "Manage incoming deliveries, simplify verification, and keep your organization's delivery workflow secure, organized, and efficient.",
  cta: 'Explore Delivery Management',
  href: '/vendor/deliveries/book',
};

function Banner({
  copy,
  fromX,
  washFlip,
}: {
  copy: BannerCopy;
  fromX: number;
  washFlip?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, x: fromX }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative isolate overflow-hidden rounded-2xl bg-[#001B71] shadow-[0_12px_28px_rgba(15,23,42,0.1)]"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundImage: PINK_WASH, transform: washFlip ? 'scaleX(-1)' : undefined }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7 sm:py-6">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
            {copy.eyebrow}
          </p>
          <h2 className="font-serif text-[clamp(1.25rem,2.2vw,1.75rem)] font-medium leading-tight tracking-[-0.02em] text-white antialiased">
            {copy.headline}
          </h2>
          <p className="mt-1.5 text-sm leading-snug text-white/75">{copy.body}</p>
        </div>
        <Link
          href={copy.href}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#001B71] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B71] sm:w-auto"
        >
          {copy.cta}
        </Link>
      </div>
    </motion.article>
  );
}

export default function ModuleBannersSection() {
  const reducedMotion = useReducedMotion();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = (): void => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const slide = Boolean(!reducedMotion && desktop);

  return (
    <section className="overflow-x-clip bg-[#F7F9FC] py-12 sm:py-14 lg:py-16" aria-label="Visitor visits and deliveries">
      <div className="container mx-auto flex min-w-0 flex-col gap-4 px-4 lg:px-8">
        <Banner copy={visitorCopy} fromX={slide ? -80 : 0} />
        <Banner copy={deliveryCopy} fromX={slide ? 80 : 0} washFlip />
      </div>
    </section>
  );
}
