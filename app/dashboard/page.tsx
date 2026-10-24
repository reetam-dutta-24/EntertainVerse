import type { Metadata } from "next";
import {
  AiTasteProfileBar,
  CollectionGridSection,
  CommunityGridSection,
  ContentCarouselSection,
  HomeQuickLinks,
  MusicCarouselSection,
  WelcomeBanner,
} from "@/components/dashboard";
import { getCurrentUser } from "@/lib/data/user";
import {
  getHomeCollections,
  getHomeCommunities,
  getHomeContinueListening,
  getHomeContinueWatching,
  getHomeRecommended,
  getHomeStats,
  getHomeTrending,
  type HomeStats,
} from "@/lib/data/home";

export const metadata: Metadata = {
  title: "Home — AniVerse",
  description:
    "Your entertainment hub — personalized picks, watchlists, collections, and communities.",
};

const statTiles = (stats: HomeStats) => [
  { emoji: "🧠", label: "AI Taste Profile", value: `${stats.aiTasteScore}%` },
  { emoji: "📋", label: "Watchlist Saved", value: String(stats.watchlistSaved) },
  { emoji: "⏳", label: "Pending", value: String(stats.watchlistPending) },
  { emoji: "📒", label: "Collections", value: String(stats.collections) },
  { emoji: "👥", label: "Communities", value: String(stats.communitiesJoined) },
  {
    emoji: "💬",
    label: "Posts Viewed",
    value: stats.postsViewed.toLocaleString(),
  },
  { emoji: "🎯", label: "New Matches", value: String(stats.newMatches) },
  { emoji: "🔥", label: "Trending Now", value: String(stats.trendingCount) },
];

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  const [
    stats,
    continueWatching,
    recommended,
    trending,
    continueListening,
    communities,
    collections,
  ] = await Promise.all([
    getHomeStats(user.id),
    getHomeContinueWatching(user.id),
    getHomeRecommended(user.id),
    getHomeTrending(),
    getHomeContinueListening(user.id),
    getHomeCommunities(user.id),
    getHomeCollections(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 sm:gap-8">
      <WelcomeBanner userName={user.name} variant="home" />

      <AiTasteProfileBar score={stats.aiTasteScore} />

      <section className="rounded-2xl bg-surface/40 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <h2 className="text-lg font-bold text-white sm:text-heading">
          🌌 Your Universe at a Glance
        </h2>
        <p className="mt-1 text-sm text-white/75">
          A snapshot of your taste, saves, and activity across AniVerse.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {statTiles(stats).map((tile) => (
            <div
              key={tile.label}
              className="bg-gradient-brand flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center shadow-[0_2px_10px_rgba(255,0,204,0.12)] sm:px-4 sm:py-4"
            >
              <span className="text-[10px] font-semibold text-white sm:text-xs">
                {tile.emoji} {tile.label}
              </span>
              <span className="text-xl font-bold text-white sm:text-2xl">{tile.value}</span>
            </div>
          ))}
        </div>
      </section>

      <HomeQuickLinks />

      <ContentCarouselSection
        title="⏳ Continue Watching"
        subtitle="Pick up where you left off"
        searchPlaceholder="Search Watching Content……. "
        items={continueWatching}
      />

      <ContentCarouselSection
        title="🎯 Recommended For You"
        subtitle="Hand-picked from your genres, ratings, and watch history"
        searchPlaceholder="Search Recommended Content……. "
        items={recommended}
      />

      <ContentCarouselSection
        title="🚀 Trending This Week"
        subtitle="What everyone is watching across AniVerse"
        searchPlaceholder="Search Trending Content……. "
        items={trending}
      />

      <MusicCarouselSection
        title="🎵 Continue Listening"
        subtitle="Resume tracks, albums, and playlists you recently played"
        searchPlaceholder="Search Listening Content……. "
        tracks={continueListening}
      />

      <CommunityGridSection
        title="👥 Communities For You"
        searchPlaceholder="Search Communities……. "
        communities={communities}
        ctaMode="join"
      />

      <CollectionGridSection
        title="📒 Recently Used Collections"
        searchPlaceholder="Search Collections……. "
        collections={collections}
      />
    </div>
  );
}
