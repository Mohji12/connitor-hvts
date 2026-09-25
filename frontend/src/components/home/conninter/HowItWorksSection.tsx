'use client';

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useAutoRotate } from "@/hooks/use-auto-rotate";
import { EnginePanel } from "./how-it-works/EnginePanel";
import { FlowConnectors } from "./how-it-works/FlowConnectors";
import { deliveryFlow, getChoreography, visitorFlow, type FlowModule } from "./how-it-works/howItWorksData";
import { OutputsPanel } from "./how-it-works/OutputsPanel";
import { SectionHeader } from "./how-it-works/SectionHeader";
import { SourcesPanel } from "./how-it-works/SourcesPanel";
import { TrustStrip } from "./how-it-works/TrustStrip";
import { ModuleToggle, SHOWCASE_MODULES, type ShowcaseModule } from "./ModuleToggle";

const ROTATE_MS = 9000;

const flows: Record<ShowcaseModule, FlowModule> = {
  visitor: visitorFlow,
  delivery: deliveryFlow,
};

const HowItWorksSection = () => {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.3 });
  const [hovering, setHovering] = useState(false);
  const [hasSwitched, setHasSwitched] = useState(false);

  const { index, select, running, cycleKey } = useAutoRotate({
    count: SHOWCASE_MODULES.length,
    intervalMs: ROTATE_MS,
    paused: hovering || !inView,
  });
  const moduleKey = SHOWCASE_MODULES[index];
  const flow = flows[moduleKey];
  const choreo = getChoreography(hasSwitched || index !== 0);
  const phases = choreo.phases;

  useEffect(() => {
    if (index !== 0) setHasSwitched(true);
  }, [index]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-how-it-works px-4 pb-12 pt-16 md:px-6 md:pb-20 md:pt-[100px]"
    >
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader reducedMotion={!!reducedMotion} title={flow.header.title} subtitle={flow.header.subtitle}>
          <ModuleToggle
            active={moduleKey}
            onSelect={(m) => select(SHOWCASE_MODULES.indexOf(m))}
            running={running}
            cycleKey={cycleKey}
            intervalMs={ROTATE_MS}
            ariaLabel="How it works module"
          />
        </SectionHeader>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] md:p-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={moduleKey}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.25 } }}
              className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6"
            >
              <SourcesPanel
                reducedMotion={!!reducedMotion}
                title={flow.sourcesTitle}
                items={flow.sources}
                choreo={choreo}
              />

              <motion.div
                className="hidden shrink-0 lg:block"
                initial={reducedMotion ? false : { opacity: 0 }}
                whileInView={reducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: phases.leftConnectors }}
              >
                <FlowConnectors variant="incoming" />
              </motion.div>

              <motion.div
                className="lg:hidden"
                initial={reducedMotion ? false : { opacity: 0 }}
                whileInView={reducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: phases.leftConnectors }}
              >
                <FlowConnectors variant="incoming" vertical />
              </motion.div>

              <EnginePanel reducedMotion={!!reducedMotion} flow={flow} choreo={choreo} />

              <motion.div
                className="hidden shrink-0 lg:block"
                initial={reducedMotion ? false : { opacity: 0 }}
                whileInView={reducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: phases.rightConnectors }}
              >
                <FlowConnectors variant="outgoing" />
              </motion.div>

              <motion.div
                className="lg:hidden"
                initial={reducedMotion ? false : { opacity: 0 }}
                whileInView={reducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: phases.rightConnectors }}
              >
                <FlowConnectors variant="outgoing" vertical />
              </motion.div>

              <OutputsPanel reducedMotion={!!reducedMotion} items={flow.outputs} choreo={choreo} />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <TrustStrip reducedMotion={!!reducedMotion} />
      </div>
    </section>
  );
};

export default HowItWorksSection;
