import Link from 'next/link';
import { AppointmentFlowGuide } from '@/components/appointment/AppointmentFlowGuide';
import { Button } from '@/components/ui/button';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold">Appointment Flow</h1>
            <p className="text-sm text-muted-foreground">
              Complete frontend guide — visitor booking through check-out
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/book-appointment">Book now</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <AppointmentFlowGuide />
      </main>
    </div>
  );
}
