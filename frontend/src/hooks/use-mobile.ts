'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind's default sm breakpoint
const TABLET_BREAKPOINT = 1024; // Tailwind's default md breakpoint

type DeviceType = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export function useResponsive(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setDevice({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
      });
    };

    checkDevice();

    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return device;
}
