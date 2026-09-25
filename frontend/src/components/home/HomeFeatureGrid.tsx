import {
  CalendarCheck,
  IdCard,
  MessageSquare,
  UserCircle,
} from 'lucide-react';
import { HOME_FEATURES } from '@/lib/home-journeys';

const FEATURE_ICONS = [UserCircle, CalendarCheck, MessageSquare, IdCard] as const;

export function HomeFeatureGrid() {
  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="features-heading">
      <div className="mb-8 text-center lg:text-left">
        <h2 id="features-heading" className="text-2xl font-bold text-slate-900">
          Built for modern hospital visits
        </h2>
        <p className="mt-2 text-slate-600">Everything visitors need, from registration to check-out.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_FEATURES.map((feature, index) => {
          const Icon = FEATURE_ICONS[index] ?? UserCircle;
          return (
            <div
              key={feature.title}
              className="rounded-xl border border-teal-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
