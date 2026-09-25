'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LivePhotoStepProps {
  onCapture: (file: File, previewUrl: string) => void;
  loading?: boolean;
}

export function LivePhotoStep({ onCapture, loading }: LivePhotoStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState('');

  const startCamera = async (mode = facingMode) => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setError('Camera access is required for live photo capture.');
    }
  };

  const flipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    
    await startCamera(newMode);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'live-photo.jpg', { type: 'image/jpeg' });
        onCapture(file, canvas.toDataURL('image/jpeg', 0.85));
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        setStreaming(false);
      },
      'image/jpeg',
      0.85,
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Take a live photo using your webcam. Gallery upload is not available in this version.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {!streaming && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button type="button" variant="secondary" onClick={() => startCamera()}>
              <Camera className="mr-2 h-4 w-4" />
              Start camera
            </Button>
          </div>
        )}
      </div>
      {streaming && (
        <div className="flex gap-2">
          <Button type="button" onClick={capture} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Capture photo
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={flipCamera} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
