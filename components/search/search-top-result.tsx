"use client";

import { useAppRouter } from "@/hooks/use-app-router";
import { ArtistCard } from "@/components/cards/artist-card";
import { MusicCard } from "@/components/cards/music-card";
import { PosterCard } from "@/components/cards/poster-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { ProfileLink } from "@/components/profile/profile-link";
import { getProfilePath } from "@/lib/profile-routes";
import { sectionTintSeed } from "@/lib/card-theme";
import type { SearchPageData } from "@/lib/search/types";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchX } from "lucide-react";

export interface SearchTopResultProps {
  data: SearchPageData;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function TopResultRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 px-2">
      <h2 className="text-lg font-bold text-white sm:text-heading">
        🔍 Top Results For {label}
      </h2>
      <div className="flex flex-nowrap items-start gap-3 overflow-x-auto px-2 py-1 sm:gap-6">
        {children}
      </div>
    </section>
  );
}

/** Featured results — the same Poster/Music/Artist cards used across the app,
 *  showing every ranked match for the query (not just the single best hit). */
export function SearchTopResult({ data }: SearchTopResultProps) {
  const router = useAppRouter();
  const label = capitalize(data.query);
  const tintSeed = sectionTintSeed("search-top-results");

  if (data.primaryType === "song" && data.topSongMatches.length) {
    return (
      <TopResultRow label={label}>
        {data.topSongMatches.map((track) => (
          <MusicCard key={track.id} track={track} tintSeed={tintSeed} />
        ))}
      </TopResultRow>
    );
  }

  if (data.primaryType === "artist" && data.topArtistMatches.length) {
    return (
      <TopResultRow label={label}>
        {data.topArtistMatches.map((artist) => (
          <ArtistCard key={artist.id} item={artist} tintSeed={tintSeed} />
        ))}
      </TopResultRow>
    );
  }

  if (data.primaryType === "profile" && data.topProfile) {
    const profile = data.topProfile;
    return (
      <section className="flex flex-col items-center gap-4 px-2">
        <h2 className="w-full text-lg font-bold text-white sm:text-heading">
          🔍 Top Results For {label}
        </h2>
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-3xl border border-white/10 bg-glass-purple p-6 text-center shadow-card-inner">
          <ProfileLink
            handle={profile.handle ?? profile.id}
            name={profile.name}
          >
            <span
              className="flex size-20 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-black"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {profile.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.portraitUrl}
                  alt={profile.name}
                  className="size-full object-cover"
                />
              ) : (
                profile.name.charAt(0)
              )}
            </span>
          </ProfileLink>
          <div>
            <p className="text-xl font-bold text-white">{profile.name}</p>
            <p className="text-sm text-white/60">@{profile.handle}</p>
            {profile.bio ? (
              <p className="mt-2 text-sm text-white/70">{profile.bio}</p>
            ) : null}
          </div>
          <GradientButton
            size="md"
            className="rounded-full px-8"
            onClick={() => router.push(getProfilePath(profile.id))}
          >
            View profile
          </GradientButton>
        </div>
      </section>
    );
  }

  if (!data.topContentMatches.length) {
    return (
      <EmptyState
        compact
        icon={<SearchX />}
        title={`No exact matches for “${data.query}”`}
        description="Check the spelling, or browse similar picks below."
        action={{ href: "/dashboard/discover", label: "Browse Discover" }}
      />
    );
  }

  return (
    <TopResultRow label={label}>
      {data.topContentMatches.map((item) => (
        <PosterCard key={item.id} item={item} tintSeed={tintSeed} />
      ))}
    </TopResultRow>
  );
}
