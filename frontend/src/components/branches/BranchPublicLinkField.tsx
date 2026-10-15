'use client';

import * as React from 'react';
import { Copy, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/api-errors';
import { buildAttendantApplyUrl } from '@/lib/attendant-pass-url';
import { BranchService } from '@/lib/services/branchService';

interface BranchPublicLinkFieldProps {
  branch: { id: string; hospitalChainId: string; slug?: string | null };
  onSaved?: (slug: string) => void;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Edit the family visit pass link name, e.g. conninter.com/attendant-pass/ovum-kalyan-nagar. */
export function BranchPublicLinkField({
  branch,
  onSaved,
}: BranchPublicLinkFieldProps): React.ReactElement {
  const [saved, setSaved] = React.useState(branch.slug ?? '');
  const [draft, setDraft] = React.useState(branch.slug ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSaved(branch.slug ?? '');
    setDraft(branch.slug ?? '');
  }, [branch.id, branch.slug]);

  const cleaned = toSlug(draft);
  const dirty = cleaned !== saved;
  const url = buildAttendantApplyUrl({ id: branch.id, slug: saved || null });

  const save = async (): Promise<void> => {
    if (cleaned.length < 3) {
      toast.error('Use at least 3 letters or numbers.');
      return;
    }
    setSaving(true);
    try {
      const updated = await BranchService.update(branch.hospitalChainId, branch.id, {
        slug: cleaned,
      });
      const next = updated.slug ?? cleaned;
      setSaved(next);
      setDraft(next);
      onSaved?.(next);
      toast.success('Public link updated. Share the new link; the old name stops working.');
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Could not update the link'));
    } finally {
      setSaving(false);
    }
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link2 className="h-3.5 w-3.5" /> Family visit pass link
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center rounded-md border bg-white pl-3 text-sm">
          <span className="shrink-0 text-muted-foreground">/attendant-pass/</span>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setDraft(cleaned)}
            placeholder="ovum-kalyan-nagar"
            className="min-w-0 border-0 pl-0.5 shadow-none focus-visible:ring-0"
            aria-label="Public link name"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copy()}
            className="cursor-pointer"
          >
            <Copy className="mr-1 h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      </div>
      <p className="break-all font-mono text-xs text-muted-foreground">{url}</p>
    </div>
  );
}
