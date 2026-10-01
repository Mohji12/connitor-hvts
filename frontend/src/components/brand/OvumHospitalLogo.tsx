import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const OVUM_LOGO_SRC = '/images/ovum-hospital-logo.png';

type OvumHospitalLogoProps = {
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

export function OvumHospitalLogo({
  href = null,
  className,
  size = 'md',
}: OvumHospitalLogoProps) {
  const mark = (
    <Image
      src={OVUM_LOGO_SRC}
      alt="Ovum Woman & Child Speciality Hospital"
      width={560}
      height={160}
      className={cn('h-auto w-full object-contain object-left', heightClass[size], widthClass[size], className)}
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
