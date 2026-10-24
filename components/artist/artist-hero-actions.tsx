"use client";

import { Heart, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DETAIL_HERO_BTN_PAIR_ROW,
  DETAIL_HERO_BTN_ACCENT_PLAY,
  detailHeroBtnBase,
} from "@/lib/detail-route-ui";
import type { AccentColor } from "@/types";

export interface ArtistHeroActionsProps {
  accent?: AccentColor;
}

const CTA_PAIR: Partial<
  Record<AccentColor, { play: string; like: string }>
> = {
  blue: {
    play: "border-transparent bg-gradient-blue-violet hover:border-blue-400 hover:bg-transparent hover:[background-image:none]",
    like: "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-white",
  },
  purple: {
    play: "border-transparent bg-gradient-to-r from-violet-600 to-indigo-600 hover:border-violet-400 hover:from-transparent hover:to-transparent",
    like: "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-white",
  },
  cyan: {
    play: "border-transparent bg-gradient-to-r from-cyan-500 to-teal-600 hover:border-cyan-400 hover:from-transparent hover:to-transparent",
    like: "border-fuchsia-400/60 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-white",
  },
  green: {
    play: "border-transparent bg-gradient-to-r from-emerald-600 to-teal-600 hover:border-emerald-400 hover:from-transparent hover:to-transparent",
    like: "border-pink-400/60 bg-pink-500/10 hover:bg-pink-500/20 text-white",
  },
  yellow: {
    play: DETAIL_HERO_BTN_ACCENT_PLAY,
    like: "border-violet-400/60 bg-violet-500/10 hover:bg-violet-500/20 text-white",
  },
  pink: {
    play: "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:border-fuchsia-400 hover:from-transparent hover:to-transparent",
    like: "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-white",
  },
};

const CTA_FALLBACK = CTA_PAIR.blue!;

function getArtistCta(accent?: AccentColor) {
  if (accent && CTA_PAIR[accent]) return CTA_PAIR[accent]!;
  return CTA_FALLBACK;
}

/** Play all + liked songs CTAs under artist KPI stats. */
export function ArtistHeroActions({ accent = "pink" }: ArtistHeroActionsProps) {
  const cta = getArtistCta(accent);

  return (
    <div className={DETAIL_HERO_BTN_PAIR_ROW}>
      <Button
        size="sm"
        className={cn(detailHeroBtnBase("min-w-0"), cta.play)}
      >
        <PlayCircle className="size-4 shrink-0" />
        <span className="truncate">Play all songs</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={cn(detailHeroBtnBase(), cta.like)}
      >
        <Heart className="size-4 shrink-0 text-brand-magenta" />
        <span className="truncate">Add To Liked Songs</span>
      </Button>
    </div>
  );
}
