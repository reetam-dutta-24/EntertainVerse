import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/format-rating";
import type { AccentColor } from "@/lib/catalog-enums";
import { getAccentStatBackground } from "@/lib/card-theme";
import {
  chipClassFor,
  resolveGenreChip,
  resolveLanguageChip,
  resolveMusicKindChip,
  resolveTypeChip,
  type ChipKey,
} from "@/lib/chip-styles";

/** Legacy variant names kept for community/collection cards. */
const legacyVariantMap: Record<string, ChipKey> = {
  blue: "action",
  indigo: "mystery",
  teal: "drama",
  brand: "aimatch",
  magenta: "movie",
  outline: "aimatch",
};

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  chipKey?: ChipKey;
  genreId?: string;
  genreLabel?: string;
  mediaType?: Parameters<typeof resolveTypeChip>[0];
  language?: string;
  musicKind?: string;
  /** Catalog accent gradient — e.g. artist hero stat/genre chips. */
  accent?: AccentColor | string;
  /** Main AniVerse brand gradient. */
  brand?: boolean;
  /** @deprecated Use chipKey/genreId/mediaType instead. */
  variant?: keyof typeof legacyVariantMap;
}

const chipBase =
  "inline-flex h-5 items-center justify-center whitespace-nowrap rounded-full px-2 text-micro font-medium";

/** Small pill — genre-colored gradients, 11px medium micro label. */
export function Chip({
  className,
  chipKey,
  genreId,
  genreLabel,
  mediaType,
  language,
  musicKind,
  accent,
  brand,
  variant,
  children,
  style,
  ...props
}: ChipProps) {
  if (accent) {
    return (
      <span
        className={cn(chipBase, "text-white", className)}
        style={{ background: getAccentStatBackground(accent), ...style }}
        {...props}
      >
        {children}
      </span>
    );
  }

  if (brand) {
    return (
      <span
        className={cn(chipBase, "bg-gradient-brand text-white", className)}
        style={style}
        {...props}
      >
        {children}
      </span>
    );
  }

  let key: ChipKey = chipKey ?? "default";
  if (variant) key = legacyVariantMap[variant] ?? "default";
  else if (genreId) key = resolveGenreChip(genreId, genreLabel);
  else if (mediaType) key = resolveTypeChip(mediaType);
  else if (language) key = resolveLanguageChip(language);
  else if (musicKind) key = resolveMusicKindChip(musicKind);

  return (
    <span
      className={cn(chipBase, chipClassFor(key), className)}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}

export function RatingChip({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <Chip chipKey="rating" className={cn("min-w-[52px]", className)}>
      ⭐ {formatRating(rating)}
    </Chip>
  );
}

export function MatchChip({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <Chip brand className={className}>
      AI Match {score}%
    </Chip>
  );
}
