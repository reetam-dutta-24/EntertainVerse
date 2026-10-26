import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Play } from "lucide-react";
import { CollectionCard, CommunityCard } from "@/components/cards";
import { CollectionDetailHero } from "@/components/collection";
import { ContentPageSection } from "@/components/content";
import {
  ContentCarouselSection,
  MusicCarouselSection,
  MusicGridSection,
  WatchlistGridSection,
} from "@/components/dashboard";
import { AddCollectionItemButton } from "@/components/forms/add-collection-item-button";
import { CollectionDetailOwnerActions } from "@/components/forms/collection-detail-owner-actions";
import { COLLECTION_MEDIA_COPY } from "@/lib/collection-media-copy";
import { getCollectionPlayPath } from "@/lib/collection-routes";
import { getCommunityMemberPreview } from "@/lib/data/community";
import { getOptionalUser } from "@/lib/data/user";
import {
  getCollectionDetail,
} from "@/lib/data/collection-detail";
import { isCollectionFavorited } from "@/lib/services/favorite.service";
import { isCollectionFollowed } from "@/lib/services/collection-follow.service";

interface CollectionPageProps {
  params: Promise<{ collectionid: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { collectionid } = await params;
  const collection = await getCollectionDetail(collectionid);
  if (!collection) return { title: "Collection — EntertainVerse" };
  return {
    title: `${collection.name} — EntertainVerse`,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({
  params,
}: CollectionPageProps) {
  const { collectionid } = await params;
  const viewer = await getOptionalUser();
  const [collection, members] = await Promise.all([
    getCollectionDetail(collectionid, viewer?.id),
    getCommunityMemberPreview(viewer?.id),
  ]);

  if (!collection) notFound();

  const isMusic = collection.collectionKind === "music";
  const copy = COLLECTION_MEDIA_COPY[isMusic ? "music" : "content"];
  const tracks = collection.musicTracks;

  const canManageCollection =
    !!viewer?.id && collection.ownerId === viewer.id;

  const isPublic = collection.visibility === "public";
  const canFollowCollection =
    !!viewer?.id && isPublic && !canManageCollection;

  const [initialFavorited, initialFollowing] = viewer?.id
    ? await Promise.all([
        isCollectionFavorited(viewer.id, collection.id),
        canFollowCollection
          ? isCollectionFollowed(viewer.id, collection.id)
          : Promise.resolve(false),
      ])
    : [false, false];

  const playInOrderAction = (
    <Link
      href={getCollectionPlayPath(collection.id)}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-magenta/70 bg-transparent px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-magenta/15"
    >
      <Play className="size-4 fill-current" />
      {isMusic ? "Listen in order" : "Watch in order"}
    </Link>
  );

  // Owner and editor collaborators; everyone else just browses.
  const addItemAction = collection.viewerCanEditItems ? (
    <AddCollectionItemButton
      collectionSlug={collection.id}
      collectionKind={collection.collectionKind ?? "content"}
      existingItemSlugs={
        isMusic
          ? tracks.map((track) => track.id)
          : collection.allItems.map((item) => item.id)
      }
    />
  ) : null;

  return (
    <div className="flex w-full flex-col gap-10 sm:gap-12 lg:gap-14">
      <CollectionDetailHero
        collection={collection}
        variant={isMusic ? "music" : "content"}
        favoriteTracks={isMusic ? tracks : undefined}
        initialFavorited={initialFavorited}
        canFavorite={Boolean(viewer?.id)}
        canManage={canManageCollection}
        canFollow={canFollowCollection}
        initialFollowing={initialFollowing}
        ownerActions={
          canManageCollection ? (
            <CollectionDetailOwnerActions collection={collection} />
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 sm:gap-12 sm:px-8 lg:gap-14 lg:px-12">
        {isMusic ? (
          <>
            <MusicGridSection
              title={copy.viewAllTitle}
              searchPlaceholder="Search tracks…"
              tracks={tracks}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {playInOrderAction}
                  {addItemAction}
                </div>
              }
            />

            <MusicCarouselSection
              title={copy.continueTitle}
              searchPlaceholder="Search tracks…"
              tracks={tracks.slice(0, 6)}
            />

            <MusicCarouselSection
              title={copy.mostPlayedTitle}
              searchPlaceholder="Search tracks…"
              tracks={[...tracks].reverse().slice(0, 6)}
            />
          </>
        ) : (
          <>
            <WatchlistGridSection
              title={copy.viewAllTitle}
              searchPlaceholder="Search items…"
              items={collection.allItems}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {playInOrderAction}
                  {addItemAction}
                </div>
              }
            />

            <ContentCarouselSection
              title={copy.continueTitle}
              searchPlaceholder="Search all items…"
              items={collection.continueWatching}
            />

            <ContentCarouselSection
              title={copy.mostPlayedTitle}
              searchPlaceholder="Search all items…"
              items={collection.watchedMost}
            />
          </>
        )}

        {isMusic ? (
          <MusicCarouselSection
            title={`🎵 Related Songs To ${collection.name}`}
            searchPlaceholder="Search tracks…"
            tracks={collection.similarTracks}
            emptyMessage={`No related songs for ${collection.name} yet.`}
          />
        ) : (
          <ContentCarouselSection
            title={`💡 Similar Content To ${collection.name}`}
            searchPlaceholder="Search titles…"
            items={collection.similarContent}
            emptyMessage={`No similar content for ${collection.name} yet.`}
          />
        )}

        <ContentPageSection
          title="📒 Similar collections"
          variant="community"
          emptyMessage="No similar collections found yet."
          slides={collection.similarCollections.map((entry) => ({
            id: entry.id,
            node: <CollectionCard collection={entry} />,
          }))}
        />

        <ContentPageSection
          title={`👥 Communities Involving ${collection.name}`}
          variant="community"
          emptyMessage={`No communities linked to ${collection.name} yet.`}
          slides={collection.communities.map((community) => ({
            id: community.id,
            node: (
              <CommunityCard
                community={community}
                ctaMode="join"
              />
            ),
          }))}
        />
      </div>
    </div>
  );
}
