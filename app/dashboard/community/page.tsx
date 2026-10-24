import type { Metadata } from "next";
import { CommunityDashboard } from "@/components/dashboard/community-dashboard";
import {
  getCommunityGenres,
  getCommunityStats,
  getFavouriteCommunities,
  getGlobalCommunities,
  getMostActiveCommunities,
  getRecommendedCommunities,
} from "@/lib/data/community";
import { getCurrentUser } from "@/lib/data/user";

export const metadata: Metadata = {
  title: "Community — AniVerse",
  description:
    "Discover communities, join discussions, and connect with anime and media fans.",
};

export default async function CommunityPage() {
  const user = await getCurrentUser();
  const [stats, genres, favourites, mostActive, recommended, global] =
    await Promise.all([
      getCommunityStats(user.id),
      getCommunityGenres(),
      getFavouriteCommunities(user.id),
      getMostActiveCommunities(user.id),
      getRecommendedCommunities(user.id),
      getGlobalCommunities(),
    ]);

  return (
    <CommunityDashboard
      userName={user.name}
      stats={stats}
      genres={genres}
      favourites={favourites}
      mostActive={mostActive}
      recommended={recommended}
      global={global}
    />
  );
}
