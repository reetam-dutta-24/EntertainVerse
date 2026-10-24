import { cn } from "@/lib/utils";

/**
 * Shared hero CTA sizing for `/content`, `/song`, and `/collection` detail routes.
 * Import these on any future individual route page hero/actions.
 */
export const DETAIL_HERO_BTN_WIDTH = "w-[138px]";

export function detailHeroBtnBase(...classNames: (string | undefined)[]) {
  return cn(
    DETAIL_HERO_BTN_WIDTH,
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold leading-tight sm:h-10 sm:px-3 sm:text-[11px]",
    ...classNames,
  );
}

/** Compact pair for collection activity panel — narrower than default hero CTAs. */
export const DETAIL_HERO_BTN_COMPACT = "w-[112px] max-w-[112px]";

/** Filled hero CTA — solid teal → light cyan-blue, dark label, no glow. */
export const DETAIL_HERO_BTN_ACCENT_SOLID = cn(
  "border border-transparent bg-gradient-teal-blue font-bold text-black",
  "transition-opacity duration-300 hover:opacity-90",
);

/** Compact watch/play CTA on poster overlay. */
export const DETAIL_HERO_BTN_WATCH = cn(
  "h-8 w-[118px] px-2 text-[9px] font-semibold sm:h-8 sm:w-[122px] sm:text-[10px]",
);

/** Filled hero CTA with play/watch hover — used on content & artist primary actions. */
export const DETAIL_HERO_BTN_ACCENT_PLAY = DETAIL_HERO_BTN_ACCENT_SOLID;

/**
 * Horizontal space between two side-by-side hero CTAs.
 * Uses `.detail-hero-btn-pair` in globals.css so spacing survives glow/shadow bleed.
 */
export const DETAIL_HERO_BTN_PAIR_GAP = "detail-hero-btn-pair";

/** Two consecutive hero CTAs in a horizontal row. */
export const DETAIL_HERO_BTN_PAIR = DETAIL_HERO_BTN_PAIR_GAP;

/** Centered horizontal pair — collection activity panel, poster overlay. */
export const DETAIL_HERO_BTN_GROUP = cn(
  DETAIL_HERO_BTN_PAIR,
  "justify-center",
);

/** Tighter centered pair for narrow collection hero CTAs. */
export const DETAIL_HERO_BTN_GROUP_COMPACT =
  "flex flex-wrap items-center justify-center gap-2.5 sm:gap-3";

/** Primary pair row under KPI stats (content/song). */
export const DETAIL_HERO_BTN_PAIR_ROW = cn("mt-3", DETAIL_HERO_BTN_PAIR);

/** Shared hover/disabled treatment for hero action buttons. */
export const HERO_BTN_INTERACTIVE = cn(
  "transition-all duration-300 ease-out",
  "hover:brightness-110",
  "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100",
);
