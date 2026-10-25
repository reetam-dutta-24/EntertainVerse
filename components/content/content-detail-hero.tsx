import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/format-rating";
import { labelForLanguage } from "@/lib/catalog-enums";
import { resolveMetadataChip } from "@/lib/chip-styles";
import { isMovieContentType } from "@/lib/content-media";
import { DETAIL_HERO_BTN_PAIR } from "@/lib/detail-route-ui";
import {
  getAccentTint,
  getDetailHeroBoundaryGlow,
} from "@/lib/card-theme";
import { DetailImage } from "@/components/ui/detail-image";
import { Chip, MatchChip } from "@/components/ui/chip";
import { ContentHeroActions } from "@/components/content/content-hero-actions";
import { ContentDescription } from "@/components/content/content-description";
import { ContentHeroCollectionButton } from "@/components/content/content-hero-collection-button";
import { ContentHeroPosterActions } from "@/components/content/content-hero-poster-actions";
import { HeroTrailerToggle } from "@/components/content/hero-trailer-toggle";
import { ContentEngagementPanel } from "@/components/content/content-engagement-panel";
import { SongHeroPosterPanel } from "@/components/song/song-hero-poster-panel";
import { SongHeroWatchlistButton } from "@/components/song/song-hero-watchlist-button";
import type { ContentDetail, ContentMetadata, Episode, MediaType } from "@/types";

export interface ContentDetailHeroProps {
  content: ContentDetail;
  initialFavorited?: boolean;
  initialOnWatchlist?: boolean;
}

function isSongMedia(type: MediaType) {
  return type === "song" || type === "album" || type === "playlist";
}

const DETAIL_CHIP =
  "h-7 shrink-0 px-3 text-caption font-medium sm:h-8 sm:px-3.5 sm:text-xs";

const CHIP_ROW = "flex flex-wrap items-center gap-2";

const TITLE_CLASS =
  "text-3xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-4xl lg:text-5xl";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function totalEpisodes(content: ContentDetail) {
  return content.seasons
    .filter((season) => season.id !== "movie")
    .reduce((sum, season) => sum + season.episodeCount, 0);
}

function seasonCount(content: ContentDetail) {
  return content.seasons.filter((season) => season.id !== "movie").length;
}

function resolveContinueEpisode(content: ContentDetail): Episode | null {
  if (content.watchProgress) {
    const { seasonNumber, episodeNumber } = content.watchProgress;
    const match = content.episodes.find(
      (ep) =>
        (ep.seasonNumber ?? 1) === seasonNumber && ep.number === episodeNumber,
    );
    if (match) return match;
  }
  return content.episodes.find((ep) => ep.isLastPlayed) ?? null;
}

function buildMetadataChips(metadata: ContentMetadata): React.ReactNode[] {
  const chips: React.ReactNode[] = [];

  if (metadata.ageRating) {
    chips.push(
      <Chip key="age" chipKey={resolveMetadataChip("age-rating")} className={DETAIL_CHIP}>
        {metadata.ageRating}
      </Chip>,
    );
  }
  if (metadata.status) {
    chips.push(
      <Chip key="status" chipKey={resolveMetadataChip("status")} className={DETAIL_CHIP}>
        {metadata.status}
      </Chip>,
    );
  }
  if (metadata.studio) {
    chips.push(
      <Chip key="studio" chipKey={resolveMetadataChip("studio")} className={DETAIL_CHIP}>
        {metadata.studio}
      </Chip>,
    );
  }
  if (metadata.sourceMaterial) {
    chips.push(
      <Chip key="source" chipKey={resolveMetadataChip("source")} className={DETAIL_CHIP}>
        {metadata.sourceMaterial}
      </Chip>,
    );
  }

  return chips;
}

function buildMetadataRows(
  metadata: ContentMetadata,
  type: MediaType,
): { label: string; value: string }[] {
  if (isSongMedia(type)) {
    return [
      metadata.studio ? { label: "Artist", value: metadata.studio } : null,
      metadata.director ? { label: "Album", value: metadata.director } : null,
      metadata.originalAuthor
        ? { label: "Source", value: metadata.originalAuthor }
        : null,
      metadata.airedFrom ? { label: "Released", value: metadata.airedFrom } : null,
    ].filter(Boolean) as { label: string; value: string }[];
  }

  const aired =
    metadata.airedFrom != null
      ? metadata.airedTo
        ? `${metadata.airedFrom} – ${metadata.airedTo}`
        : metadata.airedFrom
      : null;

  return [
    metadata.imdbRating != null
      ? { label: "IMDB", value: formatRating(metadata.imdbRating) }
      : null,
    metadata.malScore != null
      ? { label: "MyAnimeList", value: formatRating(metadata.malScore) }
      : null,
    metadata.director ? { label: "Director", value: metadata.director } : null,
    metadata.originalAuthor
      ? { label: "Author", value: metadata.originalAuthor }
      : null,
    aired ? { label: "Aired", value: aired } : null,
  ].filter(Boolean) as { label: string; value: string }[];
}

/** Figma hero — full-width, accent-themed inner boundary, neutral poster vignette. */
export function ContentDetailHero({
  content,
  initialFavorited,
  initialOnWatchlist,
}: ContentDetailHeroProps) {
  const tint = getAccentTint(content.accent);
  const heroGlow = getDetailHeroBoundaryGlow(tint.glass);
  const languages = content.metadata.languages ?? [];
  const songMedia = isSongMedia(content.type);
  const isMovie = isMovieContentType(content.type);
  const metadataChips = buildMetadataChips(content.metadata);
  const metadataRows = buildMetadataRows(content.metadata, content.type);
  const continueEpisode = resolveContinueEpisode(content);

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

      <div className="relative grid w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,36vw)] lg:min-h-[calc(100dvh-4.5rem)]">
        <div className="flex flex-col gap-3 px-5 py-6 sm:px-8 sm:py-8 lg:justify-center lg:gap-4 lg:px-10 lg:py-10 xl:px-14">
          <div className="flex flex-col gap-1">
            <h1 className={TITLE_CLASS}>{content.title}</h1>
            {content.nativeTitle ? (
              <p className="text-base font-medium text-white/55 sm:text-lg">{content.nativeTitle}</p>
            ) : null}
          </div>

          {content.creditLabel ? (
            <p className="text-sm font-medium text-white/85">
              {content.creditLabel}
            </p>
          ) : null}

          {content.trendingLabel ? (
            <p className="text-sm font-semibold text-brand-pink">
              {content.trendingLabel}
            </p>
          ) : null}

          <div className={CHIP_ROW}>
            {content.rating != null ? (
              <span
                className={cn(
                  DETAIL_CHIP,
                  "inline-flex items-center gap-1.5 rounded-full border border-yellow-300/40 bg-yellow-400/15 font-bold text-yellow-200 backdrop-blur-md",
                )}
                aria-label={`Rated ${formatRating(content.rating)} out of 10`}
              >
                <Star className="size-3.5 fill-yellow-300 text-yellow-300" aria-hidden />
                {formatRating(content.rating)}
              </span>
            ) : null}
            <Chip mediaType={content.type} className={DETAIL_CHIP}>
              {songMedia && content.metadata.sourceMaterial
                ? content.metadata.sourceMaterial
                : content.type === "anime"
                  ? "Anime"
                  : content.type.charAt(0).toUpperCase() + content.type.slice(1)}
            </Chip>
            {content.metadata.releaseYear ? (
              <Chip chipKey={resolveMetadataChip(`year-${content.metadata.releaseYear}`)} className={DETAIL_CHIP}>
                {content.metadata.releaseYear}
              </Chip>
            ) : null}
            {content.genres.map((genre) => (
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

          <ContentDescription
            text={content.description}
            referenceUrl={content.referenceUrl}
            className="max-w-3xl"
          />

          <div className={CHIP_ROW}>
            {content.matchScore != null ? (
              <MatchChip score={content.matchScore} className={DETAIL_CHIP} />
            ) : null}
            {songMedia ? (
              <>
                {content.metadata.originalAuthor ? (
                  <Chip chipKey={resolveMetadataChip("original-author")} className={DETAIL_CHIP}>
                    {content.metadata.originalAuthor}
                  </Chip>
                ) : null}
                {content.metadata.episodeDuration ? (
                  <Chip chipKey={resolveMetadataChip("duration")} className={DETAIL_CHIP}>
                    {content.metadata.episodeDuration}
                  </Chip>
                ) : null}
              </>
            ) : isMovie ? (
              metadataChips
            ) : (
              <>
                <Chip chipKey={resolveMetadataChip("season-count")} className={DETAIL_CHIP}>
                  {plural(seasonCount(content), "Season")}
                </Chip>
                <Chip chipKey={resolveMetadataChip("episode-count")} className={DETAIL_CHIP}>
                  {plural(totalEpisodes(content), "Episode")}
                </Chip>
                {metadataChips}
              </>
            )}
            {languages.map((lang) => (
              <Chip key={lang} language={lang} className={DETAIL_CHIP}>
                {labelForLanguage(lang)}
              </Chip>
            ))}
          </div>

          {/* Primary actions — one row, Watch first */}
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {songMedia ? (
              <div className={DETAIL_HERO_BTN_PAIR}>
                <SongHeroWatchlistButton
                  sourceContentSlug={content.sourceContentSlug}
                  sourceTitle={content.metadata.originalAuthor}
                  initialOnWatchlist={initialOnWatchlist}
                />
              </div>
            ) : (
              <>
                <ContentHeroPosterActions
                  content={content}
                  continueEpisode={continueEpisode}
                  initialFavorited={initialFavorited}
                  initialOnWatchlist={initialOnWatchlist}
                />
                <ContentHeroCollectionButton contentSlug={content.id} contentTitle={content.title} />
              </>
            )}
          </div>

          {metadataRows.length > 0 ? (
            <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/70 sm:text-sm">
              {metadataRows.map((row) => (
                <div key={row.label} className="flex gap-1.5">
                  <dt className="font-semibold uppercase tracking-wider text-white/45 text-[11px] leading-5 sm:text-xs">{row.label}</dt>
                  <dd className="text-white/90">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-1">
            <ContentEngagementPanel accent={content.accent} />
          </div>

          <ContentHeroActions
            content={content}
            continueEpisode={continueEpisode}
          />
        </div>

        <div className="relative min-h-[360px] lg:min-h-0">
          <div className="relative size-full overflow-hidden lg:absolute lg:inset-0">
            <DetailImage
              src={content.imageUrl}
              alt={content.title}
              priority
            />
            {!songMedia && content.trailerUrl ? <HeroTrailerToggle trailerUrl={content.trailerUrl} title={content.title} /> : null}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: songMedia
                  ? "inset 0 0 64px 34px rgba(0,0,0,0.48), inset -34px 0 50px rgba(0,0,0,0.36), inset 0 -50px 60px rgba(0,0,0,0.52), inset 0 20px 32px rgba(0,0,0,0.22)"
                  : "inset 0 0 96px 58px rgba(0,0,0,0.72), inset -52px 0 76px rgba(0,0,0,0.62), inset 0 -76px 92px rgba(0,0,0,0.74), inset 0 34px 52px rgba(0,0,0,0.38)",
              }}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-r from-background/20 via-transparent",
                songMedia ? "to-black/38" : "to-black/58",
              )}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-t via-black/15",
                songMedia
                  ? "from-black/56 to-black/18"
                  : "from-black/78 to-black/26",
              )}
            />

            {songMedia ? (
              <SongHeroPosterPanel
                songSlug={content.id}
                title={content.title}
                artist={content.metadata.studio ?? content.creditLabel ?? "Artist"}
                resumeLabel={content.resumeLabel}
                durationSeconds={content.durationSeconds}
                audioUrl={content.audioUrl}
                clipUrl={content.previewUrl}
                lyrics={content.lyrics}
                accent={content.accent}
                initialFavorited={initialFavorited}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
