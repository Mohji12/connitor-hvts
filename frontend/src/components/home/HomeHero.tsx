import Link from 'next/link';
import { CalendarCheck, IdCard, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HOME_TRUST_BADGES } from '@/lib/home-journeys';

export function HomeHero() {
  return (
    <section className="text-center lg:text-left">
      <div className="mb-6 flex flex-wrap justify-center gap-2 lg:justify-start">
        {HOME_TRUST_BADGES.map((badge) => (
          <Badge
            key={badge}
            variant="secondary"
            className="border border-teal-100 bg-teal-50/80 text-teal-800"
          >
            {badge}
          </Badge>
        ))}
      </div>

      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
        Your hospital visit, simplified
      </h1>

      <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 lg:mx-0">
        Create one Connitor profile, book appointments online, apply for a family visit pass,
        check in faster at the gate, and track every visit from a single dashboard.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
        <Button
          asChild
          size="lg"
          className="h-12 bg-teal-600 px-8 text-base text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"
        >
          <Link href="/visitor/register">
            <UserPlus className="mr-2 h-5 w-5" />
            Create your profile
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 border-teal-200 bg-white/80 px-8 text-base text-teal-800 hover:bg-teal-50"
        >
          <Link href="/book-appointment">
            <CalendarCheck className="mr-2 h-5 w-5" />
            Book without profile
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 border-teal-200 bg-white/80 px-8 text-base text-teal-800 hover:bg-teal-50"
        >
          <Link href="/attendant-pass">
            <IdCard className="mr-2 h-5 w-5" />
            Attendant visit pass
          </Link>
        </Button>
      </div>
    </section>
  );
}
