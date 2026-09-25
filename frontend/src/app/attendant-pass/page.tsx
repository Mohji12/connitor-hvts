'use client';

import * as React from 'react';
import Link from 'next/link';
import { AttendantPassService, type AttendantPassBranch } from '@/lib/services/attendantPassService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function branchLabel(branch: AttendantPassBranch): string {
  const location = [branch.city, branch.state].filter(Boolean).join(', ');
  return location ? `${branch.name} — ${location}` : branch.name;
}

export default function AttendantPassLandingPage(): React.ReactElement {
  const [branches, setBranches] = React.useState<AttendantPassBranch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    AttendantPassService.listPublicBranches()
      .then(setBranches)
      .catch(() => setError('Could not load hospitals. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F9FC] p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Family visit pass</h1>
          <p className="text-sm text-muted-foreground">
            Select your hospital to apply for an attendant visit pass for an admitted patient.
            You will need the patient&apos;s MRN from the admission document.
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading hospitals…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && branches.length === 0 && (
          <p className="text-sm text-muted-foreground">No hospitals are available yet.</p>
        )}

        <div className="space-y-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{branchLabel(branch)}</CardTitle>
                {branch.hospitalChainName && (
                  <p className="text-xs text-muted-foreground">{branch.hospitalChainName}</p>
                )}
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/attendant-pass/apply?branchId=${encodeURIComponent(branch.id)}`}>
                    Apply for visit pass
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
