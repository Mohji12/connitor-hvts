'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { goBackInApp, isAppHome, isStandaloneAuthPath, useHasTopBar } from '@/lib/app-back';
import { isNativeApp } from '@/lib/platform';

/** Back bar for app pages that have no AppTopBar of their own (native app only). */
export function NativeBackBar(): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const hasTopBar = useHasTopBar();
  const [native, setNative] = React.useState(false);

  React.useEffect(() => {
    setNative(isNativeApp());
  }, []);

  const visible =
    native && !hasTopBar && !isAppHome(pathname) && !isStandaloneAuthPath(pathname);

  React.useEffect(() => {
    if (!visible) return;
    document.body.dataset.nativeBackBar = 'on';
    return () => {
      delete document.body.dataset.nativeBackBar;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        type="button"
        aria-label="Back"
        onClick={() => goBackInApp(router)}
        className="flex h-12 items-center gap-1 pl-2 pr-4 text-[15px] font-medium text-primary active:bg-primary/10"
      >
        <ChevronLeft className="h-6 w-6" />
        Back
      </button>
    </div>
  );
}
