import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionCard, CommunityCard } from "@/components/cards";
import { ArtistKpiSection } from "@/components/artist";
import { CommunityDashboardPreview, CommunityDetailHero } from "@/components/community";
import { CommunityDetailOwnerActions } from "@/components/forms/community-detail-owner-actions";
import { ContentPageSection, InteractiveReviewSection } from "@/components/content";
import {
  ContentCarouselSection,
  MusicCarouselSection,
} from "@/components/dashboard";
import {
  getAllCommunityIds,
  getCommunityDetail,
} from "@/lib/data/community-detail";
import { getUserReviewsForTarget } from "@/lib/services/review.service";
import { getCommunityMemberPreview } from "@/lib/data/community";
import { getOptionalUser } from "@/lib/data/user";

interface CommunityPageProps {
  params: Promise<{ communityid: string }>;
}

export async function generateStaticParams() {
  const ids = await getAllCommunityIds();
  return ids.map((communityid) => ({ communityid }));
}

export async function generateMetadata({
  params,
}: CommunityPageProps): Promise<Metadata> {
  const { communityid } = await params;
  const community = await getCommunityDetail(communityid);
  if (!community) return { title: "Community — AniVerse" };
  return {
    title: `${community.name} — AniVerse`,
    description: community.description,
  };
}

export default async function CommunityDetailPage({
  params,
}: CommunityPageProps) {
  const { communityid } = await params;
  const viewer = await getOptionalUser();
  const [community, members, reviews] = await Promise.all([
    getCommunityDetail(communityid, viewer?.id),
    getCommunityMemberPreview(viewer?.id),
    getUserReviewsForTarget("community", communityid, viewer?.id),
  ]);

  if (!community) notFound();

  const showOwnerActions = community.canEdit || community.canDelete;

  return (
    <div className="flex w-full flex-col">
      <CommunityDetailHero
        community={community}
        ownerActions={
          showOwnerActions ? (
            <CommunityDetailOwnerActions community={community} />
          ) : undefined
        }
      />
      <ArtistKpiSection stats={community.engagementStats} />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pt-10 sm:gap-12 sm:px-8 lg:gap-14 lg:px-12">
        <CommunityDashboardPreview
          communityId={community.id}
          navItems={community.dashboardNav}
          posts={community.dashboardPosts}
          onlineMembers={community.onlineMembers}
          onlineCount={community.dashboardOnlineCount}
          postsToday={community.dashboardPostsToday}
        />

        <ContentCarouselSection
          title="🎬 Most Watched Content"
          searchPlaceholder="Search titles…"
          items={community.watchedMost}
        />

        <ContentCarouselSection
          title="🚀 Currently Trending"
          searchPlaceholder="Search titles…"
          items={community.trending}
        />

        <MusicCarouselSection
          title="🎧 Most Listened Music"
          searchPlaceholder="Search tracks…"
          tracks={community.musicTracks}
        />

        <ContentPageSection
          title="📒 Public Collections"
          variant="community"
          slides={community.collections.map((collection) => ({
            id: collection.id,
            node: <CollectionCard collection={collection} />,
          }))}
        />

        <ContentPageSection
          title="👥 Similar Communities"
          variant="community"
          slides={community.similarCommunities.map((entry) => ({
            id: entry.id,
            node: (
              <CommunityCard
                community={entry}
                ctaMode="join"
              />
            ),
          }))}
        />

        <InteractiveReviewSection
          title={`✍️ Community Reviews for ${community.name}`}
          reviews={reviews}
          targetType="community"
          targetSlug={community.id}
          viewerUserId={viewer?.id}
        />
      </div>
    </div>
  );
}
