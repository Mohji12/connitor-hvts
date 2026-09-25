'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Bed, Calendar, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ClientButton } from '@/components/home/conninter/ClientButton';

interface Hospital {
  name: string;
  city: string;
  beds: string;
  years: number;
  specialties: string[];
  accreditations: string[];
  rating: number;
  tier: 'PREMIUM' | 'PARTNER';
  slotsLabel: string;
  slotsAvailable: string[];
  bookedSlots: string[];
  initial: string;
  image: string;
}

const hospitals: Hospital[] = [
  {
    name: 'Apollo Hospitals',
    city: 'Chennai',
    beds: '710+',
    years: 38,
    specialties: ['Cardiology', 'Oncology', 'Neurology'],
    accreditations: ['NABH ACCREDITED', 'JCI GOLD'],
    rating: 4.8,
    tier: 'PREMIUM',
    slotsLabel: '5 Slots Today',
    slotsAvailable: ['9:00 AM', '9:30 AM', '10:00 AM', '2:30 PM', '4:00 PM'],
    bookedSlots: ['10:30 AM', '11:00 AM'],
    initial: 'A',
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=500&h=300&fit=crop',
  },
  {
    name: 'Sakra World Hospital',
    city: 'Bengaluru',
    beds: '340+',
    years: 12,
    specialties: ['Orthopaedics', 'Sports Medicine', 'Spine Surgery'],
    accreditations: ['NABH ACCREDITED', 'JCI GOLD'],
    rating: 4.6,
    tier: 'PREMIUM',
    slotsLabel: '3 Slots Today',
    slotsAvailable: ['10:00 AM', '2:00 PM', '3:30 PM'],
    bookedSlots: ['9:00 AM', '11:30 AM'],
    initial: 'S',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&h=300&fit=crop',
  },
  {
    name: 'Manipal Hospital',
    city: 'Bengaluru',
    beds: '600+',
    years: 28,
    specialties: ['Oncology', 'Neurology', 'Paediatrics'],
    accreditations: ['NABH ACCREDITED', 'JCI GOLD'],
    rating: 4.7,
    tier: 'PARTNER',
    slotsLabel: '7 Slots Today',
    slotsAvailable: ['8:30 AM', '9:00 AM', '10:30 AM', '11:00 AM', '1:30 PM', '3:00 PM', '4:30 PM'],
    bookedSlots: ['12:00 PM'],
    initial: 'M',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=500&h=300&fit=crop',
  },
  {
    name: 'Fortis Malar Hospital',
    city: 'Chennai',
    beds: '180+',
    years: 30,
    specialties: ['Cardiac Sciences', 'Neurosciences'],
    accreditations: ['NABH ACCREDITED'],
    rating: 4.5,
    tier: 'PREMIUM',
    slotsLabel: '2 Slots Today',
    slotsAvailable: ['11:00 AM', '3:00 PM'],
    bookedSlots: ['9:00 AM', '10:00 AM', '2:00 PM'],
    initial: 'F',
    image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=500&h=300&fit=crop',
  },
  {
    name: 'Medanta — The Medicity',
    city: 'Gurugram',
    beds: '1250+',
    years: 15,
    specialties: ['Multi-specialty', 'Robotics Surgery'],
    accreditations: ['NABH ACCREDITED', 'JCI'],
    rating: 4.9,
    tier: 'PREMIUM',
    slotsLabel: '4 Slots Tomorrow',
    slotsAvailable: ['9:00 AM', '10:30 AM', '2:00 PM', '4:00 PM'],
    bookedSlots: ['11:00 AM', '1:00 PM', '3:30 PM'],
    initial: 'M',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=500&h=300&fit=crop',
  },
];

const cities = ['All', 'Chennai', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Gurugram'];

export default function HospitalsSection() {
  const router = useRouter();
  const [activeCity, setActiveCity] = useState('All');
  const [expandedSlots, setExpandedSlots] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});

  const filtered = activeCity === 'All' ? hospitals : hospitals.filter((h) => h.city === activeCity);

  const handleSlotSelect = (hospitalName: string, slot: string) => {
    setSelectedSlots((prev) => ({ ...prev, [hospitalName]: slot }));
  };

  const goBook = () => {
    router.push('/book-appointment');
  };

  return (
    <section id="hospitals" className="bg-muted/30 py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h2 className="mb-3 text-3xl font-extrabold text-foreground md:text-4xl">
            Explore Our Partner Hospitals
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Discover top-rated hospitals with real-time availability for your next visit
          </p>
        </motion.div>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {cities.map((c) => (
            <ClientButton
              key={c}
              onClick={() => setActiveCity(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCity === c
                  ? 'bg-secondary text-secondary-foreground'
                  : 'border bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {c}
            </ClientButton>
          ))}
        </div>

        <div className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4">
          {filtered.map((h) => (
            <motion.div
              key={h.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="max-w-[340px] min-w-[320px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.image} alt={h.name} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />

                <div className="absolute right-3 top-3 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                    <Bed className="h-3 w-3" /> {h.beds} Beds
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                    <Calendar className="h-3 w-3" /> {h.years} Years
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">
                  {h.initial}
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ClientButton
                    onClick={() => setExpandedSlots(expandedSlots === h.name ? null : h.name)}
                    className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/20"
                  >
                    <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
                    {h.slotsLabel}
                    <ChevronRight
                      className={`h-3 w-3 transition-transform ${expandedSlots === h.name ? 'rotate-90' : ''}`}
                    />
                  </ClientButton>
                  <div className="flex gap-1">
                    <span className="rounded-full border border-success/30 px-2 py-0.5 text-[10px] font-semibold text-success">
                      ✓ EMPANELED
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        h.tier === 'PREMIUM'
                          ? 'bg-secondary/10 text-secondary'
                          : 'border text-muted-foreground'
                      }`}
                    >
                      {h.tier}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSlots === h.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="-mx-3 space-y-2 rounded-lg bg-accent px-3 pb-1 pt-2">
                        <p className="text-[11px] font-semibold text-foreground">
                          Available Slots — {h.name}, {h.city}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Each slot is 10 minutes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[...h.slotsAvailable, ...h.bookedSlots].sort().map((slot) => {
                            const booked = h.bookedSlots.includes(slot);
                            const selected = selectedSlots[h.name] === slot;
                            return (
                              <ClientButton
                                key={slot}
                                disabled={booked}
                                onClick={() => handleSlotSelect(h.name, slot)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                  booked
                                    ? 'cursor-not-allowed bg-muted text-muted-foreground/50 line-through'
                                    : selected
                                      ? 'border-secondary bg-secondary text-secondary-foreground'
                                      : 'border-border bg-background text-foreground hover:bg-secondary/10'
                                }`}
                              >
                                {selected && <Check className="mr-1 inline h-3 w-3" />}
                                {slot}
                              </ClientButton>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          disabled={!selectedSlots[h.name]}
                          onClick={goBook}
                          className="mt-1 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        >
                          Select &amp; Continue <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap gap-1.5">
                  {h.accreditations.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground">{h.name}</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    {h.city}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">{h.specialties.join(' · ')}</p>

                <div className="flex items-center gap-1 text-sm text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.floor(h.rating) ? 'fill-current' : 'opacity-30'}`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-semibold text-foreground">{h.rating}</span>
                </div>

                <div className="border-t pt-3">
                  <Button
                    onClick={goBook}
                    className="w-full bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
                  >
                    Book Now <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
