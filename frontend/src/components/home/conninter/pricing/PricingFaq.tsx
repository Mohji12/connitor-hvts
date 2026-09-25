'use client';

import { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { pricingFaqs } from './pricingData';

function FaqList({ interactive }: { interactive: boolean }) {
  return (
    <div className="mx-auto mt-16 max-w-[720px] px-4 pb-4">
      <div className="w-full">
        {pricingFaqs.map((item, i) =>
          interactive ? (
            <Collapsible key={i} className="border-b border-[#E2E8F0]">
              <CollapsibleTrigger className="flex h-14 w-full items-center justify-between py-0 text-left text-base font-semibold text-[#1E293B] hover:bg-[#F7F9FC] [&[data-state=open]>svg]:rotate-180">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pb-5 pt-0 text-[15px] leading-relaxed text-[#64748B]">
                {item.a}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div key={i} className="border-b border-[#E2E8F0]">
              <div className="flex h-14 w-full items-center justify-between py-0 text-left text-base font-semibold text-[#1E293B]">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export const PricingFaq = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Defer Radix collapsibles until after hydrate so browser extensions that
  // rewrite <button> attrs (e.g. fdprocessedid) cannot cause a mismatch.
  return <FaqList interactive={mounted} />;
};
