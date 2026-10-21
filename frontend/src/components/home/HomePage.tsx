'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/home/conninter/Navbar';
import HeroSection from '@/components/home/conninter/HeroSection';
import StatsTickerStrip from '@/components/home/conninter/StatsTickerStrip';
import HospitalsSection from '@/components/home/conninter/HospitalsSection';
import PricingSection from '@/components/home/conninter/PricingSection';
import ModuleBannersSection from '@/components/home/conninter/ModuleBannersSection';
import Footer from '@/components/home/conninter/Footer';

const INITIAL_BOOKINGS = 48_392;

export function HomePage() {
  const [bookingsCount, setBookingsCount] = useState(INITIAL_BOOKINGS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBookingsCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection bookingsCount={bookingsCount} />
      <StatsTickerStrip bookingsCount={bookingsCount} />
      <HospitalsSection />
      <PricingSection />
      <ModuleBannersSection />
      <Footer />
    </div>
  );
}
