'use client';

import * as React from 'react';
import { isNativeApp } from '@/lib/platform';

const MOBILE_BREAKPOINT = 640; // Tailwind's default sm breakpoint
const TABLET_BREAKPOINT = 1024; // Tailwind's default lg breakpoint

type DeviceType = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

function readDevice(): DeviceType {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: true };
  }
  const width = window.innerWidth;
  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
  };
}

export function useResponsive(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>(readDevice);

  React.useEffect(() => {
    const checkDevice = () => setDevice(readDevice());
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return device;
}

/** True on phones/tablets below `lg`, and always inside the native app. */
export function useIsAppShell(): boolean {
  const { isDesktop } = useResponsive();
  const [native, setNative] = React.useState(false);

  React.useEffect(() => {
    setNative(isNativeApp());
  }, []);

  return native || !isDesktop;
}
