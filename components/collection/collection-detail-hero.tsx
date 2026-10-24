import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccentTint, getDetailHeroBoundaryGlow } from "@/lib/card-theme";
import { formatRating } from "@/lib/format-rating";
import { CollectionFavoriteCountChip } from "@/components/collection/collection-favorite-count-chip";
import { CollectionFollowerCountChip } from "@/components/collection/collection-follower-count-chip";
import { CollectionHeroShareButton } from "@/components/collection/collection-hero-share-button";
import { Chip, MatchChip } from "@/components/ui/chip";
import { CollectionActivityPanel } from "@/components/collection/collection-activity-panel";
import { CollectionHeroSpotlightSlider } from "@/components/collection/collection-hero-spotlight-slider";
import {
  COLLECTION_MEDIA_COPY,
  type CollectionMediaVariant,
} from "@/lib/collection-media-copy";
import type { CollectionDetail, MusicTrack } from "@/types";

export interface CollectionDetailHeroProps {
  collection: CollectionDetail;
  variant?: CollectionMediaVariant;
  favoriteTracks?: MusicTrack[];
  /** Owner edit/delete controls — rendered in the hero header. */
  ownerActions?: React.ReactNode;
  initialFavorited?: boolean;
  /** Hide favorite CTA on the viewer's own collection. */
  canFavorite?: boolean;
  canManage?: boolean;
  /** Show follow CTA for public collections the viewer does not own. */
  canFollow?: boolean;
  initialFollowing?: boolean;
}

const DETAIL_CHIP =
  "h-7 shrink-0 px-3 text-caption font-medium sm:h-8 sm:px-3.5 sm:text-xs";

const CHIP_ROW =
  "flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const TITLE_CLASS =
  "text-2xl font-bold leading-tight text-white sm:text-title lg:text-title";

/** Collection detail hero — Figma main visual: info + spotlight slider + activity panel. */
export function CollectionDetailHero({
  collection,
  variant = "content",
  favoriteTracks,
  ownerActions,
  initialFavorited,
  canFavorite = true,
  canManage = false,
  canFollow = false,
  initialFollowing = false,
}: CollectionDetailHeroProps) {
  const copy = COLLECTION_MEDIA_COPY[variant];
  const tint = getAccentTint(collection.accent);
  const heroGlow = getDetailHeroBoundaryGlow(tint.glass);

  return (
    <section
      className="relative w-full lg:max-h-[calc(100dvh-4.5rem)]"
      style={{ boxShadow: heroGlow.boxShadow }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: heroGlow.radialBackground }}
      />

      <div className="relative grid w-full grid-cols-1 items-stretch overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(300px,36vw)] lg:h-[calc(100dvh-4.5rem)] lg:max-h-[calc(100dvh-4.5rem)]">
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-8 sm:py-6 lg:gap-3.5 lg:px-10 lg:py-7 xl:px-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <span
                className={cn("inline-flex items-center gap-2", TITLE_CLASS)}
              >
                <Star className="size-6 shrink-0 fill-yellow-400 text-yellow-400 sm:size-7" />
                {formatRating(collection.rating)}
              </span>
              <h1 className={TITLE_CLASS}>{collection.name}</h1>
            </div>
            {ownerActions ? (
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {ownerActions}
              </div>
            ) : null}
          </div>

          {collection.trendingLabel ? (
            <p className="text-sm font-semibold text-brand-pink">
              {collection.trendingLabel}
            </p>
          ) : null}

          <div className={CHIP_ROW}>
            {collection.genres.map((genre) => (
              <Chip
                key={genre.id}
                genreId={genre.id}
                genreLabel={genre.label}
                className={DETAIL_CHIP}
              >
                {genre.label}
              </Chip>
            ))}
            {collection.createdAt ? (
              <Chip variant="brand" className={DETAIL_CHIP}>
                Created on {collection.createdAt}
              </Chip>
            ) : null}
          </div>

          <p className="line-clamp-4 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-body sm:leading-7">
            {collection.description}
          </p>

          <div className={CHIP_ROW}>
            {collection.matchScore != null ? (
              <MatchChip
                score={collection.matchScore}
                className={DETAIL_CHIP}
              />
            ) : null}
            <Chip variant="indigo" className={DETAIL_CHIP}>
              {copy.itemCount(collection.itemCount)}
            </Chip>
            <CollectionFavoriteCountChip
              initialCount={collection.favoriteCount}
              className={DETAIL_CHIP}
            />
            {collection.visibility === "public" ? (
              <CollectionFollowerCountChip
                initialCount={collection.followerCount ?? 0}
                className={DETAIL_CHIP}
              />
            ) : null}
            <Chip chipKey="mystery" className={DETAIL_CHIP}>
              {collection.visibility === "private" ? "🔒 Private" : "🌍 Public"}
            </Chip>
          </div>

          <CollectionHeroSpotlightSlider
            variant={variant}
            items={variant === "content" ? collection.favoriteItems : undefined}
            tracks={variant === "music" ? favoriteTracks : undefined}
          />

          <CollectionHeroShareButton collectionName={collection.name} />
        </div>

        <CollectionActivityPanel
          activity={collection.currentActivity}
          fallbackImageUrl={collection.imageUrl}
          fallbackTitle={collection.name}
          contributors={collection.contributors}
          contributorSummary={collection.contributorSummary}
          variant={variant}
          collectionSlug={collection.id}
          initialFavorited={initialFavorited}
          canFavorite={canFavorite}
          canManage={canManage}
          canFollow={canFollow}
          initialFollowing={initialFollowing}
          collectionName={collection.name}
        />
      </div>
    </section>
  );
}
