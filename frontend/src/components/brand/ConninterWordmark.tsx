import Link from 'next/link';
import { cn } from '@/lib/utils';

type ConninterWordmarkProps = {
  href?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

/** CSS wordmark: CONN + I (with blue accent dot) + NTER */
export function ConninterWordmark({
  href = '/',
  className,
  size = 'md',
}: ConninterWordmarkProps) {
  const mark = (
    <span
      className={cn(
        'font-extrabold tracking-tight text-primary',
        sizeClass[size],
        className,
      )}
    >
      CONN
      <span className="relative inline-block">
        I
        <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#4A90E2]" />
      </span>
      NTER
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-center gap-1">
      {mark}
    </Link>
  );
}
