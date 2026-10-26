import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistCard, CollectionCard, CommunityCard } from "@/components/cards";
import { ArtistDetailHero, ArtistKpiSection } from "@/components/artist";
import {
  ContentCharacterCard,
  ContentPageSection,
  InteractiveReviewSection,
} from "@/components/content";
import { MusicCarouselSection, MusicGridSection } from "@/components/dashboard";
import { ListenLinksSection } from "@/components/song/listen-links-section";
import { getArtistDetail } from "@/lib/data/artist-detail";
import { getCommunityMemberPreview } from "@/lib/data/community";
import { getOptionalUser } from "@/lib/data/user";

interface ArtistPageProps {
  params: Promise<{ artistid: string }>;
}

export async function generateMetadata({
  params,
}: ArtistPageProps): Promise<Metadata> {
  const { artistid } = await params;
  const artist = await getArtistDetail(artistid);
  if (!artist) return { title: "Artist — EntertainVerse" };
  return {
    title: `${artist.title} — EntertainVerse`,
    description: artist.synopsis,
  };
}

export default async function ArtistDetailPage({ params }: ArtistPageProps) {
  const { artistid } = await params;
  const viewer = await getOptionalUser();
  const [artist, members] = await Promise.all([
    getArtistDetail(artistid, viewer?.id),
    getCommunityMemberPreview(),
  ]);

  if (!artist) notFound();

  const showBandMembers = artist.members.length > 0;

  return (
    <div className="flex w-full flex-col">
      <ArtistDetailHero artist={artist} />
      <ArtistKpiSection stats={artist.engagementStats} />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pt-6 sm:gap-12 sm:px-8 sm:pt-8 lg:gap-14 lg:px-12">
        <ListenLinksSection
          heading={`🎧 Listen to ${artist.title}`}
          query={artist.title}
          links={artist.listenLinks ?? []}
          inset={false}
        />

        <MusicGridSection
          title={`🎵 All ${artist.title} Songs`}
          searchPlaceholder="Search tracks…"
          tracks={artist.allSongs}
        />

        <MusicCarouselSection
          title={`▶️ Most Played ${artist.title} Songs`}
          searchPlaceholder="Search tracks…"
          tracks={artist.mostPlayed}
        />

        <MusicCarouselSection
          title={`❤️ Most Liked ${artist.title} Songs`}
          searchPlaceholder="Search tracks…"
          tracks={artist.mostLiked}
        />

        <MusicCarouselSection
          title={`💿 Most Popular ${artist.title} Albums`}
          searchPlaceholder="Search albums…"
          tracks={artist.albums}
        />

        {showBandMembers ? (
          <ContentPageSection
            title={`👥 ${artist.title} Band Members`}
            variant="content"
            rowHover={false}
            itemsPerPage={5}
            overflowVisible
            itemsCenter
            emptyMessage="No band members listed for this artist."
            slides={artist.members.map((member) => ({
              id: member.id,
              node: (
                <ContentCharacterCard
                  character={member}
                  contentId={artist.id}
                  contentAccent={artist.accent}
                  interactive={false}
                />
              ),
            }))}
          />
        ) : null}

        <ContentPageSection
          title={`🎤 Artists Similar To ${artist.title}`}
          variant="content"
          emptyMessage={`No similar artists to ${artist.title} yet.`}
          slides={artist.similarArtists.map((entry) => ({
            id: entry.id,
            node: <ArtistCard item={entry} />,
          }))}
        />

        <ContentPageSection
          title="📀 EP collections"
          variant="community"
          emptyMessage={`No collections featuring ${artist.title} yet.`}
          slides={artist.collections.map((collection) => ({
            id: collection.id,
            node: <CollectionCard collection={collection} />,
          }))}
        />

        <ContentPageSection
          title={`👥 Communities Involving ${artist.title}`}
          variant="community"
          emptyMessage={`No communities linked to ${artist.title} yet.`}
          slides={artist.communities.map((community) => ({
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
          title={`✍️ Reviews Of ${artist.title}`}
          reviews={artist.reviews}
          targetType="artist"
          targetSlug={artist.id}
          viewerUserId={viewer?.id}
        />
      </div>
    </div>
  );
}
