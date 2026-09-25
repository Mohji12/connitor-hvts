'use client';

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { formatInr } from "./pricingData";

type Props = {
  value: number;
  className?: string;
};

/** Smooth numeric transition between price values (odometer-style feel). */
export const AnimatedPrice = ({ value, className }: Props) => {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      prev.current = value;
      setDisplay(value);
      return;
    }
    const start = prev.current;
    prev.current = value;
    const c = animate(start, value, {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => c.stop();
  }, [value]);

  return <span className={`tabular-nums ${className ?? ""}`}>{formatInr(display)}</span>;
};
