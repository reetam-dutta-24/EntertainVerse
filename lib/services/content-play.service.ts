import { normalizeContentSlug } from "@/lib/content-routes";
import { isMovieContentType } from "@/lib/content-media";
import { prismaMediaTypeToApp } from "@/lib/mappers/content.mapper";
import { getContentRecordBySlug } from "@/lib/services/content.service";
import type { ContentPlaySession, Episode } from "@/types";

function pickDefaultEpisode(
  episodes: Episode[],
  isMovie: boolean,
): Episode | null {
  if (episodes.length === 0) return null;
  if (isMovie) return episodes[0] ?? null;
  return (
    episodes.find((episode) => episode.isLastPlayed) ??
    episodes.find(
      (episode) => episode.number === 1 && (episode.seasonNumber ?? 1) === 1,
    ) ??
    episodes[0] ??
    null
  );
}

export async function getContentPlaySession(
  contentSlug: string,
  episodeId?: string,
): Promise<ContentPlaySession | null> {
  const slug = normalizeContentSlug(contentSlug);
  const record = await getContentRecordBySlug(slug);
  if (!record) return null;

  const episodes: Episode[] = record.episodes.map((episode) => ({
    id: episode.id,
    seasonNumber: episode.seasonNumber,
    number: episode.number,
    title: episode.title,
    duration: episode.duration ?? undefined,
    description: episode.description ?? undefined,
    thumbnailUrl: episode.thumbnailUrl ?? undefined,
    videoUrl: episode.videoUrl ?? record.videoUrl ?? undefined,
    releaseDate: episode.releaseDate ?? undefined,
    language: episode.language ?? undefined,
    rating: episode.rating ?? undefined,
  }));

  const contentType = prismaMediaTypeToApp(record.type);
  const isMovie = isMovieContentType(contentType);
  const fallbackVideoUrl = record.videoUrl ?? undefined;

  let currentEpisode =
    (episodeId
      ? episodes.find((episode) => episode.id === episodeId)
      : undefined) ?? pickDefaultEpisode(episodes, isMovie);

  if (!currentEpisode && (fallbackVideoUrl || isMovie)) {
    currentEpisode = {
      id: `${slug}-watch`,
      seasonNumber: 1,
      number: 1,
      title: record.title,
      videoUrl: fallbackVideoUrl,
      thumbnailUrl: record.backdropUrl ?? record.imageUrl ?? undefined,
      duration: record.episodeDuration ?? undefined,
      description: record.description ?? record.synopsis ?? undefined,
    };
    episodes.push(currentEpisode);
  }

  if (!currentEpisode) return null;

  return {
    contentSlug: slug,
    contentTitle: record.title,
    contentType,
    imageUrl: record.imageUrl ?? undefined,
    accent: (record.accent as ContentPlaySession["accent"]) ?? undefined,
    fallbackVideoUrl,
    currentEpisodeId: currentEpisode.id,
    episodes: episodes.length > 0 ? episodes : [currentEpisode],
  };
}

