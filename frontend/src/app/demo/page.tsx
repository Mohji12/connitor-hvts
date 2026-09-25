'use client';

import Link from 'next/link';
import DemoFlowApp from '@/components/home/conninter/demo/DemoFlowApp';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
        <p className="font-semibold">Product tour (demo only)</p>
        <p className="mt-0.5 text-amber-900/80">
          This interactive walkthrough is not production authentication. No real accounts or hospital
          data are used.{' '}
          <Link href="/" className="font-medium underline underline-offset-2 hover:text-amber-950">
            Back to home
          </Link>
        </p>
      </div>
      <DemoFlowApp />
    </div>
  );
}
