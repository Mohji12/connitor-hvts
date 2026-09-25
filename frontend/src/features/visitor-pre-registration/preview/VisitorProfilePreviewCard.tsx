'use client';

import { Linkedin, Mail, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { VisitorPreviewData } from '../schemas/visitorAccountSchema';

interface VisitorProfilePreviewCardProps {
  data: VisitorPreviewData;
  className?: string;
}

export function VisitorProfilePreviewCard({ data, className }: VisitorProfilePreviewCardProps) {
  const fullName =
    data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Your name';
  const headline =
    data.headline ||
    (data.jobTitle && data.companyName ? `${data.jobTitle} at ${data.companyName}` : undefined);
  const avatarSrc = data.photoBlobUrl || data.photoUrl || undefined;
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className={cn('overflow-hidden border-2 shadow-lg', className)}>
      <div className="h-16 bg-gradient-to-r from-[#001B71] to-[#4A90E2]" />
      <CardContent className="relative px-6 pb-6 pt-0">
        <Avatar className="-mt-10 h-20 w-20 border-4 border-background shadow-md">
          <AvatarImage src={avatarSrc} alt={fullName} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        <div className="mt-3 space-y-1">
          <h2 className="text-xl font-semibold leading-tight">{fullName}</h2>
          {headline ? (
            <p className="text-sm text-muted-foreground">{headline}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Role and company appear here</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={data.emailVerified ? 'default' : 'secondary'}>
            Email {data.emailVerified ? 'verified' : 'pending'}
          </Badge>
          <Badge variant={data.phoneVerified ? 'default' : 'secondary'}>
            Phone {data.phoneVerified ? 'verified' : 'pending'}
          </Badge>
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          {data.email && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{data.email}</span>
              {data.emailType && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {data.emailType}
                </Badge>
              )}
            </li>
          )}
          {data.phone && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>+91 {data.phone}</span>
            </li>
          )}
          {data.linkedinUrl && (
            <li className="flex items-center gap-2 text-sky-700">
              <Linkedin className="h-4 w-4 shrink-0" />
              <span className="truncate">LinkedIn profile linked</span>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
