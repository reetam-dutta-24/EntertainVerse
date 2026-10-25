"use client";

import { useEffect, useState, type RefObject } from "react";

export interface ColumnBreakpoint {
  minWidth: number;
  cols: number;
}

/** Fit as many fixed-width slots as the container holds (instead of reading the window). */
export interface ColumnFit {
  ref: RefObject<HTMLElement | null>;
  /** Card width the column must hold. */
  slotWidth: number;
  /** Gap between columns, in px — must match the grid's gap. */
  gap: number;
  min?: number;
  max?: number;
}

function resolveColumns(
  breakpoints: readonly ColumnBreakpoint[],
  width: number,
): number {
  for (const bp of breakpoints) {
    if (width >= bp.minWidth) return bp.cols;
  }
  return breakpoints[breakpoints.length - 1]?.cols ?? 2;
}

export function fitColumns(containerWidth: number, { slotWidth, gap, min = 1, max = Infinity }: Omit<ColumnFit, "ref">) {
  const fits = Math.floor((containerWidth + gap) / (slotWidth + gap));
  return Math.min(max, Math.max(min, fits));
}

/**
 * Returns responsive column count; updates on viewport resize. With `fit`, the count follows
 * the container's own width (so docked panels and sidebars are accounted for); the
 * breakpoints still give the first render before it's measured.
 */
export function useColumnCount(
  breakpoints: readonly ColumnBreakpoint[],
  rows = 1,
  fit?: ColumnFit,
) {
  const [cols, setCols] = useState(() =>
    breakpoints[breakpoints.length - 1]?.cols ?? 2,
  );
  const fitRef = fit?.ref;
  const slotWidth = fit?.slotWidth;
  const gap = fit?.gap;
  const min = fit?.min;
  const max = fit?.max;

  useEffect(() => {
    const element = fitRef?.current;
    if (element && slotWidth !== undefined && gap !== undefined) {
      const measure = () => setCols(fitColumns(element.clientWidth, { slotWidth, gap, min, max }));
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }

    function update() {
      setCols(resolveColumns(breakpoints, window.innerWidth));
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoints, fitRef, slotWidth, gap, min, max]);

  return { cols, itemsPerPage: cols * rows };
}
