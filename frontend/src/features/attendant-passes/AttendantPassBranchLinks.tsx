'use client';

import * as React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { attendantApplyPath, buildAttendantApplyUrl } from '@/lib/attendant-pass-url';
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
  title = 'Family visit pass QR links',
  description =
    'Print or display this branch link as a QR code at reception and the security gate. Families scan it to open the apply form — there is no public booking button on the website.',
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

  const copyLink = async (branch: AttendantPassBranch) => {
    const url = buildAttendantApplyUrl(branch);
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
          const url = buildAttendantApplyUrl(branch);
          return (
            <div
              key={branch.id}
              className="rounded-lg border bg-white p-3 space-y-2"
            >
              <p className="font-medium text-sm">{branchLabel(branch)}</p>
              <p className="text-xs text-muted-foreground break-all font-mono">{url}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void copyLink(branch)}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy link
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <a href={attendantApplyPath(branch)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
