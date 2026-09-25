'use client';

import * as React from 'react';
import { ExternalLink, FileText, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  govtIdUrl?: string | null;
  govtIdType?: string | null;
  className?: string;
};

function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes('application/pdf');
}

export function GovernmentIdPreview({ govtIdUrl, govtIdType, className }: Props) {
  const [imageError, setImageError] = React.useState(false);

  if (!govtIdUrl) {
    return null;
  }

  const label = govtIdType ? govtIdType.replace(/_/g, ' ') : 'Government ID';
  const pdf = isPdfUrl(govtIdUrl);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
        <IdCard className="h-4 w-4" />
        Uploaded ID — {label}
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        {!pdf && !imageError ? (
          <img
            src={govtIdUrl}
            alt={`Visitor ${label}`}
            className="mx-auto max-h-56 w-full rounded-md object-contain bg-white"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-5 w-5 shrink-0" />
            <span>{pdf ? 'PDF document on file' : 'Preview unavailable — open document'}</span>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href={govtIdUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open uploaded ID
          </a>
        </Button>
      </div>
    </div>
  );
}
