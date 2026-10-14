'use client';

import * as React from 'react';
import { Camera, ImagePlus, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MAX_SIDE = 800;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

async function shrinkToJpegDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = objectUrl;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface AttendantPhotoPickerProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function AttendantPhotoPicker({
  value,
  onChange,
  label = 'Photo (optional)',
  className,
  disabled,
}: AttendantPhotoPickerProps): React.ReactElement {
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const uploadRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a JPG or PNG image');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error('Image is too large (max 15MB)');
      return;
    }
    setBusy(true);
    try {
      onChange(await shrinkToJpegDataUrl(file));
    } catch {
      toast.error('Could not read that image. Try another one.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#4A90E2]/40 bg-slate-100">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={value} alt="Attendant photo" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="mr-1.5 h-4 w-4" />
            Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => uploadRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-4 w-4" />
            Upload
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => onChange(null)}
            >
              <X className="mr-1.5 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Shown on the pass so security can match the face.</p>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => void handleFile(e)}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFile(e)}
      />
    </div>
  );
}
