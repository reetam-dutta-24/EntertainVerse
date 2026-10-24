import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CollectionCard,
  CommunityCard,
  MusicCard,
  PosterCard,
} from "@/components/cards";
import {
  ContentCharacterCard,
  ContentDetailEngagementShell,
  ContentDetailHero,
  ContentEpisodeSection,
  ContentMovieSection,
  ContentPageSection,
  InteractiveReviewSection,
} from "@/components/content";
import {
  isMovieContentType,
  isVoiceCastContentType,
} from "@/lib/content-media";
import { getCommunityMemberPreview } from "@/lib/data/community";
import { getOptionalUser } from "@/lib/data/user";
import {
  getAllContentIds,
  getContentDetail,
} from "@/lib/data/content-detail";
import { isContentFavorited } from "@/lib/services/favorite.service";
import { isContentOnWatchlist } from "@/lib/services/watchlist.service";

interface ContentPageProps {
  params: Promise<{ contentid: string }>;
}

export async function generateStaticParams() {
  const ids = await getAllContentIds();
  return ids.map((contentid) => ({ contentid }));
}

export async function generateMetadata({
  params,
}: ContentPageProps): Promise<Metadata> {
  const { contentid } = await params;
  const content = await getContentDetail(contentid);
  if (!content) return { title: "Content — AniVerse" };
  return {
    title: `${content.title} — AniVerse`,
    description: content.synopsis,
  };
}

export default async function ContentDetailPage({ params }: ContentPageProps) {
  const { contentid } = await params;
  const viewer = await getOptionalUser();
  const [content, members] = await Promise.all([
    getContentDetail(contentid, viewer?.id),
    getCommunityMemberPreview(),
  ]);

  if (!content) notFound();

  const initialFavorited = viewer?.id
    ? await isContentFavorited(viewer.id, content.id)
    : false;
  const initialOnWatchlist = viewer?.id
    ? await isContentOnWatchlist(viewer.id, content.id)
    : false;

  const isMovie = isMovieContentType(content.type);
  const movieEpisode = content.episodes[0];
  const castLabel = isVoiceCastContentType(content.type) ? "voice" : "actor";
  const relatedAutoMs = 4000;

  return (
    <ContentDetailEngagementShell
      contentSlug={content.id}
      initialStats={content.engagementStats}
      initialFavorited={initialFavorited}
      initialOnWatchlist={initialOnWatchlist}
    >
    <div className="flex w-full flex-col gap-10 sm:gap-12 lg:gap-14">
      <ContentDetailHero
        content={content}
        initialFavorited={initialFavorited}
        initialOnWatchlist={initialOnWatchlist}
      />

      {isMovie ? (
        <ContentMovieSection
          content={content}
          episode={movieEpisode}
          contentAccent={content.accent}
        />
      ) : (
        <ContentEpisodeSection
          episodes={content.episodes}
          seasons={content.seasons}
          contentId={content.id}
          contentAccent={content.accent}
        />
      )}

      <ContentPageSection
        title="🎭 Characters"
        variant="content"
        rowHover={false}
        autoAdvanceMs={4000}
        slides={content.characters.map((character) => ({
          id: character.id,
          node: (
            <ContentCharacterCard
              character={character}
              contentId={content.id}
              contentAccent={content.accent}
              castLabel={castLabel}
              interactive={false}
            />
          ),
        }))}
      />

      <ContentPageSection
        title={`🎼 Featured OSTs of ${content.title}`}
        variant="content"
        autoAdvanceMs={relatedAutoMs}
        emptyMessage={`No featured OSTs linked to ${content.title} yet.`}
        slides={content.featuredOsts.map((track) => ({
          id: track.id,
          accent: track.accent,
          node: <MusicCard track={track} />,
        }))}
      />

      <ContentPageSection
        title="💡 You may also like"
        variant="content"
        autoAdvanceMs={relatedAutoMs}
        emptyMessage="No related titles to suggest yet."
        slides={content.relatedContent.map((item) => ({
          id: item.id,
          accent: item.accent,
          node: <PosterCard item={item} />,
        }))}
      />

      <ContentPageSection
        title="📒 Included in collections"
        variant="community"
        emptyMessage={`${content.title} is not in any collections yet.`}
        slides={content.collections.map((collection) => ({
          id: collection.id,
          node: <CollectionCard collection={collection} />,
        }))}
      />

      <ContentPageSection
        title={`👥 Communities Involving ${content.title}`}
        variant="community"
        emptyMessage={`No communities linked to ${content.title} yet.`}
        slides={content.communities.map((community) => ({
          id: community.id,
          node: (
            <CommunityCard
              community={community}
              ctaMode="join"
            />
          ),
        }))}
      />

      <InteractiveReviewSection
        title={`✍️ Reviews Of ${content.title}`}
        reviews={content.reviews}
        targetType="content"
        targetSlug={content.id}
        viewerUserId={viewer?.id}
      />
    </div>
    </ContentDetailEngagementShell>
  );
}
