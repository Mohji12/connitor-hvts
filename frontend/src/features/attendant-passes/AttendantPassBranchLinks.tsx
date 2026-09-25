'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { buildAttendantApplyUrl } from '@/lib/attendant-pass-url';
import {
  AttendantPassService,
  type AttendantPassBranch,
} from '@/lib/services/attendantPassService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AttendantPassBranchLinksProps {
  /** When set, only show this branch (e.g. ward admin). Otherwise show all hospitals. */
  branchId?: string | null;
  title?: string;
  description?: string;
}

function branchLabel(branch: AttendantPassBranch): string {
  const location = [branch.city, branch.state].filter(Boolean).join(', ');
  const chain = branch.hospitalChainName ? `${branch.hospitalChainName} · ` : '';
  return `${chain}${branch.name}${location ? ` (${location})` : ''}`;
}

export function AttendantPassBranchLinks({
  branchId,
  title = 'Family visit pass links',
  description = 'Share the direct link for your hospital with family members. They only need the patient MRN after opening the link.',
}: AttendantPassBranchLinksProps): React.ReactElement {
  const [branches, setBranches] = React.useState<AttendantPassBranch[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    AttendantPassService.listPublicBranches()
      .then((items) => {
        if (!cancelled) {
          setBranches(branchId ? items.filter((b) => b.id === branchId) : items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Could not load hospital links');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const copyLink = async (id: string) => {
    const url = buildAttendantApplyUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading hospitals…</p>}
        {!loading && branches.length === 0 && (
          <p className="text-sm text-muted-foreground">No hospitals found.</p>
        )}
        {branches.map((branch) => {
          const url = buildAttendantApplyUrl(branch.id);
          return (
            <div
              key={branch.id}
              className="rounded-lg border bg-white p-3 space-y-2"
            >
              <p className="font-medium text-sm">{branchLabel(branch)}</p>
              <p className="text-xs text-muted-foreground break-all font-mono">{url}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void copyLink(branch.id)}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy link
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/attendant-pass/apply?branchId=${encodeURIComponent(branch.id)}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
