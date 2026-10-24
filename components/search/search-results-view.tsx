"use client";

import {
  CollectionGridSection,
  CommunityGridSection,
  ContentCarouselSection,
  MusicCarouselSection,
  MusicGridSection,
} from "@/components/dashboard";
import { SearchTopResult } from "@/components/search/search-top-result";
import { getCommunityMemberPreview } from "@/lib/data/community";
import type { SearchPageData } from "@/lib/search/types";
import { useEffect, useState } from "react";
import type { UserSummary } from "@/types";
import Link from "next/link";
import { getProfilePath } from "@/lib/profile-routes";

export interface SearchResultsViewProps {
  data: SearchPageData;
}

function ProfileResultsRow({
  profiles,
}: {
  profiles: SearchPageData["similarProfiles"];
}) {
  if (!profiles.length) return null;
  return (
    <section className="flex flex-col gap-4 px-2">
      <h2 className="text-lg font-bold text-white sm:text-heading">
        👤 Similar Profiles
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {profiles.map((profile) => (
          <Link
            key={profile.id}
            href={getProfilePath(profile.id)}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-glass-purple p-3 transition-colors hover:bg-glass-magenta"
          >
            <span
              className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-black"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {profile.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.portraitUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                profile.name.charAt(0)
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                {profile.name}
              </span>
              <span className="block truncate text-xs text-white/55">
                @{profile.handle}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Full `/search?q=` results layout — variant sections per primary type. */
export function SearchResultsView({ data }: SearchResultsViewProps) {
  const [members, setMembers] = useState<UserSummary[]>([]);

  useEffect(() => {
    getCommunityMemberPreview().then(setMembers);
  }, []);

  const queryLabel = data.query;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 pb-12 sm:gap-10">
      <SearchTopResult data={data} />

      {data.primaryType === "content" ? (
        <ContentCarouselSection
          title={`🎬 Content Similar To ${queryLabel}`}
          searchPlaceholder="Search All Items…"
          items={data.similarContent}
        />
      ) : null}

      {data.primaryType === "song" ? (
        <>
          <MusicCarouselSection
            title={`🎵 Songs/OSTs Similar To ${queryLabel}`}
            searchPlaceholder="Search tracks…"
            tracks={data.similarSongs}
          />
          <ContentCarouselSection
            title={data.topSong?.artist ? `🎤 Artists Similar To ${data.topSong.artist}` : "🎤 Similar Artists"}
            searchPlaceholder="Search artists…"
            items={data.similarArtists}
          />
        </>
      ) : null}

      {data.primaryType === "artist" ? (
        <>
          <MusicGridSection
            title="🎧 From music/OSTs"
            searchPlaceholder="Search tracks…"
            tracks={data.artistSongs}
          />
          <ContentCarouselSection
            title={`🎤 Artists Similar To ${queryLabel}`}
            searchPlaceholder="Search artists…"
            items={data.similarArtists}
          />
        </>
      ) : null}

      {data.primaryType === "profile" ? (
        <>
          <ContentCarouselSection
            title="❤️ Content they love"
            searchPlaceholder="Search titles…"
            items={data.similarContent}
          />
          <ProfileResultsRow profiles={data.similarProfiles} />
        </>
      ) : null}

      <CollectionGridSection
        title="📒 From your and other public collections"
        searchPlaceholder="Search collections…"
        collections={data.collections}
      />

      <CommunityGridSection
        title="👥 From your and other global communities"
        searchPlaceholder="Search communities…"
        communities={data.communities}
        ctaMode="view"
      />
    </div>
  );
}
