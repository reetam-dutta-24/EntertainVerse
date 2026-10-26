import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCardTint,
  getDetailHeroBoundaryGlow,
} from "@/lib/card-theme";
import { formatRating } from "@/lib/format-rating";
import { Chip, MatchChip } from "@/components/ui/chip";
import { CollectionHeroSpotlightSlider } from "@/components/collection/collection-hero-spotlight-slider";
import { CommunityHeroActions } from "@/components/community/community-hero-actions";
import { CommunityWallpaperPanel } from "@/components/community/community-wallpaper-panel";
import type { CommunityDetail } from "@/types";

export interface CommunityDetailHeroProps {
  community: CommunityDetail;
  ownerActions?: React.ReactNode;
}

const DETAIL_CHIP =
  "h-7 shrink-0 px-3 text-caption font-medium sm:h-8 sm:px-3.5 sm:text-xs";

const CHIP_ROW =
  "flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const TITLE_CLASS =
  "text-2xl font-bold leading-tight text-white sm:text-heading lg:text-title";

/** Figma community hero — info + favourites slider left; wallpaper panel right. */
export function CommunityDetailHero({
  community,
  ownerActions,
}: CommunityDetailHeroProps) {
  const heroGlow = getDetailHeroBoundaryGlow(
    getCardTint(community.id, 0).glass,
  );

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

      <div className="relative grid w-full grid-cols-1 items-stretch overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(300px,34vw)] lg:h-[calc(100dvh-4.5rem)] lg:max-h-[calc(100dvh-4.5rem)]">
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden px-5 py-5 sm:px-8 sm:py-6 lg:gap-2.5 lg:px-10 lg:py-5 xl:px-14">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <span
                className={cn("inline-flex items-center gap-2", TITLE_CLASS)}
              >
                <Star className="size-6 shrink-0 fill-yellow-400 text-yellow-400 sm:size-7" />
                {formatRating(community.rating)}
              </span>
              <h1 className={TITLE_CLASS}>{community.name}</h1>
            </div>
            {ownerActions ? (
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {ownerActions}
              </div>
            ) : null}
          </div>

          {community.rankLeft || community.rankRight ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs font-medium text-white/70 sm:text-sm">
              {community.rankLeft ? <span>{community.rankLeft}</span> : <span />}
              {community.rankRight ? (
                <span className="text-white/85">{community.rankRight}</span>
              ) : null}
            </div>
          ) : null}

          <div className={cn(CHIP_ROW, "shrink-0")} tabIndex={0} role="group" aria-label="Details">
            {community.primaryTags.map((tag) => (
              <Chip key={tag} chipKey="action" className={DETAIL_CHIP}>
                {tag}
              </Chip>
            ))}
          </div>

          <p className="line-clamp-3 shrink-0 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-body sm:leading-6">
            {community.description}
          </p>

          <CommunityHeroActions communityId={community.id} />

          <div className={cn(CHIP_ROW, "shrink-0")} tabIndex={0} role="group" aria-label="Details">
            {community.matchScore != null ? (
              <MatchChip score={community.matchScore} className={DETAIL_CHIP} />
            ) : null}
            {community.genres.map((genre) => (
              <Chip
                key={genre.id}
                genreId={genre.id}
                genreLabel={genre.label}
                className={DETAIL_CHIP}
              >
                {genre.label}
              </Chip>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <CollectionHeroSpotlightSlider
              variant="content"
              title="❤️ Most liked content"
              items={community.favoriteItems}
            />
          </div>
        </div>

        <CommunityWallpaperPanel
          communitySlug={community.id}
          wallpaperUrl={community.wallpaperUrl}
          communityName={community.name}
          members={community.members}
          memberSummary={community.memberSummary}
          collectionCount={community.collectionCount}
          popularityLabel={community.popularityLabel}
          globalRankLabel={community.globalRankLabel}
          isMember={Boolean(community.viewerRole)}
        />
      </div>
    </section>
  );
}
