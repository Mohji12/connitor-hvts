'use client';

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { APP_HOME_PATH, useRegisterTopBar } from '@/lib/app-back';
import { isNativeApp } from '@/lib/platform';

/**
 * Public landing for /attendant-pass — no hospital picker.
 * Secondary visitors reach apply by scanning the branch QR at reception or the security gate.
 */
export default function AttendantPassLandingPage(): React.ReactElement {
  useRegisterTopBar();
  return (
    <main className="pt-safe min-h-dvh w-full min-w-0 bg-[#F7F9FC] p-4 lg:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <ConninterWordmark size="md" />
        <Card>
          <CardContent className="space-y-4 pt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef5ff] text-[#001b71]">
              <QrCode className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-[#001b71]">Family visit pass</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To apply for a visit pass for an admitted patient, scan the QR code at the hospital
              reception desk or the security gate. That opens the apply form for your hospital —
              online booking from this site is not available.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={isNativeApp() ? APP_HOME_PATH : '/'}>Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
