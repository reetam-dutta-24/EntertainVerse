"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Headphones, Info } from "lucide-react";
import { getSongDetailPath } from "@/lib/song-routes";
import { useCarouselTintSeed } from "@/components/carousel/carousel-section-context";
import { cn } from "@/lib/utils";
import { resolveCardTint } from "@/lib/card-theme";
import { SLOT_H, SLOT_W } from "@/lib/card-dimensions";
import { CardAddToCollectionButton } from "@/components/forms/add-to-collection-dialog";
import type { MusicTrack } from "@/types";
import { Chip, RatingChip } from "@/components/ui/chip";
import { HdImage } from "@/components/ui/hd-image";
import { CardBlurb } from "@/components/cards/card-blurb";
import { CardArtwork, GlassCardFrame, cardActionClass } from "@/components/cards/glass-card-frame";

const CARD_SIZE = { width: 148, height: 224 };
const HOVER_SIZE = { width: 176, height: 262 };

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
    return `${track.artist} · ${shortLanguageLabel(track.language) ?? track.language} track on EntertainVerse.`;
  }
  return `${track.artist} · ${kindLabel(track.kind)} on EntertainVerse.`;
}

/** Music card — artwork-led glass card that opens into a details panel on hover. */
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

  function setHover(next: boolean) {
    setHovered(next);
    onHoverChange?.(next);
  }

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

  const badge = trackTopLeftBadge(track);
  const topLeft =
    badge.kind === "rating" ? (
      <RatingChip rating={badge.rating} />
    ) : badge.kind === "source" ? (
      <Chip chipKey="show" className="max-w-[90px] truncate">
        {badge.label}
      </Chip>
    ) : badge.kind === "language" ? (
      <Chip language={badge.label} className="max-w-[90px] truncate">
        {badge.label}
      </Chip>
    ) : (
      <Chip musicKind={track.kind} className="max-w-[90px] truncate">
        {badge.label}
      </Chip>
    );

  const artwork = track.imageUrl ? (
    <HdImage src={track.imageUrl} alt={track.title} className="size-full object-cover" />
  ) : (
    <div className={cn("size-full", tint.header)} />
  );

  const front = (
    <div className="flex h-full flex-col p-1.5">
      <CardArtwork hovered={false} scrim="top" className="aspect-square w-full shrink-0 rounded-[14px]">
        {artwork}
      </CardArtwork>
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-1">
        {topLeft}
        <Chip musicKind={track.kind}>{kindLabel(track.kind)}</Chip>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-center">
        <div className="w-full">
          <p className="line-clamp-1 text-sm font-semibold leading-tight text-white drop-shadow">{track.title}</p>
          <p className="line-clamp-1 text-caption font-normal text-white/60">{track.artist}</p>
        </div>
        <Chip language={langLabel}>{langLabel}</Chip>
      </div>
    </div>
  );

  const back = (
    <>
      <CardArtwork hovered={hovered} className="h-[92px] w-full shrink-0">
        {artwork}
      </CardArtwork>
      <div className="relative -mt-7 flex flex-1 flex-col items-center gap-1.5 px-2.5 pb-2.5">
        <div className="w-full text-center">
          <p className="line-clamp-1 text-sm font-semibold leading-tight text-white drop-shadow">{track.title}</p>
          <p className="line-clamp-1 text-caption font-normal text-white/65">{track.artist}</p>
        </div>

        <CardBlurb reason={track.reason} text={trackDescription(track)} className="text-center" />

        <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-1">
          <div className="flex w-full items-center justify-center gap-1.5">
            <button type="button" onClick={handleListenNow} aria-label={`Listen to ${track.title} now`} className={cardActionClass}>
              <Headphones className="size-3 shrink-0 text-brand-pink" />
              Listen
            </button>
            <button type="button" onClick={handleViewDetails} aria-label={`View details for ${track.title}`} className={cardActionClass}>
              <Info className="size-3 shrink-0 text-brand-pink" />
              Details
            </button>
          </div>
          <CardAddToCollectionButton itemKind="song" itemSlug={track.id} itemTitle={track.title} />
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
      aria-label={track.title}
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
