import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionCard, CommunityCard, MusicCard } from "@/components/cards";
import {
  ContentDetailEngagementShell,
  ContentDetailHero,
  ContentPageSection,
  InteractiveReviewSection,
} from "@/components/content";
import { ListenLinksSection } from "@/components/song/listen-links-section";
import { SongRelatedCatalogSection } from "@/components/song/song-related-catalog-section";
import { getCommunityMemberPreview } from "@/lib/data/community";
import { getOptionalUser } from "@/lib/data/user";
import { getAllSongIds, getSongDetail } from "@/lib/data/song-detail";
import { isTrackFavorited } from "@/lib/services/favorite.service";
import { isContentOnWatchlist } from "@/lib/services/watchlist.service";

interface SongPageProps {
  params: Promise<{ songid: string }>;
}

export async function generateStaticParams() {
  const ids = await getAllSongIds();
  return ids.map((songid) => ({ songid }));
}

export async function generateMetadata({
  params,
}: SongPageProps): Promise<Metadata> {
  const { songid } = await params;
  const song = await getSongDetail(songid);
  if (!song) return { title: "Song — AniVerse" };
  return {
    title: `${song.title} — AniVerse`,
    description: song.synopsis,
  };
}

export default async function SongDetailPage({ params }: SongPageProps) {
  const { songid } = await params;
  const viewer = await getOptionalUser();
  const [song, members] = await Promise.all([
    getSongDetail(songid, viewer?.id),
    getCommunityMemberPreview(),
  ]);

  if (!song) notFound();

  const initialFavorited = viewer?.id
    ? await isTrackFavorited(viewer.id, song.id)
    : false;

  const initialOnWatchlist =
    viewer?.id && song.sourceContentSlug
      ? await isContentOnWatchlist(viewer.id, song.sourceContentSlug)
      : false;

  return (
    <ContentDetailEngagementShell
      contentSlug={song.id}
      initialStats={song.engagementStats}
      initialFavorited={initialFavorited}
      initialOnWatchlist={initialOnWatchlist}
      favoriteApiPath={`/api/song/${encodeURIComponent(song.id)}/favorite`}
      trackPageView={false}
    >
    <div className="flex w-full flex-col gap-10 sm:gap-12 lg:gap-14">
      <ContentDetailHero
        content={song}
        initialFavorited={initialFavorited}
        initialOnWatchlist={initialOnWatchlist}
      />

      <ListenLinksSection
        heading="🎧 Listen to the full song"
        query={`${song.title} ${song.metadata.studio ?? ""}`.trim()}
        links={song.listenLinks ?? []}
      />

      <SongRelatedCatalogSection
        linkedArtist={song.linkedArtist}
        linkedSourceContent={song.linkedSourceContent}
      />

      <ContentPageSection
        title={`🎵 Songs/OSTs Similar To ${song.title}`}
        variant="content"
        autoAdvanceMs={4000}
        emptyMessage={`No similar songs or OSTs for ${song.title} yet.`}
        slides={song.featuredOsts.map((track) => ({
          id: track.id,
          node: <MusicCard track={track} />,
        }))}
      />

      <ContentPageSection
        title="📒 Included in collections"
        variant="community"
        emptyMessage={`${song.title} is not in any collections yet.`}
        slides={song.collections.map((collection) => ({
          id: collection.id,
          node: <CollectionCard collection={collection} />,
        }))}
      />

      <ContentPageSection
        title={`👥 Communities Involving ${song.title}`}
        variant="community"
        emptyMessage={`No communities linked to ${song.title} yet.`}
        slides={song.communities.map((community) => ({
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
        title={`✍️ Reviews Of ${song.title}`}
        reviews={song.reviews}
        targetType="song"
        targetSlug={song.id}
        viewerUserId={viewer?.id}
      />
    </div>
    </ContentDetailEngagementShell>
  );
}
