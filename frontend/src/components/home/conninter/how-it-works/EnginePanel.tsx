'use client';

import { Fragment } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Choreography, FlowModule, PipelineStatus } from "./howItWorksData";

type Props = {
  reducedMotion: boolean;
  flow: FlowModule;
  choreo: Choreography;
};

function connectorKind(left: PipelineStatus, right: PipelineStatus): "solid" | "dashed" {
  if (left === "done" && right === "done") return "solid";
  return "dashed";
}

export const EnginePanel = ({ reducedMotion, flow, choreo }: Props) => {
  const baseDelay = choreo.phases.centerPanel;
  const pipelineSteps = flow.pipeline;

  return (
    <div className="min-w-0 lg:w-[44%]">
      <div
        className={cn(
          "rounded-2xl border border-[#E2E8F0] p-6 md:p-7",
          "shadow-[0_8px_30px_rgba(0,27,113,0.06)]",
          "bg-[radial-gradient(ellipse_at_center,_#FFFFFF_0%,_#FAFBFF_100%)]",
        )}
      >
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.3, delay: baseDelay }}
          className="mx-auto flex w-fit items-center justify-center rounded-full bg-[#001B71] px-5 py-2 shadow-[0_0_20px_rgba(74,144,226,0.15)]"
        >
          <span className="text-sm font-semibold text-white">Conninter</span>
        </motion.div>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={reducedMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.2, delay: baseDelay + 0.15 }}
          className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-[#64748B]"
        >
          {flow.engineLabel}
        </motion.p>

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-0 gap-y-5 lg:flex-nowrap lg:justify-between">
          {pipelineSteps.map((step, i) => {
            const Icon = step.icon;
            const isDone = step.status === "done";
            const isActive = step.status === "active";
            const isPending = step.status === "pending";
            const next = pipelineSteps[i + 1];

            return (
              <Fragment key={step.name}>
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: baseDelay + 0.25 + i * choreo.pipelineStagger }}
                  className={cn("relative flex w-[68px] flex-col items-center gap-2 sm:w-[72px]", isPending && "opacity-50")}
                >
                  {isDone && (
                    <CheckCircle
                      className="absolute -right-0.5 -top-0.5 z-10 h-3.5 w-3.5 text-[#16A34A]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-xl",
                      step.bg,
                      isActive && "animate-pipeline-ring",
                    )}
                  >
                    <Icon className="h-5 w-5 text-[#1E293B]" strokeWidth={2} />
                  </div>
                  <span className="text-center text-xs font-medium leading-tight text-[#1E293B]">{step.name}</span>
                </motion.div>

                {next && (
                  <div key={`conn-${i}`} className="flex h-11 items-center self-start pt-1">
                    <div className="flex items-center gap-0.5">
                      <motion.div
                        initial={reducedMotion ? false : { scaleX: 0 }}
                        whileInView={reducedMotion ? undefined : { scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: baseDelay + 0.55 + i * 0.08 }}
                        className="origin-left"
                      >
                        {connectorKind(step.status, next.status) === "solid" ? (
                          <div className="h-0.5 w-5 rounded-full bg-[#16A34A] md:w-7" />
                        ) : (
                          <div className="h-px w-5 border-t border-dashed border-[#CBD5E1] md:w-7" />
                        )}
                      </motion.div>
                      <ChevronRight className="h-3 w-3 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="mx-auto my-5 h-px w-[90%] bg-[#E2E8F0]" />

        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={reducedMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, delay: baseDelay + 0.65 }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {flow.intelligence.map((cell) => {
            const Icon = cell.icon;
            return (
              <Tooltip key={cell.title}>
                <TooltipTrigger asChild>
                  <div className="flex cursor-default items-start gap-2 rounded-lg border border-transparent bg-[#F8F7FF] px-3 py-2 transition-colors hover:border-[#E9D5FF]">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7C3AED]" strokeWidth={2} />
                    <div>
                      <p className="text-[13px] font-medium text-[#1E293B]">{cell.title}</p>
                      <p className="sr-only">{cell.detail}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  {cell.detail}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.2, delay: baseDelay + 0.85 }}
          className="mt-5 flex w-full items-center justify-center rounded-[10px] bg-[#EEF4FF] px-4 py-2.5"
        >
          <p className="text-center text-[13px] font-medium leading-snug text-[#4A90E2]">
            {flow.controlNote}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
