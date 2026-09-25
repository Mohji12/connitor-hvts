'use client';

import type { ButtonHTMLAttributes } from 'react';

/**
 * Marketing CTAs often trip hydration when extensions inject attrs (e.g. fdprocessedid) on <button>.
 */
export function ClientButton({
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} suppressHydrationWarning {...props} />;
}
