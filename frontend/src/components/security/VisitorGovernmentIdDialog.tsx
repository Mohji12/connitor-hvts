'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SecurityAppointmentService } from '@/lib/services/securityAppointmentService';
import { GovernmentIdPreview } from '@/components/security/GovernmentIdPreview';

type Props = {
  visitId: string;
  visitorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VisitorGovernmentIdDialog({
  visitId,
  visitorName,
  open,
  onOpenChange,
}: Props) {
  const [govtIdUrl, setGovtIdUrl] = React.useState<string | null>(null);
  const [govtIdType, setGovtIdType] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setGovtIdUrl(null);
    setGovtIdType(null);
    SecurityAppointmentService.getVisitorDetails(visitId)
      .then((details) => {
        if (cancelled) return;
        setGovtIdUrl(details.govtIdUrl ?? null);
        setGovtIdType(details.govtIdType ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, visitId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visitor ID — {visitorName}</DialogTitle>
        </DialogHeader>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading uploaded ID...</p>
        )}
        {!loading && error && (
          <p className="text-sm text-destructive">Could not load visitor ID.</p>
        )}
        {!loading && !error && !govtIdUrl && (
          <p className="text-sm text-muted-foreground">No government ID on file for this visitor.</p>
        )}
        {!loading && govtIdUrl && (
          <GovernmentIdPreview govtIdUrl={govtIdUrl} govtIdType={govtIdType} />
        )}
      </DialogContent>
    </Dialog>
  );
}
