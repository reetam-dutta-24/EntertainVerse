"use client";
import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { getContentDetailPath } from "@/lib/content-routes";
import { getSongDetailPath } from "@/lib/song-routes";
import {
  detailHeroBtnBase,
  DETAIL_HERO_BTN_PAIR,
} from "@/lib/detail-route-ui";
import { ProfileEditForm } from "@/components/forms/profile-edit-form";
import { ToggleUserFriendButton } from "@/components/forms/toggle-user-friend-button";
import { MessageUserButton } from "@/components/forms/message-user-button";
import { ShareUrlButton } from "@/components/ui/share-url-button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Chip } from "@/components/ui/chip";
import type { UserProfileDetail } from "@/types";

const ACCENT_LINK =
  "font-semibold text-teal underline decoration-teal/80 underline-offset-2 transition-colors hover:text-teal-soft";

const GENRE_CHIP_KEYS = {
  Thriller: "mystery",
  Action: "action",
  Drama: "drama",
} as const;

export interface ProfileListeningPanelProps {
  profile: UserProfileDetail;
  isOwner?: boolean;
}

function PreferenceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[104px] shrink-0 text-left text-caption font-medium text-white sm:text-xs">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
        {children}
      </div>
    </div>
  );
}

/** Right hero panel — portrait, listening/watching status, followers, preferences, CTAs. */
export function ProfileListeningPanel({
  profile,
  isOwner = false,
}: ProfileListeningPanelProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [friendCount, setFriendCount] = useState(profile.followerCount);
  const [friendStatus, setFriendStatus] = useState(
    profile.viewerFriendStatus ?? "none",
  );
  const {
    portraitUrl,
    name: userName,
    handle,
    nowListening,
    currentlyWatching,
    followers,
    followerSummary,
    favoriteTypes,
    favoriteGenres,
    incomingFriendRequestId,
  } = profile;

  const friendText =
    followerSummary ??
    (friendCount > 0
      ? `${friendCount} friends`
      : undefined);

  return (
    <>
      <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-cyan-400/20 bg-black shadow-[inset_0_0_40px_rgba(0,255,230,0.08)]">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={portraitUrl}
            alt={userName}
            className="size-full object-cover object-top"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-l from-lime-300/20 via-transparent to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-black/25"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.42)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-black from-22% via-black/75 to-transparent"
          />
        </div>

        <div className="relative z-10 -mt-10 shrink-0 bg-black px-4 pb-3.5 pt-3 sm:-mt-12 sm:px-5 sm:pb-4">
          <div className="flex flex-col gap-3 sm:gap-3.5">
            <div className="space-y-0.5 text-center">
              {nowListening ? (
                <>
                  <p className="text-sm text-white sm:text-body">
                    Currently Listening To{" "}
                    {nowListening.songId ? (
                      <Link
                        href={getSongDetailPath(nowListening.songId)}
                        className={ACCENT_LINK}
                      >
                        {nowListening.title}
                      </Link>
                    ) : (
                      <span className={ACCENT_LINK}>{nowListening.title}</span>
                    )}
                  </p>
                  <p className="text-sm text-white sm:text-body">
                    By{" "}
                    {nowListening.artistId ? (
                      <Link
                        href={getArtistDetailPath(nowListening.artistId)}
                        className="font-medium text-white underline decoration-white/70 underline-offset-2 transition-colors hover:text-white/90"
                      >
                        {nowListening.artist}
                      </Link>
                    ) : (
                      <span className="font-medium text-white underline decoration-white/70 underline-offset-2">
                        {nowListening.artist}
                      </span>
                    )}
                  </p>
                </>
              ) : null}

              {currentlyWatching ? (
                <>
                  <p className="text-sm text-white sm:text-body">
                    {currentlyWatching.isActive ? "And Watching " : "Last Watched "}
                    <Link
                      href={getContentDetailPath(currentlyWatching.contentId)}
                      className="font-semibold underline decoration-white/70 underline-offset-2 transition-colors hover:text-white/90"
                    >
                      {currentlyWatching.title}
                    </Link>
                  </p>
                  {currentlyWatching.genres && currentlyWatching.genres.length > 0 ? (
                    <p className="text-sm text-white sm:text-body">
                      {currentlyWatching.genres.map((genre, index) => (
                        <span key={genre.id}>
                          {index > 0 ? ", " : null}
                          <span className={ACCENT_LINK}>{genre.label}</span>
                        </span>
                      ))}
                      {currentlyWatching.durationLabel ? (
                        <span className={ACCENT_LINK}>
                          {", "}
                          {currentlyWatching.durationLabel}
                        </span>
                      ) : null}
                    </p>
                  ) : currentlyWatching.episodeLabel ? (
                    <p className="text-sm">
                      <Link
                        href={getContentDetailPath(currentlyWatching.contentId)}
                        className={ACCENT_LINK}
                      >
                        {currentlyWatching.episodeLabel}
                      </Link>
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            {(followers.length > 0 || friendCount > 0) && friendText ? (
              <div className="flex items-center gap-2.5">
                <AvatarStack
                  users={followers}
                  max={3}
                  size="md"
                  overflowLabel={
                    friendCount > followers.length
                      ? `....+${friendCount - followers.length}`
                      : undefined
                  }
                />
                <p className="min-w-0 flex-1 text-left text-caption leading-snug text-white/80 sm:text-xs">
                  {friendText}
                </p>
              </div>
            ) : null}

            <div className="space-y-2.5">
              <PreferenceRow label="Favorite Types">
                {favoriteTypes.map((type) => (
                  <Chip
                    key={type}
                    chipKey="movie"
                    className="h-5 px-2.5 text-caption font-medium"
                  >
                    {type}
                  </Chip>
                ))}
              </PreferenceRow>

              <PreferenceRow label="Favorite Genre">
                {favoriteGenres.map((genre) => (
                  <Chip
                    key={genre}
                    chipKey={
                      GENRE_CHIP_KEYS[genre as keyof typeof GENRE_CHIP_KEYS] ??
                      "default"
                    }
                    className="h-5 px-2.5 text-caption font-medium"
                  >
                    {genre}
                  </Chip>
                ))}
              </PreferenceRow>
            </div>

            {isOwner ? (
              <div className={cn(DETAIL_HERO_BTN_PAIR, "justify-center pt-0.5")}>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className={detailHeroBtnBase(
                    "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
                  )}
                >
                  <Pencil className="size-3.5 shrink-0" />
                  <span className="truncate">Edit profile</span>
                </button>
                <ShareUrlButton
                  label="Share profile"
                  title={`${userName} on AniVerse`}
                  text={`Check out ${userName}'s profile on AniVerse`}
                />
              </div>
            ) : (
              <div className={cn(DETAIL_HERO_BTN_PAIR, "justify-center pt-0.5")}>
                <ToggleUserFriendButton
                  handle={handle}
                  initialStatus={friendStatus}
                  incomingFriendRequestId={incomingFriendRequestId}
                  onFriendCountChange={setFriendCount}
                  onStatusChange={setFriendStatus}
                />
                {friendStatus === "friends" ? (
                  <MessageUserButton handle={handle} name={userName} />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </aside>

      {isOwner ? (
        <ProfileEditForm
          open={editOpen}
          profile={profile}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </>
  );
}
