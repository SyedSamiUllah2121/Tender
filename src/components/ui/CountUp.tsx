'use client';

import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface CountUpProps {
  value: number;
  /** Milliseconds; kept short so the figure is readable almost at once. */
  duration?: number;
  format?: (n: number) => string;
}

/**
 * A figure that counts to its value when it first shows, and from the old
 * value to the new one when a filter changes it. Anyone who asked their
 * system for reduced motion sees the final number straight away.
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 700,
  format = (n) => n.toLocaleString(),
}) => {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const shown = useRef(display);

  useEffect(() => {
    const from = shown.current;
    if (from === value || prefersReducedMotion()) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    let frame = 0;
    // Timed from the first frame. A frame's timestamp can predate a clock
    // read taken here, which made the first value briefly negative.
    let start: number | null = null;
    let last = 0;
    let paused = 0;
    const tick = (now: number) => {
      if (start === null) start = last = now;
      // While a screen is still building, frames can stall for most of a
      // second; that time is not counted, or the figure jumps straight to
      // its end and the count is never seen. Capped at a second so a slow
      // machine still lands on the number promptly.
      const gap = now - last;
      if (gap > 100 && paused < 1000) {
        const skip = Math.min(gap - 16, 1000 - paused);
        start += skip;
        paused += skip;
      }
      last = now;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const next = Math.round(from + (value - from) * easeOutCubic(t));
      shown.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{format(display)}</>;
};
