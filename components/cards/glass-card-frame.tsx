"use client";

import { motion } from "framer-motion";
import { getTintRgb } from "@/lib/card-theme";
import { cn } from "@/lib/utils";

/** Shared spring for every catalog card's hover — quick to lift, soft to settle. */
export const CARD_SPRING = { type: "spring", stiffness: 320, damping: 30, mass: 0.8 } as const;

/** Layered glass background: corner sheen, tint bloom from the top, deep vignette. */
export function glassSurface(rgb: string) {
  return [
    `radial-gradient(120% 70% at 0% 0%, rgba(255,255,255,0.10) 0%, transparent 55%)`,
    `radial-gradient(140% 90% at 50% -10%, rgba(${rgb},0.55) 0%, rgba(${rgb},0.18) 45%, transparent 75%)`,
    `linear-gradient(180deg, rgba(${rgb},0.22) 0%, rgba(14,8,30,0.78) 62%, rgba(6,4,14,0.94) 100%)`,
  ].join(", ");
}

/** Resting and lifted shadows — the lifted one glows in the card's tint. */
export function glassShadow(rgb: string, lifted: boolean) {
  return lifted
    ? `0 22px 48px -14px rgba(${rgb},0.65), 0 0 0 1px rgba(${rgb},0.55), 0 0 32px -6px rgba(${rgb},0.5)`
    : `0 10px 28px -16px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07), 0 0 0 0 rgba(${rgb},0)`;
}

/** Lit top edge + inner vignette, layered over the card content. */
export const glassEdgeClass =
  "pointer-events-none absolute inset-0 z-20 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_36px_rgba(0,0,0,0.55)]";

export interface GlassCardFrameProps {
  /** Card tint (rgba glass colour from card-theme). */
  tint: string;
  hovered: boolean;
  size: { width: number; height: number };
  hoverSize: { width: number; height: number };
  /** Default face: artwork-led summary. */
  front: React.ReactNode;
  /** Hover / focus face: details and actions. */
  back: React.ReactNode;
  className?: string;
}

/**
 * Premium glass surface shared by poster, music and artist cards: tinted glass over a
 * dark vignette, a corner sheen, a lit top edge, and a spring lift + tinted glow on hover.
 * The two faces cross-fade while the frame grows into the details panel.
 */
export function GlassCardFrame({ tint, hovered, size, hoverSize, front, back, className }: GlassCardFrameProps) {
  const [r, g, b] = getTintRgb(tint);
  const rgb = `${r},${g},${b}`;

  return (
    // Centred by flex so the motion transform is free for the hover lift.
    <div className={cn("absolute inset-0 flex items-center justify-center", hovered ? "z-30" : "z-10")}>
    <motion.div
      className={cn("relative flex shrink-0 flex-col overflow-hidden rounded-card backdrop-blur-xl", className)}
      initial={false}
      animate={{
        width: hovered ? hoverSize.width : size.width,
        height: hovered ? hoverSize.height : size.height,
        y: hovered ? -6 : 0,
        boxShadow: glassShadow(rgb, hovered),
      }}
      transition={CARD_SPRING}
      style={{ background: glassSurface(rgb) }}
    >
      <div aria-hidden className={glassEdgeClass} />

      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={false}
        animate={{ opacity: hovered ? 0 : 1, scale: hovered ? 0.97 : 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: hovered ? "none" : "auto" }}
        aria-hidden={hovered}
      >
        {front}
      </motion.div>

      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={false}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: hovered ? 0.06 : 0 }}
        style={{ pointerEvents: hovered ? "auto" : "none" }}
        aria-hidden={!hovered}
      >
        {back}
      </motion.div>
    </motion.div>
    </div>
  );
}

/** Artwork with a vignette scrim; zooms slowly while the card is open. */
export function CardArtwork({
  hovered,
  children,
  className,
  scrim = "bottom",
}: {
  hovered: boolean;
  children: React.ReactNode;
  className?: string;
  /** Where the darkening sits: under overlaid chips ("top"), into the panel ("bottom"), or both. */
  scrim?: "top" | "bottom" | "both";
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        className="size-full"
        initial={false}
        animate={{ scale: hovered ? 1.08 : 1 }}
        transition={{ duration: hovered ? 6 : 0.6, ease: "easeOut" }}
      >
        {children}
      </motion.div>
      {scrim !== "bottom" ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent" />
      ) : null}
      {scrim !== "top" ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      ) : null}
    </div>
  );
}

/** Pill action button used on every card's details face. */
export const cardActionClass =
  "flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.06] px-1.5 py-1 text-micro font-medium text-white backdrop-blur-md transition-colors hover:border-brand-magenta hover:bg-brand-magenta/20";
