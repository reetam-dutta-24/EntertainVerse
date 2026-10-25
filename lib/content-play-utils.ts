import type { ContentPlaySession, Episode } from "@/types";

/**
 * Client-safe play helpers (no server imports — content-play.service pulls in Prisma).
 */

function resolveEpisodeVideoUrl(
  episode: Episode,
  fallbackVideoUrl?: string | null,
): string | undefined {
  return episode.videoUrl ?? fallbackVideoUrl ?? undefined;
}

/** The video for an episode, falling back to the title's own video. */
export function resolvePlayableVideoUrl(
  session: ContentPlaySession,
  episodeId: string,
): string | undefined {
  const episode =
    session.episodes.find((entry) => entry.id === episodeId) ??
    session.episodes[0];
  if (!episode) return session.fallbackVideoUrl;
  return resolveEpisodeVideoUrl(episode, session.fallbackVideoUrl);
}
