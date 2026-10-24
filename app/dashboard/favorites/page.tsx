import type { Metadata } from "next";
import { ArtistCard, CollectionCard, CommunityCard, MusicCard, PosterCard } from "@/components/cards";
import { WelcomeBanner } from "@/components/dashboard";
import { ContentPageSection } from "@/components/content/content-page-section";
import { getCurrentUser } from "@/lib/data/user";
import {
  countFavorites,
  getUserFavoritesCatalog,
  labelForFavoriteSection,
} from "@/lib/data/favorites";

export const metadata: Metadata = {
  title: "Favourites — AniVerse",
  description: "Your favourited anime, shows, movies, songs, artists, collections, and communities.",
};

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-6 text-center">
      <p className="text-sm text-white/65">No {label.toLowerCase()} in your favourites yet.</p>
    </div>
  );
}

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const catalog = await getUserFavoritesCatalog(user.id);
  const total = countFavorites(catalog);

  const sections = [
    {
      key: "anime" as const,
      title: `🎌 ${labelForFavoriteSection("anime")}`,
      items: catalog.anime,
      kind: "content" as const,
    },
    {
      key: "shows" as const,
      title: `📺 ${labelForFavoriteSection("shows")}`,
      items: catalog.shows,
      kind: "content" as const,
    },
    {
      key: "movies" as const,
      title: `🎬 ${labelForFavoriteSection("movies")}`,
      items: catalog.movies,
      kind: "content" as const,
    },
    {
      key: "documentaries" as const,
      title: `🎥 ${labelForFavoriteSection("documentaries")}`,
      items: catalog.documentaries,
      kind: "content" as const,
    },
    {
      key: "songs" as const,
      title: `🎵 ${labelForFavoriteSection("songs")}`,
      items: catalog.songs,
      kind: "song" as const,
    },
    {
      key: "artists" as const,
      title: `🎤 ${labelForFavoriteSection("artists")}`,
      items: catalog.artists,
      kind: "artist" as const,
    },
    {
      key: "collections" as const,
      title: `📒 ${labelForFavoriteSection("collections")}`,
      items: catalog.collections,
      kind: "collection" as const,
    },
    {
      key: "communities" as const,
      title: `👥 ${labelForFavoriteSection("communities")}`,
      items: catalog.communities,
      kind: "community" as const,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 sm:gap-5">
      <WelcomeBanner userName={user.name} variant="collections" />

      <section className="rounded-2xl bg-surface/40 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <h2 className="text-lg font-bold text-white sm:text-xl">❤️ Your Favourites</h2>
        <p className="mt-1 text-sm text-white/70">
          {total} saved across anime, shows, movies, music, artists, collections, and communities.
        </p>
      </section>

      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-2 sm:gap-2.5">
          <h3 className="px-1 text-base font-bold text-white sm:text-lg">{section.title}</h3>
          {section.items.length === 0 ? (
            <EmptySection label={labelForFavoriteSection(section.key)} />
          ) : section.kind === "content" ? (
            <ContentPageSection
              title=""
              variant="content"
              rowHover={false}
              slides={section.items.map((item) => ({
                id: item.id,
                node: <PosterCard item={item} />,
              }))}
              className="px-0"
            />
          ) : section.kind === "song" ? (
            <ContentPageSection
              title=""
              variant="content"
              rowHover={false}
              slides={section.items.map((track) => ({
                id: track.id,
                node: <MusicCard track={track} />,
              }))}
              className="px-0"
            />
          ) : section.kind === "artist" ? (
            <ContentPageSection
              title=""
              variant="content"
              rowHover={false}
              slides={section.items.map((artist) => ({
                id: artist.id,
                node: <ArtistCard item={artist} />,
              }))}
              className="px-0"
            />
          ) : section.kind === "collection" ? (
            <ContentPageSection
              title=""
              variant="community"
              rowHover={false}
              slides={section.items.map((collection) => ({
                id: collection.id,
                node: <CollectionCard collection={collection} />,
              }))}
              className="px-0"
            />
          ) : (
            <ContentPageSection
              title=""
              variant="community"
              rowHover={false}
              slides={section.items.map((community) => ({
                id: community.id,
                accent: community.accent,
                node: (
                  <CommunityCard community={community} ctaMode="view" />
                ),
              }))}
              className="px-0"
            />
          )}
        </section>
      ))}
    </div>
  );
}
