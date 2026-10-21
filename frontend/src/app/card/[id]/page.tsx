'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Download, Phone, Mail } from 'lucide-react';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { profileCardIdFromLocation } from '@/lib/static-export-route';

type PublicCard = {
  name: string;
  phone: string | null;
  email: string | null;
  title: string | null;
  organization: string | null;
  kind: string;
};

export default function PublicProfileCardPage(): React.ReactElement {
  const params = useParams();
  const [token, setToken] = React.useState(() =>
    profileCardIdFromLocation(typeof window === 'undefined' ? '' : window.location.pathname, params.id),
  );
  const [card, setCard] = React.useState<PublicCard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [missing, setMissing] = React.useState(false);
  const downloaded = React.useRef(false);

  React.useEffect(() => {
    setToken(profileCardIdFromLocation(window.location.pathname, params.id));
  }, [params.id]);

  const downloadVcard = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/public/profile-cards/${encodeURIComponent(id)}/vcard`);
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'contact.vcf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }, []);

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      setMissing(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/profile-cards/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('missing');
        return (await res.json()) as PublicCard;
      })
      .then((data) => {
        if (cancelled) return;
        setCard(data);
        setMissing(false);
        if (!downloaded.current) {
          downloaded.current = true;
          void downloadVcard(token).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCard(null);
          setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [downloadVcard, token]);

  if (loading) {
    return <ConnitorLoader variant="fullscreen" message="Opening contact card…" />;
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-4 px-4 py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary/70">Conninter</p>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">{card?.name ?? 'Contact not found'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm">
          {missing || !card ? (
            <p className="text-muted-foreground">This contact card is missing or no longer active.</p>
          ) : (
            <>
              {card.title || card.organization ? (
                <p className="text-muted-foreground">
                  {[card.title, card.organization].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              {card.phone ? (
                <p className="flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4" />
                  {card.phone}
                </p>
              ) : null}
              {card.email ? (
                <p className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" />
                  {card.email}
                </p>
              ) : null}
              <Button className="w-full" onClick={() => void downloadVcard(token)}>
                <Download className="mr-2 h-4 w-4" />
                Save contact
              </Button>
              <p className="text-xs text-muted-foreground">
                Your phone should offer to add this person. If nothing happened, tap Save contact.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
