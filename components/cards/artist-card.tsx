"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { MicVocal } from "lucide-react";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { useCarouselTintSeed } from "@/components/carousel/carousel-section-context";
import { cn } from "@/lib/utils";
import { resolveCardTint } from "@/lib/card-theme";
import { SLOT_H, SLOT_W } from "@/lib/card-dimensions";
import type { ContentItem } from "@/types";
import { Chip, RatingChip } from "@/components/ui/chip";
import { HdImage } from "@/components/ui/hd-image";
import { CardBlurb } from "@/components/cards/card-blurb";

const CARD_W = 148;
const CARD_H = 224;
const HOVER_W = 176;
const HOVER_H = 248;

export interface ArtistCardProps extends React.HTMLAttributes<HTMLDivElement> {
  item: ContentItem;
  tintSeed?: number;
  onViewDetails?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

function artistDescription(item: ContentItem) {
  const meta = item.meta ?? "Artist";
  return `${item.title} — ${meta} matched to your listening taste and fandoms on AniVerse.`;
}

const layerTransition =
  "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Artist card — round portrait, artist meta, same slot + hover panel as Poster/Music cards. */
export function ArtistCard({
  item,
  tintSeed: tintSeedProp,
  onViewDetails,
  onHoverChange,
  className,
  ...props
}: ArtistCardProps) {
  const router = useAppRouter();
  const contextTintSeed = useCarouselTintSeed();
  const tintSeed = tintSeedProp ?? contextTintSeed;
  const [hovered, setHovered] = useState(false);
  const tint = resolveCardTint(item.id, item.accent, tintSeed);

  function handleViewDetails() {
    if (onViewDetails) {
      onViewDetails();
      return;
    }
    router.push(getArtistDetailPath(item.id));
  }

  return (
    <div
      className={cn(
        "relative isolate mx-auto w-full max-w-[148px] shrink-0 overflow-visible",
        className,
      )}
      style={{ width: SLOT_W, height: SLOT_H }}
      {...props}
      onMouseEnter={() => {
        setHovered(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverChange?.(false);
      }}
      // Keyboard users get the same quick-actions panel as hover.
      tabIndex={0}
      role="group"
      aria-label={item.title}
      onFocus={() => {
        setHovered(true);
        onHoverChange?.(true);
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setHovered(false);
        onHoverChange?.(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) handleViewDetails();
      }}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-10 flex flex-col overflow-hidden rounded-card shadow-card-inner transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          hovered && "z-30 rounded-card",
        )}
        style={{
          width: hovered ? HOVER_W : CARD_W,
          height: hovered ? HOVER_H : CARD_H,
          transform: "translate(-50%, -50%)",
          backgroundColor: hovered ? "var(--color-surface)" : tint.glass,
        }}
      >
        <div className="relative h-full w-full">
          <div
            className={cn(
              "absolute inset-0 flex flex-col",
              layerTransition,
              hovered
                ? "pointer-events-none scale-[0.98] opacity-0"
                : "scale-100 opacity-100",
            )}
          >
            <div className="flex shrink-0 items-center justify-between px-2 pt-2">
              {item.rating != null ? (
                <RatingChip rating={item.rating} />
              ) : (
                <span className="h-5" />
              )}
              <Chip mediaType="artist">Artist</Chip>
            </div>

            <div className="mx-auto mt-1.5 size-[104px] shrink-0 overflow-hidden rounded-full border-2 border-white/15">
              {item.imageUrl ? (
                <HdImage
                  src={item.imageUrl}
                  alt={item.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className={cn("size-full", tint.header)} />
              )}
            </div>

            <div className="flex flex-1 flex-col items-center justify-end gap-1.5 px-2 pb-2.5 pt-1.5 text-center">
              <div>
                <p className="line-clamp-1 text-sm font-semibold text-white">
                  {item.title}
                </p>
                <p className="text-caption font-normal text-muted">
                  {item.meta ?? "Artist"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {(item.genres ?? []).slice(0, 2).map((genre) => (
                  <Chip
                    key={genre.id}
                    genreId={genre.id}
                    genreLabel={genre.label}
                  >
                    {genre.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-0 flex flex-col",
              layerTransition,
              hovered
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-2 scale-[1.02] opacity-0",
            )}
          >
            <div className="relative h-[74px] w-full shrink-0 overflow-hidden">
              {item.imageUrl ? (
                <HdImage
                  src={item.imageUrl}
                  alt={item.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className={cn("size-full", tint.header)} />
              )}
            </div>

            <div className="flex h-[174px] flex-col items-center gap-1.5 bg-black px-2.5 pb-2.5 pt-1.5">
              <p className="line-clamp-1 w-full text-center text-sm font-semibold text-white">
                {item.title}
              </p>
              <p className="line-clamp-1 text-caption font-normal text-muted">
                {item.meta ?? "Artist"}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-1">
                {(item.genres ?? []).slice(0, 2).map((genre) => (
                  <Chip
                    key={genre.id}
                    genreId={genre.id}
                    genreLabel={genre.label}
                  >
                    {genre.label}
                  </Chip>
                ))}
              </div>

              <div className="flex w-full items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleViewDetails}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-brand-magenta px-2 py-0.5 text-micro font-normal text-white transition-colors hover:bg-brand-magenta/15"
                >
                  <MicVocal className="size-3.5 text-brand-magenta" />
                  View artist
                </button>
              </div>

              <CardBlurb reason={item.reason} text={artistDescription(item)} className="text-left" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
