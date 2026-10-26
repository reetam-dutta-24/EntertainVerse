import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/format-rating";
import {
  getAccentTint,
  getCardTint,
  getDetailHeroBoundaryGlow,
} from "@/lib/card-theme";
import { Chip, MatchChip } from "@/components/ui/chip";
import { ContentDescription } from "@/components/content/content-description";
import { ArtistHeroTrendingSlider } from "@/components/artist/artist-hero-trending-slider";
import { ArtistNowPlayingPanel } from "@/components/artist/artist-now-playing-panel";
import type { ArtistDetail } from "@/types";
export interface ArtistDetailHeroProps {
  artist: ArtistDetail;
}

const DETAIL_CHIP =
  "h-7 shrink-0 px-3 text-caption font-medium sm:h-8 sm:px-3.5 sm:text-xs";

const CHIP_ROW =
  "flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const TITLE_CLASS =
  "text-2xl font-bold leading-tight text-white sm:text-title lg:text-title";

/** Figma artist hero — bio + trending slider left; banner player right. */
export function ArtistDetailHero({ artist }: ArtistDetailHeroProps) {
  const tint = artist.accent
    ? getAccentTint(artist.accent)
    : getCardTint(artist.id, 0);
  const heroGlow = getDetailHeroBoundaryGlow(tint.glass);
  const titleLine = artist.nativeTitle
    ? `${artist.title} | ${artist.nativeTitle}`
    : artist.title;

  const statChips = [
    artist.matchScore != null ? `AI Match ${artist.matchScore}%` : null,
    artist.songCount != null ? `${artist.songCount} Songs` : null,
    artist.albumCount != null ? `${artist.albumCount} Albums` : null,
    artist.metadata.studio ?? null,
  ].filter(Boolean) as string[];

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
        <div className="flex min-h-0 flex-col gap-3 px-5 py-5 sm:px-8 sm:py-6 lg:gap-3.5 lg:px-10 lg:py-7 xl:px-14">
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <span
              className={cn("inline-flex items-center gap-2", TITLE_CLASS)}
            >
              <Star className="size-6 shrink-0 fill-yellow-400 text-yellow-400 sm:size-7" />
              {formatRating(artist.rating)}
            </span>
            <h1 className={TITLE_CLASS}>{titleLine}</h1>
          </div>

          {artist.rankLeft || artist.rankRight ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs font-medium text-white/70 sm:text-sm">
              {artist.rankLeft ? <span>{artist.rankLeft}</span> : <span />}
              {artist.rankRight ? (
                <span className="text-white/85">{artist.rankRight}</span>
              ) : null}
            </div>
          ) : null}

          <div className={CHIP_ROW} tabIndex={0} role="group" aria-label="Details">
            {artist.genres.map((genre) => (
              <Chip
                key={genre.id}
                accent={artist.accent}
                className={DETAIL_CHIP}
              >
                {genre.label}
              </Chip>
            ))}
            {artist.primaryTags
              .filter(
                (tag) =>
                  !artist.genres.some(
                    (genre) => genre.label.toLowerCase() === tag.toLowerCase(),
                  ),
              )
              .map((tag) => (
                <Chip key={tag} brand className={DETAIL_CHIP}>
                  {tag}
                </Chip>
              ))}
          </div>

          <ContentDescription
            text={artist.description}
            referenceUrl={artist.referenceUrl}
            className="max-w-3xl shrink-0"
          />

          <div className={CHIP_ROW} tabIndex={0} role="group" aria-label="Details">
            {artist.matchScore != null ? (
              <MatchChip score={artist.matchScore} className={DETAIL_CHIP} />
            ) : null}
            {statChips
              .filter((tag) => !tag.startsWith("AI Match"))
              .map((tag) => (
                <Chip key={tag} accent={artist.accent} className={DETAIL_CHIP}>
                  {tag}
                </Chip>
              ))}
          </div>

          <div className="min-h-0 flex-1">
            <ArtistHeroTrendingSlider
              title={`🔥 Currently Trending ${artist.title} Songs`}
              tracks={artist.trendingSongs}
            />
          </div>
        </div>

        <ArtistNowPlayingPanel
          artistSlug={artist.id}
          imageUrl={artist.imageUrl}
          artistName={artist.title}
          trackSlugs={artist.allSongs.map((track) => track.id)}
          connections={artist.connections}
          connectionSummary={artist.connectionSummary}
          followerCount={artist.followerCount}
          initialFavorited={artist.viewerFavorited}
          initialFollowing={artist.viewerFollowing}
        />
      </div>
    </section>
  );
}
