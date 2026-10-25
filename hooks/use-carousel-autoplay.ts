"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Every carousel section slides on this shared beat. */
export const CAROUSEL_AUTOPLAY_MS = 5_000;

const ATTRIBUTE = "data-carousel-autoplay";
/** After a tap/swipe on touch screens, leave the row alone for a while. */
const TOUCH_PAUSE_MS = 10_000;

interface UseCarouselAutoplayOptions {
  /** The section's interactive area (hover/focus/touch pause here). */
  rootRef: RefObject<HTMLElement | null>;
  /** e.g. only when there's more than one page. */
  enabled: boolean;
  /** Move one page: 1 = forward (next), -1 = backward (previous). */
  onStep: (direction: 1 | -1) => void;
  /** Changes whenever the page changes, so a manual move restarts the countdown. */
  resetKey?: unknown;
  intervalMs?: number;
}

/**
 * Auto-slides carousel sections. Sections alternate direction by their order on the page —
 * the 1st, 3rd, 5th… slide forward and the 2nd, 4th… backward — and every section moves on
 * the same wall-clock beat, so the whole page shifts together.
 *
 * Never runs for reduced-motion users; pauses while hovered, focused or just touched,
 * while scrolled out of view, and while the tab is hidden.
 */
export function useCarouselAutoplay({ rootRef, enabled, onStep, resetKey, intervalMs = CAROUSEL_AUTOPLAY_MS }: UseCarouselAutoplayOptions) {
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || intervalMs <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.setAttribute(ATTRIBUTE, "");
    let hovered = false;
    let focused = false;
    let touchedUntil = 0;
    let visible = true;

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    }, { threshold: 0.25 });
    observer.observe(root);

    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);
    const onFocusIn = () => (focused = true);
    const onFocusOut = (event: FocusEvent) => {
      if (!root.contains(event.relatedTarget as Node | null)) focused = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") touchedUntil = Date.now() + TOUCH_PAUSE_MS;
    };
    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("pointerdown", onPointerDown);

    let timer = 0;
    const schedule = () => {
      // Align to the wall clock so every section moves at the same moment. Right after a
      // manual move the next beat may be close — skip it so the row doesn't jump at once.
      let delay = intervalMs - (Date.now() % intervalMs);
      if (delay < intervalMs / 2) delay += intervalMs;
      timer = window.setTimeout(tick, delay);
    };
    const tick = () => {
      const idle = !hovered && !focused && Date.now() > touchedUntil;
      if (idle && visible && document.visibilityState === "visible") {
        // Odd sections (1st, 3rd…) forward, even ones backward — by position on the page.
        const index = Array.from(document.querySelectorAll(`[${ATTRIBUTE}]`)).indexOf(root);
        stepRef.current(index % 2 === 0 ? 1 : -1);
      }
      schedule();
    };
    schedule();

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeAttribute(ATTRIBUTE);
    };
  }, [rootRef, enabled, intervalMs, resetKey]);
}
