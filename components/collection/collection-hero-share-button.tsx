"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { shareCurrentUrl } from "@/lib/share-url";
import { Button } from "@/components/ui/button";
import {
  DETAIL_HERO_BTN_PAIR_ROW,
  detailHeroBtnBase,
} from "@/lib/detail-route-ui";

interface CollectionHeroShareButtonProps {
  collectionName: string;
  className?: string;
}

export function CollectionHeroShareButton({
  collectionName,
  className,
}: CollectionHeroShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const ok = await shareCurrentUrl({
      title: collectionName,
      text: `Check out ${collectionName} on EntertainVerse`,
      preferClipboard: true,
    });
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className={cn(DETAIL_HERO_BTN_PAIR_ROW, className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleShare()}
        className={cn(
          detailHeroBtnBase(),
          "w-full border-teal-400/60 bg-teal-500/10 text-white hover:bg-teal-500/20 sm:w-auto",
        )}
      >
        <Share2 className="size-4 shrink-0 text-teal-300" />
        {copied ? "Link Copied!" : "Share"}
      </Button>
    </div>
  );
}
