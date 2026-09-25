'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/home/conninter/Navbar';
import HeroSection from '@/components/home/conninter/HeroSection';
import StatsTickerStrip from '@/components/home/conninter/StatsTickerStrip';
import HowItWorksSection from '@/components/home/conninter/HowItWorksSection';
import HospitalsSection from '@/components/home/conninter/HospitalsSection';
import PricingSection from '@/components/home/conninter/PricingSection';
import StaffAccessStrip from '@/components/home/conninter/StaffAccessStrip';
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
      <HowItWorksSection />
      <HospitalsSection />
      <PricingSection />
      <StaffAccessStrip />
      <Footer />
    </div>
  );
}
