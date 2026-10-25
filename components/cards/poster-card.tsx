"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Info, PlayCircle } from "lucide-react";
import { getContentDetailPath, isCatalogContentType, normalizeContentSlug, resolvePosterWatchPath } from "@/lib/content-routes";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { useCarouselTintSeed } from "@/components/carousel/carousel-section-context";
import { cn } from "@/lib/utils";
import { resolveCardTint } from "@/lib/card-theme";
import { POSTER_SLOT_H, SLOT_W } from "@/lib/card-dimensions";
import { CardAddToCollectionButton } from "@/components/forms/add-to-collection-dialog";
import type { ContentItem } from "@/types";
import { Chip, RatingChip } from "@/components/ui/chip";
import { HdImage } from "@/components/ui/hd-image";
import { CardBlurb } from "@/components/cards/card-blurb";
import { CardArtwork, GlassCardFrame, cardActionClass } from "@/components/cards/glass-card-frame";

const typeLabels: Record<ContentItem["type"], string> = {
  anime: "Anime",
  show: "Show",
  movie: "Movie",
  documentary: "Documentary",
  kdrama: "Kdrama",
  song: "Song",
  album: "Album",
  artist: "Artist",
  playlist: "Playlist",
};

export { SLOT_W } from "@/lib/card-dimensions";

const CARD_SIZE = { width: 148, height: 206 };
const HOVER_SIZE = { width: 176, height: 248 };

export interface PosterCardProps extends React.HTMLAttributes<HTMLDivElement> {
  item: ContentItem;
  tintSeed?: number;
  /** Landing page — visual demo only, no navigation or collection actions. */
  demo?: boolean;
  onWatch?: () => void;
  onViewDetails?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

function defaultDescription(title: string) {
  return `${title} — matched to your genres, ratings, and watch history on EntertainVerse.`;
}

function resolveCollectionItemKind(
  type: ContentItem["type"],
): "content" | "song" | null {
  if (type === "song" || type === "album") return "song";
  if (type === "artist" || type === "playlist") return null;
  return "content";
}

function resolveMeta(item: ContentItem) {
  const meta =
    item.meta ??
    (item.type === "movie" || item.type === "documentary"
      ? "Film"
      : item.type === "show"
        ? "3 Seasons"
        : "2 Seasons");
  const year = item.year ?? 2021;
  return { meta, year };
}

/** Content poster — artwork-led glass card that opens into a details panel on hover. */
export function PosterCard({
  item,
  tintSeed: tintSeedProp,
  demo = false,
  onWatch,
  onViewDetails,
  onHoverChange,
  className,
  ...props
}: PosterCardProps) {
  const router = useAppRouter();
  const contextTintSeed = useCarouselTintSeed();
  const tintSeed = tintSeedProp ?? contextTintSeed;
  const [hovered, setHovered] = useState(false);
  const tint = resolveCardTint(item.id, item.accent, tintSeed);
  const description = item.description ?? defaultDescription(item.title);
  const { meta, year } = resolveMeta(item);
  const collectionItemKind = resolveCollectionItemKind(item.type);
  const displayGenres = (item.genres ?? []).slice(0, 2);

  function setHover(next: boolean) {
    setHovered(next);
    onHoverChange?.(next);
  }

  function handleViewDetails() {
    if (demo) return;
    if (onViewDetails) {
      onViewDetails();
      return;
    }
    if (item.type === "artist") {
      router.push(getArtistDetailPath(item.id));
      return;
    }
    router.push(getContentDetailPath(item.id));
  }

  function handleWatchNow() {
    if (demo) return;
    if (onWatch) {
      onWatch();
      return;
    }

    const watchPath = resolvePosterWatchPath(item.type, item.id);
    if (!watchPath) return;

    if (isCatalogContentType(item.type)) {
      void fetch(
        `/api/content/${encodeURIComponent(normalizeContentSlug(item.id))}/watch-start`,
        { method: "POST" },
      ).catch(() => undefined);
    }

    router.push(watchPath);
  }

  const artwork = item.imageUrl ? (
    <HdImage src={item.imageUrl} alt={item.title} className="size-full object-cover" />
  ) : (
    <div className={cn("size-full", tint.header)} />
  );

  const front = (
    <div className="flex h-full flex-col p-1.5">
      <CardArtwork hovered={false} scrim="top" className="h-[136px] w-full shrink-0 rounded-[14px]">
        {artwork}
      </CardArtwork>
      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
        {item.rating != null ? <RatingChip rating={item.rating} /> : <span />}
        <Chip mediaType={item.type}>{typeLabels[item.type]}</Chip>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-center">
        <p className="line-clamp-1 w-full text-sm font-semibold leading-tight text-white drop-shadow">
          {item.title}
        </p>
        {displayGenres.length > 0 ? (
          <div className="flex items-center justify-center gap-1">
            {displayGenres.map((genre) => (
              <Chip key={genre.id} genreId={genre.id} genreLabel={genre.label}>
                {genre.label}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  const back = (
    <>
      <CardArtwork hovered={hovered} className="h-[84px] w-full shrink-0">
        {artwork}
      </CardArtwork>
      <div className="relative -mt-7 flex flex-1 flex-col items-center gap-1.5 px-2.5 pb-2.5">
        <p className="line-clamp-1 w-full text-center text-sm font-semibold leading-tight text-white drop-shadow">
          {item.title}
        </p>

        <CardBlurb reason={item.reason} text={description} className="text-center" />

        <p className="flex w-full justify-between gap-2 whitespace-nowrap text-caption font-normal text-white/70">
          <span className="truncate">{meta}</span>
          <span className="shrink-0">{year}</span>
        </p>

        {!demo ? (
          <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-1">
            <div className="flex w-full items-center justify-center gap-1.5">
              <button type="button" onClick={handleWatchNow} aria-label={`Watch ${item.title} now`} className={cardActionClass}>
                <PlayCircle className="size-3 shrink-0 text-brand-pink" />
                Watch
              </button>
              <button type="button" onClick={handleViewDetails} aria-label={`View details for ${item.title}`} className={cardActionClass}>
                <Info className="size-3 shrink-0 text-brand-pink" />
                Details
              </button>
            </div>
            {collectionItemKind ? (
              <CardAddToCollectionButton itemKind={collectionItemKind} itemSlug={item.id} itemTitle={item.title} />
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn("relative isolate mx-auto w-full max-w-[148px] shrink-0 overflow-visible", className)}
      style={{ width: SLOT_W, height: POSTER_SLOT_H }}
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
