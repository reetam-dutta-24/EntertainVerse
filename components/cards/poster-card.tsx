"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { PlayCircle } from "lucide-react";
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

const CARD_W = 148;
const CARD_H = 206;
const HOVER_W = 164;
const HOVER_H = 240;

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
  return `${title} — matched to your genres, ratings, and watch history on AniVerse.`;
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

const layerTransition =
  "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Content poster — compact default, fixed-size black expanded panel on hover. */
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

  return (
    <div
      className={cn("relative isolate mx-auto w-full max-w-[148px] shrink-0 overflow-visible", className)}
      style={{ width: SLOT_W, height: POSTER_SLOT_H }}
      {...props}
      onMouseEnter={() => {
        setHovered(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverChange?.(false);
      }}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-10 flex flex-col overflow-hidden rounded-[18px] shadow-card-inner transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          hovered && "z-30 rounded-[20px]",
        )}
        style={{
          width: hovered ? HOVER_W : CARD_W,
          height: hovered ? HOVER_H : CARD_H,
          transform: "translate(-50%, -50%)",
          backgroundColor: hovered ? "#000000" : tint.glass,
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
              <Chip mediaType={item.type}>{typeLabels[item.type]}</Chip>
            </div>

            <div className="mx-auto mt-1 h-[100px] w-[120px] shrink-0 overflow-hidden rounded-[14px]">
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

            <div className="flex flex-1 flex-col items-center justify-end gap-1 px-2 pb-2 pt-1 text-center">
              <p className="line-clamp-1 text-sm font-semibold text-white">
                {item.title}
              </p>
              {displayGenres.length > 0 ? (
                <div className="flex items-center justify-center gap-1">
                  {displayGenres.map((genre) => (
                    <Chip
                      key={genre.id}
                      genreId={genre.id}
                      genreLabel={genre.label}
                    >
                      {genre.label}
                    </Chip>
                  ))}
                </div>
              ) : null}
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
            <div className="relative h-[70px] w-full shrink-0 overflow-hidden">
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

            <div className="flex h-[170px] flex-col items-center gap-1.5 bg-black px-2.5 pb-2 pt-2">
              <p className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-white">
                {item.title}
              </p>

              <p className="h-[36px] w-full overflow-hidden text-center text-[10px] font-normal leading-[12px] text-white/80 line-clamp-3">
                {description}
              </p>

              <p className="flex w-full justify-between text-[10px] font-normal text-white/75">
                <span>{meta}</span>
                <span>{year}</span>
              </p>

              <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-1">
                {!demo ? (
                  <>
                    <div className="flex w-full items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleWatchNow}
                        className="flex cursor-pointer items-center gap-1 rounded-full border border-brand-magenta px-2 py-0.5 text-[10px] font-normal text-white transition-colors hover:bg-brand-magenta/15"
                      >
                        <PlayCircle className="size-3.5 text-brand-magenta" />
                        Watch Now
                      </button>
                      <button
                        type="button"
                        onClick={handleViewDetails}
                        className="cursor-pointer rounded-full border border-brand-magenta px-2 py-0.5 text-[10px] font-normal text-white transition-colors hover:bg-brand-magenta/15"
                      >
                        View Details
                      </button>
                    </div>
                    {collectionItemKind ? (
                      <CardAddToCollectionButton
                        itemKind={collectionItemKind}
                        itemSlug={item.id}
                        itemTitle={item.title}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
