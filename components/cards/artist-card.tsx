"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppRouter } from "@/hooks/use-app-router";
import { MicVocal } from "lucide-react";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { useCarouselTintSeed } from "@/components/carousel/carousel-section-context";
import { cn } from "@/lib/utils";
import { getTintRgb, resolveCardTint } from "@/lib/card-theme";
import { SLOT_H, SLOT_W } from "@/lib/card-dimensions";
import type { ContentItem } from "@/types";
import { Chip, RatingChip } from "@/components/ui/chip";
import { HdImage } from "@/components/ui/hd-image";
import { CardBlurb } from "@/components/cards/card-blurb";
import { CardArtwork, GlassCardFrame, cardActionClass } from "@/components/cards/glass-card-frame";

const CARD_SIZE = { width: 148, height: 224 };
const HOVER_SIZE = { width: 176, height: 252 };

export interface ArtistCardProps extends React.HTMLAttributes<HTMLDivElement> {
  item: ContentItem;
  tintSeed?: number;
  onViewDetails?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

function artistDescription(item: ContentItem) {
  const meta = item.meta ?? "Artist";
  return `${item.title} — ${meta} matched to your listening taste and fandoms on EntertainVerse.`;
}

/** Artist card — round portrait with a tinted halo, same glass frame + hover panel as Poster/Music cards. */
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
  const [r, g, b] = getTintRgb(tint.glass);
  const genres = (item.genres ?? []).slice(0, 2);

  function setHover(next: boolean) {
    setHovered(next);
    onHoverChange?.(next);
  }

  function handleViewDetails() {
    if (onViewDetails) {
      onViewDetails();
      return;
    }
    router.push(getArtistDetailPath(item.id));
  }

  const portrait = item.imageUrl ? (
    <HdImage src={item.imageUrl} alt={item.title} className="size-full object-cover" />
  ) : (
    <div className={cn("size-full", tint.header)} />
  );

  const genreChips =
    genres.length > 0 ? (
      <div className="flex flex-wrap items-center justify-center gap-1">
        {genres.map((genre) => (
          <Chip key={genre.id} genreId={genre.id} genreLabel={genre.label}>
            {genre.label}
          </Chip>
        ))}
      </div>
    ) : null;

  const front = (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-2 pt-2">
        {item.rating != null ? <RatingChip rating={item.rating} /> : <span className="h-5" />}
        <Chip mediaType="artist">Artist</Chip>
      </div>

      <div className="relative mx-auto mt-2 size-[108px] shrink-0">
        {/* Tinted halo behind the portrait */}
        <div
          aria-hidden
          className="absolute -inset-2 rounded-full blur-md"
          style={{ background: `radial-gradient(circle, rgba(${r},${g},${b},0.75) 0%, rgba(${r},${g},${b},0) 70%)` }}
        />
        <motion.div
          className="relative size-full overflow-hidden rounded-full ring-2 ring-white/20 ring-offset-2 ring-offset-black/40"
          initial={false}
          animate={{ scale: hovered ? 1.04 : 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {portrait}
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-end gap-1.5 px-2 pb-2.5 pt-1.5 text-center">
        <div className="w-full">
          <p className="line-clamp-1 text-sm font-semibold text-white drop-shadow">{item.title}</p>
          <p className="line-clamp-1 text-caption font-normal text-white/60">{item.meta ?? "Artist"}</p>
        </div>
        {genreChips}
      </div>
    </div>
  );

  const back = (
    <>
      <CardArtwork hovered={hovered} className="h-[84px] w-full shrink-0">
        {portrait}
      </CardArtwork>
      <div className="relative -mt-7 flex flex-1 flex-col items-center gap-1.5 px-2.5 pb-2.5">
        <div className="w-full text-center">
          <p className="line-clamp-1 text-sm font-semibold text-white drop-shadow">{item.title}</p>
          <p className="line-clamp-1 text-caption font-normal text-white/65">{item.meta ?? "Artist"}</p>
        </div>
        {genreChips}
        <CardBlurb reason={item.reason} text={artistDescription(item)} className="text-center" />
        <div className="mt-auto flex w-full pt-1">
          <button type="button" onClick={handleViewDetails} aria-label={`View ${item.title}`} className={cardActionClass}>
            <MicVocal className="size-3.5 shrink-0 text-brand-pink" />
            View artist
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn("relative isolate mx-auto w-full max-w-[148px] shrink-0 overflow-visible", className)}
      style={{ width: SLOT_W, height: SLOT_H }}
      {...props}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // Keyboard users get the same quick-actions panel as hover.
      tabIndex={0}
      role="group"
      aria-label={item.title}
      onFocus={() => setHover(true)}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setHover(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) handleViewDetails();
      }}
    >
      <GlassCardFrame tint={tint.glass} hovered={hovered} size={CARD_SIZE} hoverSize={HOVER_SIZE} front={front} back={back} />
    </div>
  );
}
