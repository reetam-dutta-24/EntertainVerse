"use client";

import { useState } from "react";
import { BookOpen, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { shareCurrentUrl } from "@/lib/share-url";
import { Button } from "@/components/ui/button";
import { RecapDialog } from "@/components/content/recap-dialog";
import {
  DETAIL_HERO_BTN_PAIR_ROW,
  detailHeroBtnBase,
} from "@/lib/detail-route-ui";
import type { AccentColor, ContentDetail, Episode } from "@/types";

/** Share CTA — accent-tinted outline. */
const SHARE_STYLES: Record<AccentColor, { share: string; shareIcon: string }> = {
  blue: {
    share: "border-cyan-400/70 bg-cyan-500/10 hover:bg-cyan-500/20",
    shareIcon: "text-cyan-300",
  },
  purple: {
    share: "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20",
    shareIcon: "text-amber-300",
  },
  cyan: {
    share: "border-violet-400/60 bg-violet-500/10 hover:bg-violet-500/20",
    shareIcon: "text-violet-300",
  },
  green: {
    share: "border-sky-400/60 bg-sky-500/10 hover:bg-sky-500/20",
    shareIcon: "text-sky-300",
  },
  yellow: {
    share: "border-indigo-400/60 bg-indigo-500/10 hover:bg-indigo-500/20",
    shareIcon: "text-indigo-300",
  },
  pink: {
    share: "border-teal-400/60 bg-teal-500/10 hover:bg-teal-500/20",
    shareIcon: "text-teal-300",
  },
  red: {
    share: "border-cyan-400/60 bg-cyan-500/10 hover:bg-cyan-500/20",
    shareIcon: "text-cyan-300",
  },
  orange: {
    share: "border-indigo-400/60 bg-indigo-500/10 hover:bg-indigo-500/20",
    shareIcon: "text-indigo-300",
  },
  teal: {
    share: "border-fuchsia-400/60 bg-fuchsia-500/10 hover:bg-fuchsia-500/20",
    shareIcon: "text-fuchsia-300",
  },
  indigo: {
    share: "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20",
    shareIcon: "text-amber-300",
  },
  rose: {
    share: "border-sky-400/60 bg-sky-500/10 hover:bg-sky-500/20",
    shareIcon: "text-sky-300",
  },
  lime: {
    share: "border-violet-400/60 bg-violet-500/10 hover:bg-violet-500/20",
    shareIcon: "text-violet-300",
  },
  amber: {
    share: "border-blue-400/60 bg-blue-500/10 hover:bg-blue-500/20",
    shareIcon: "text-blue-300",
  },
  violet: {
    share: "border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20",
    shareIcon: "text-emerald-300",
  },
  fuchsia: {
    share: "border-teal-400/60 bg-teal-500/10 hover:bg-teal-500/20",
    shareIcon: "text-teal-300",
  },
  sky: {
    share: "border-rose-400/60 bg-rose-500/10 hover:bg-rose-500/20",
    shareIcon: "text-rose-300",
  },
  emerald: {
    share: "border-fuchsia-400/60 bg-fuchsia-500/10 hover:bg-fuchsia-500/20",
    shareIcon: "text-fuchsia-300",
  },
};

/** Music has no story to recap. */
const NO_RECAP = new Set(["song", "album", "artist", "playlist"]);

export interface ContentHeroActionsProps {
  content: ContentDetail;
  continueEpisode: Episode | null;
}

export function ContentHeroActions({ content }: ContentHeroActionsProps) {
  const accent = content.accent ?? "blue";
  const cta = SHARE_STYLES[accent] ?? SHARE_STYLES.blue;
  const [copied, setCopied] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const canRecap = !NO_RECAP.has(content.type);

  async function handleShare() {
    const ok = await shareCurrentUrl({
      title: content.title,
      text: `Check out ${content.title} on AniVerse`,
      preferClipboard: true,
    });
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className={DETAIL_HERO_BTN_PAIR_ROW}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleShare}
        className={cn(detailHeroBtnBase(), "w-full text-white sm:w-auto", cta.share)}
      >
        <Share2 className={cn("size-4 shrink-0", cta.shareIcon)} />
        {copied ? "Link Copied!" : "Share"}
      </Button>
      {canRecap ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRecapOpen(true)}
            className={cn(detailHeroBtnBase(), "w-full border-brand-magenta/50 bg-brand-magenta/10 text-white hover:bg-brand-magenta/20 sm:w-auto")}
          >
            <BookOpen className="size-4 shrink-0 text-brand-pink" />
            Catch me up
          </Button>
          <RecapDialog slug={content.id} open={recapOpen} onClose={() => setRecapOpen(false)} />
        </>
      ) : null}
    </div>
  );
}
