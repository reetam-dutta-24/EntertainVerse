"use client";

import { useEffect } from "react";

interface UseAutoAdvanceIntervalOptions {
  intervalMs?: number;
  /** When false, the timer never runs (e.g. single page / slide). */
  enabled?: boolean;
  /** Pause while the user hovers slider content. */
  paused?: boolean;
  onAdvance: () => void;
}

/** Shared auto-advance timer — pauses cleanly when `paused` is true. */
export function useAutoAdvanceInterval({
  intervalMs,
  enabled = true,
  paused = false,
  onAdvance,
}: UseAutoAdvanceIntervalOptions) {
  useEffect(() => {
    if (!intervalMs || !enabled || paused) return;
    // Carousels never move on their own for reduced-motion users.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(onAdvance, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled, paused, onAdvance]);
}
