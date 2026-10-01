import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ConninterWordmarkProps = {
  href?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show tagline baked into the logo asset (footer-style). Nav uses compact crop. */
  variant?: 'default' | 'full';
};

/** Approx. share of asset height used by the CONNINTER wordmark (rest is tagline). */
const WORDMARK_HEIGHT_RATIO = 0.72;

const fullHeightClass = {
  sm: 'h-14',
  md: 'h-[5.25rem]',
  lg: 'h-24',
};

const compactCrop = {
  sm: { view: 'h-9 w-[11.5rem]', viewPx: 2.25 },
  md: { view: 'h-11 w-[14rem]', viewPx: 2.75 },
  lg: { view: 'h-16 w-[18rem]', viewPx: 4 },
};

export function ConninterWordmark({
  href = '/',
  className,
  size = 'md',
  variant = 'default',
}: ConninterWordmarkProps) {
  const isFull = variant === 'full';
  const crop = compactCrop[size];
  const imageHeightRem = crop.viewPx / WORDMARK_HEIGHT_RATIO;

  const mark = isFull ? (
    <Image
      src="/images/conninter-logo.png"
      alt="Conninter — Meetings Made Easy"
      width={320}
      height={112}
      className={cn('w-auto object-contain object-left', fullHeightClass[size], className)}
      priority={size === 'md'}
    />
  ) : (
    <span className={cn('inline-block overflow-hidden', crop.view)}>
      <Image
        src="/images/conninter-logo.png"
        alt="Conninter"
        width={320}
        height={112}
        style={{ height: `${imageHeightRem}rem` }}
        className={cn('w-auto max-w-none object-left object-top', className)}
        priority={size === 'md'}
      />
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {mark}
    </Link>
  );
}
