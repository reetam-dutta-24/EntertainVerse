"use client";

import { useState } from "react";
import { Globe, Lock, Sparkles, type LucideIcon } from "lucide-react";
import { CardHeaderImage } from "@/components/cards/card-header-image";
import { COLLECTION_CARD_H } from "@/lib/card-dimensions";
import { getAccentStyle } from "@/lib/accents";
import { cn } from "@/lib/utils";

export interface TileStat {
  icon: LucideIcon;
  /** Spoken label, e.g. "Members". */
  label: string;
  value: number;
}

/** Room the owner-only Edit / Delete row needs. */
const MANAGE_ROW_H = 32;
/** Room the CTA needs (removed on landing demos). */
const CTA_H = 40;

function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}

export interface TileCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  imageUrl?: string;
  accent: string;
  stats: TileStat[];
  visibility?: "public" | "private";
  /** Two-line description, or a fallback line (e.g. "Updated 2d ago"). */
  description?: string;
  /** Recommender "why this" — shown instead of the description when present. */
  reason?: string;
  /** Primary action (omitted for landing demos). */
  cta?: React.ReactNode;
  /** Owner actions — Edit / Delete. */
  manage?: React.ReactNode;
}

/**
 * Shared shell for collection + community cards: artwork header, one-line
 * title, an icon stat row, a two-line description and a full-width action.
 * Fixed height so grids and carousels line up.
 */
export function TileCard({
  title,
  imageUrl,
  accent: accentName,
  stats,
  visibility,
  description,
  reason,
  cta,
  manage,
  className,
  ...props
}: TileCardProps) {
  const [hovered, setHovered] = useState(false);
  const accent = getAccentStyle(accentName);
  const height = COLLECTION_CARD_H + (manage ? MANAGE_ROW_H : 0) - (cta ? 0 : CTA_H);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[180px] rounded-card transition-shadow duration-300 ease-out",
        hovered && accent.glow,
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      <div
        className="flex flex-col overflow-hidden rounded-card border border-white/[0.06] bg-surface"
        style={{ height }}
      >
        <CardHeaderImage imageUrl={imageUrl} accentClass={accent.header} />

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <h3 className="truncate text-center text-sm font-semibold text-white" title={title}>
            {title}
          </h3>

          <div className="flex items-center justify-center gap-2.5 text-caption text-white/75">
            {stats.map((stat) => (
              <span key={stat.label} className="inline-flex items-center gap-1" title={stat.label}>
                <stat.icon className="size-3.5 shrink-0 text-brand-pink/80" aria-hidden />
                <span className="sr-only">{stat.label}: </span>
                {compactCount(stat.value)}
              </span>
            ))}
            {visibility ? (
              <span
                className="inline-flex items-center text-white/60"
                title={visibility === "private" ? "Private" : "Public"}
              >
                {visibility === "private" ? (
                  <Lock className="size-3.5" aria-hidden />
                ) : (
                  <Globe className="size-3.5" aria-hidden />
                )}
                <span className="sr-only">{visibility === "private" ? "Private" : "Public"}</span>
              </span>
            ) : null}
          </div>

          {reason ? (
            <p className="line-clamp-2 h-8 text-center text-caption leading-4 text-brand-pink" title={`Why this? ${reason}`}>
              <Sparkles className="me-1 inline size-3 -translate-y-px" aria-hidden />
              <span className="sr-only">Why this: </span>
              {reason}
            </p>
          ) : (
            <p className="line-clamp-2 h-8 text-center text-caption leading-4 text-white/60">
              {description}
            </p>
          )}

          {cta || manage ? (
            <div className="mt-auto flex flex-col gap-1.5">
              {cta}
              {manage ? <div className="flex items-center justify-center gap-2">{manage}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
