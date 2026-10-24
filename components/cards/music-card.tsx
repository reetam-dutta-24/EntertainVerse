"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Headphones, PlayCircle } from "lucide-react";
import { getSongDetailPath } from "@/lib/song-routes";
import { useCarouselTintSeed } from "@/components/carousel/carousel-section-context";
import { cn } from "@/lib/utils";
import { resolveCardTint } from "@/lib/card-theme";
import { SLOT_H, SLOT_W } from "@/lib/card-dimensions";
import { CardAddToCollectionButton } from "@/components/forms/add-to-collection-dialog";
import type { MusicTrack } from "@/types";
import { Chip, RatingChip } from "@/components/ui/chip";
import { HdImage } from "@/components/ui/hd-image";

const CARD_W = 148;
const CARD_H = 224;
const HOVER_W = 164;
const HOVER_H = 258;

export interface MusicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  track: MusicTrack;
  tintSeed?: number;
  onListen?: () => void;
  onViewDetails?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

function kindLabel(kind: MusicTrack["kind"]) {
  if (kind === "ost") return "OST";
  if (kind === "album") return "Album";
  return "Song";
}

function isPlaceholderSource(source?: string) {
  if (!source?.trim()) return true;
  return /studio album/i.test(source);
}

function shortLanguageLabel(language?: string) {
  if (!language) return null;
  const lower = language.toLowerCase();
  if (lower === "japanese") return "Japanese";
  if (lower === "english" || lower === "english pop") return "English";
  if (lower === "korean") return "Korean";
  if (language.length <= 12) return language;
  return language.slice(0, 10);
}

/** Compact top-left badge — avoids long "Artist — Studio Album" placeholders. */
function trackTopLeftBadge(track: MusicTrack) {
  if (track.source && !isPlaceholderSource(track.source)) {
    return { kind: "source" as const, label: track.source };
  }
  if (track.rating != null) {
    return { kind: "rating" as const, rating: track.rating };
  }
  const language = shortLanguageLabel(track.language);
  if (language) {
    return { kind: "language" as const, label: language };
  }
  return { kind: "type" as const, label: kindLabel(track.kind) };
}

function trackDescription(track: MusicTrack) {
  if (track.source && !isPlaceholderSource(track.source)) {
    return `Soundtrack from ${track.source} · performed by ${track.artist}.`;
  }
  if (track.language) {
    return `${track.artist} · ${shortLanguageLabel(track.language) ?? track.language} track on AniVerse.`;
  }
  return `${track.artist} · ${kindLabel(track.kind)} on AniVerse.`;
}

const layerTransition =
  "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Music card — compact default, fixed-size black expanded panel on hover. */
export function MusicCard({
  track,
  tintSeed: tintSeedProp,
  onListen,
  onViewDetails,
  onHoverChange,
  className,
  ...props
}: MusicCardProps) {
  const router = useAppRouter();
  const contextTintSeed = useCarouselTintSeed();
  const tintSeed = tintSeedProp ?? contextTintSeed;
  const [hovered, setHovered] = useState(false);
  const tint = resolveCardTint(track.id, track.accent, tintSeed);

  function handleViewDetails() {
    if (onViewDetails) {
      onViewDetails();
      return;
    }
    router.push(getSongDetailPath(track.id));
  }

  function handleListenNow() {
    if (onListen) {
      onListen();
      return;
    }
    router.push(`${getSongDetailPath(track.id)}#player`);
  }
  const langLabel =
    track.language?.toLowerCase() === "japanese"
      ? "Jpop"
      : track.language?.toLowerCase() === "english pop"
        ? "English"
        : track.language ?? "Jpop";

  return (
    <div
      className={cn("relative isolate mx-auto w-full max-w-[148px] shrink-0 overflow-visible", className)}
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
      aria-label={track.title}
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
              {(() => {
                const badge = trackTopLeftBadge(track);
                if (badge.kind === "rating") {
                  return <RatingChip rating={badge.rating} />;
                }
                if (badge.kind === "source") {
                  return (
                    <Chip chipKey="show" className="max-w-[90px] truncate">
                      {badge.label}
                    </Chip>
                  );
                }
                if (badge.kind === "language") {
                  return (
                    <Chip language={badge.label} className="max-w-[90px] truncate">
                      {badge.label}
                    </Chip>
                  );
                }
                return (
                  <Chip musicKind={track.kind} className="max-w-[90px] truncate">
                    {badge.label}
                  </Chip>
                );
              })()}
              <Chip musicKind={track.kind}>{kindLabel(track.kind)}</Chip>
            </div>

            <div className="mx-auto mt-1 h-[108px] w-[124px] shrink-0 overflow-hidden rounded-xl">
              {track.imageUrl ? (
                <HdImage
                  src={track.imageUrl}
                  alt={track.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className={cn("size-full", tint.header)} />
              )}
            </div>

            <div className="flex flex-1 flex-col items-center justify-end gap-1.5 px-2 pb-2.5 pt-1.5 text-center">
              <div>
                <p className="line-clamp-1 text-sm font-semibold text-white">
                  {track.title}
                </p>
                <p className="text-caption font-normal text-muted">
                  {track.artist}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <Chip language={langLabel}>{langLabel}</Chip>
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
              {track.imageUrl ? (
                <HdImage
                  src={track.imageUrl}
                  alt={track.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className={cn("size-full", tint.header)} />
              )}
            </div>

            <div className="flex h-[184px] flex-col items-center gap-1.5 bg-black px-2.5 pb-2 pt-2">
              <div className="w-full text-center">
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">
                  {track.title}
                </p>
                <p className="line-clamp-1 text-caption font-normal text-muted">
                  {track.artist}
                </p>
              </div>

              <p className="h-8 w-full overflow-hidden text-center text-caption font-normal leading-4 text-white/80 line-clamp-2">
                {trackDescription(track)}
              </p>

              <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-1">
                <div className="flex w-full items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleListenNow}
                    className="flex cursor-pointer items-center gap-1 rounded-full border border-brand-magenta px-2 py-0.5 text-micro font-normal text-white transition-colors hover:bg-brand-magenta/15"
                  >
                    <Headphones className="size-3.5 text-brand-magenta" />
                    Listen now
                  </button>
                  <button
                    type="button"
                    onClick={handleViewDetails}
                    className="flex cursor-pointer items-center gap-1 rounded-full border border-brand-magenta px-2 py-0.5 text-micro font-normal text-white transition-colors hover:bg-brand-magenta/15"
                  >
                    <PlayCircle className="size-3.5 text-brand-magenta" />
                    View details
                  </button>
                </div>
                <CardAddToCollectionButton
                  itemKind="song"
                  itemSlug={track.id}
                  itemTitle={track.title}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
