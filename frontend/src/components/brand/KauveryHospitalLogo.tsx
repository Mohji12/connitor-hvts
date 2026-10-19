import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const KAUVERY_LOGO_SRC = '/images/kauvery-hospital-logo.png';

type KauveryHospitalLogoProps = {
  href?: string | null;
  className?: string;
  /** Sidebar / header compact */
  size?: 'sm' | 'md' | 'lg';
};

const heightClass = {
  sm: 'h-8',
  md: 'h-11',
  lg: 'h-14',
};

const widthClass = {
  sm: 'w-[7.5rem]',
  md: 'w-[10.5rem]',
  lg: 'w-[14rem]',
};

export function KauveryHospitalLogo({
  href = null,
  className,
  size = 'md',
}: KauveryHospitalLogoProps) {
  const mark = (
    <Image
      src={KAUVERY_LOGO_SRC}
      alt="Kauvery Hospital"
      width={560}
      height={308}
      className={cn(
        'h-auto w-full object-contain object-left',
        heightClass[size],
        widthClass[size],
        className,
      )}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0">
        {mark}
      </Link>
    );
  }

  return <div className="shrink-0">{mark}</div>;
}
