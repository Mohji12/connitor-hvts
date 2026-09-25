'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, ArrowRight, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisitorService } from '@/lib/services/visitorService';

function VisitorRegistrationLandingContent() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;

  const [branchName, setBranchName] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setBranchName(null);
      setShowError(false);
      return;
    }

    let cancelled = false;

    const activeBranchId = branchId;

    async function fetchBranchName() {
      try {
        const branch = await VisitorService.getBranchInfo(activeBranchId);
        if (!cancelled) {
          setBranchName(branch?.name || null);
          setShowError(!branch?.name);
        }
      } catch {
        if (!cancelled) {
          setBranchName(null);
          setShowError(true);
        }
      }
    }

    fetchBranchName();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const welcomeMessage = branchName
    ? `Welcome to ${branchName}`
    : 'Welcome to Hospital';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
      <div className="w-full max-w-[480px] text-center">
        <div className="mb-12">
          <Building2
            className="mx-auto size-10 text-primary"
            aria-hidden="true"
          />

          <div className="mt-4" aria-live="polite" aria-atomic="true">
            <h1 className="text-3xl font-bold text-gray-900">
              {welcomeMessage}
            </h1>
          </div>

          <div
            className="mx-auto mt-4 h-0.5 w-12 bg-[#4A90E2]"
            aria-hidden="true"
          />

          <p className="mt-6 text-lg text-muted-foreground">
            Complete your registration in a few simple steps
          </p>

          {showError && (
            <p className="mt-2 text-sm text-amber-600" role="alert">
              Unable to load hospital details
            </p>
          )}
        </div>

        <div className="flex justify-center py-12">
          <UserCircle
            className="size-40 text-primary/20"
            aria-hidden="true"
          />
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <h2 className="text-sm uppercase tracking-wider text-gray-600">
            Visitor Registration
          </h2>

          <Link
            href={`/visitor-registration/wizard${branchId ? `?branchId=${branchId}` : ''}`}
            className="w-full"
          >
            <Button
              size="lg"
              type="button"
              className="w-full cursor-pointer font-semibold"
            >
              Start Registration
              <ArrowRight className="ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Secure visitor management system
        </footer>
      </div>
    </main>
  );
}

export default function VisitorRegistrationLandingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      }
    >
      <VisitorRegistrationLandingContent />
    </Suspense>
  );
}
