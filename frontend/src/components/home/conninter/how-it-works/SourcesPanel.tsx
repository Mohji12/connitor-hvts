'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { Choreography, SourceItem } from "./howItWorksData";

type Props = {
  reducedMotion: boolean;
  title: string;
  items: SourceItem[];
  choreo: Choreography;
};

const pulseDotClass = (index: number): string => {
  return `[animation-delay:${index * 0.12}s]`;
};

function SourceRow({
  item,
  index,
  reducedMotion,
  choreo,
}: {
  item: SourceItem;
  index: number;
  reducedMotion: boolean;
  choreo: Choreography;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: -20 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.45,
        delay: choreo.phases.leftPanel + index * choreo.stagger,
        ease: "easeOut",
      }}
      className={cn(
        "flex h-[52px] items-center gap-3 rounded-lg px-[14px] py-2.5 transition-colors duration-200",
        item.featured && "border-l-[3px] border-[#16A34A] bg-[#F0FDF4]",
        !item.featured && "hover:bg-[#F7F9FC]",
      )}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.iconBg)}>
        <Icon className={cn("h-4 w-4", item.iconColor)} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold leading-tight text-[#1E293B]", item.nameHighlight && "text-[#4A90E2]")}>
          {item.name}
        </p>
        <p className="text-xs text-[#94A3B8]">{item.subtitle}</p>
      </div>
      {item.pulseDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full animate-source-dot",
            item.pulseDot === "blue" && "bg-[#4A90E2]",
            item.pulseDot === "green" && "bg-[#16A34A]",
            item.pulseDot === "purple" && "bg-[#7C3AED]",
            pulseDotClass(index),
          )}
        />
      )}
    </motion.div>
  );
}

export const SourcesPanel = ({ reducedMotion, title, items, choreo }: Props) => {
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const [open, setOpen] = useState(false);
  const showCollapse = isTablet && items.length > 5;
  const rest = items.slice(5);
  const restCount = rest.length;

  return (
    <div className="min-w-0 lg:w-[28%] lg:max-w-none">
      <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{title}</h3>
      {!showCollapse && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <SourceRow key={item.name} item={item} index={index} reducedMotion={reducedMotion} choreo={choreo} />
          ))}
        </div>
      )}
      {showCollapse && (
        <div className="flex flex-col gap-1.5">
          {items.slice(0, 5).map((item, index) => (
            <SourceRow key={item.name} item={item} index={index} reducedMotion={reducedMotion} choreo={choreo} />
          ))}
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent className="flex flex-col gap-1.5">
              {rest.map((item, i) => (
                <SourceRow key={item.name} item={item} index={5 + i} reducedMotion={reducedMotion} choreo={choreo} />
              ))}
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 justify-start px-3 text-xs text-[#64748B] hover:text-[#1E293B]">
                {open ? "Show less" : `+${restCount} more`}
                <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", open && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      )}
    </div>
  );
};
