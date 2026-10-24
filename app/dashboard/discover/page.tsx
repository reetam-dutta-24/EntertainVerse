import { AiModeLauncher } from "@/components/ai-mode/ai-mode-launcher";
import type { Metadata } from "next";
import {
  ActiveFiltersBar,
  ContentCarouselSection,
  MusicCarouselSection,
  WelcomeBanner,
} from "@/components/dashboard";
import { getCurrentUser } from "@/lib/data/user";
import {
  getActiveFilters,
  getContinueListening,
  getContinueWatching,
  getMusicForYourTaste,
  getNewReleases,
  getRecommendedForYou,
  getTrendingMusic,
  getTrendingThisWeek,
} from "@/lib/data/discover";

export const metadata: Metadata = {
  title: "Discover — AniVerse",
  description:
    "Explore trending anime, movies, shows, K-dramas, and music picked for your taste.",
};

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  const [
    filters,
    trending,
    recommended,
    newReleases,
    continueWatching,
    musicForTaste,
    trendingMusic,
    continueListening,
  ] = await Promise.all([
    getActiveFilters(user.id),
    getTrendingThisWeek(),
    getRecommendedForYou(user.id),
    getNewReleases(),
    getContinueWatching(user.id),
    getMusicForYourTaste(user.id),
    getTrendingMusic(),
    getContinueListening(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="discover" />
      <AiModeLauncher defaultMode="listen" />

      <ActiveFiltersBar filters={filters} />

      <ContentCarouselSection
        title="🚀 Trending this week"
        subtitle="Most watched across AniVerse"
        searchPlaceholder="Search Trending Content……. "
        items={trending}
      />

      <ContentCarouselSection
        title="🎯 Recommended for you"
        subtitle="Based on your genres, ratings, and watch history"
        searchPlaceholder="Search Recommended Content……. "
        items={recommended}
      />

      <ContentCarouselSection
        title="🆕 New releases"
        subtitle="Fresh anime, movies, shows, and music added this week"
        searchPlaceholder="Search New Content…… "
        items={newReleases}
      />

      <ContentCarouselSection
        title="⏳ Continue watching"
        subtitle="Pick up your unfinished stories and episodes"
        searchPlaceholder="Search Watching Content……. "
        items={continueWatching}
      />

      <MusicCarouselSection
        title="🎧 Recommended for your taste"
        subtitle="Songs, OSTs, and artists matched to your mood and watch history"
        searchPlaceholder="Search Music Content……. "
        tracks={musicForTaste}
      />

      <MusicCarouselSection
        title="📈 Trending songs / OSTs / artists"
        subtitle="Most played anime songs, soundtracks, and artists across AniVerse"
        searchPlaceholder="Search Trending Music…… "
        tracks={trendingMusic}
      />

      <MusicCarouselSection
        title="🎵 Continue listening"
        subtitle="Resume tracks, albums, and playlists you recently played"
        searchPlaceholder="Search Listening Content……. "
        tracks={continueListening}
      />
    </div>
  );
}
