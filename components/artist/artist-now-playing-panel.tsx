"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { PlayCircle } from "lucide-react";
import { getArtistPlayPath } from "@/lib/artist-routes";
import { formatEngagementCount } from "@/lib/format-engagement";
import { cn } from "@/lib/utils";
import {
  detailHeroBtnBase,
  DETAIL_HERO_BTN_GROUP,
} from "@/lib/detail-route-ui";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { HdImage } from "@/components/ui/hd-image";
import { AddArtistTracksToCollectionDialog } from "@/components/forms/add-artist-tracks-to-collection-dialog";
import { ToggleArtistFavoriteButton } from "@/components/forms/toggle-artist-favorite-button";
import { ToggleArtistFollowButton } from "@/components/forms/toggle-artist-follow-button";
import type { UserSummary } from "@/types";

const PANEL_BTN =
  "h-8 w-[128px] px-2 text-caption sm:h-8 sm:w-[132px] sm:text-caption";

export interface ArtistNowPlayingPanelProps {
  artistSlug: string;
  imageUrl: string;
  artistName: string;
  trackSlugs: string[];
  connections: UserSummary[];
  connectionSummary?: string;
  followerCount?: number;
  initialFavorited?: boolean;
  initialFollowing?: boolean;
}

/** Right hero panel — artist banner, followers, and social CTAs. */
export function ArtistNowPlayingPanel({
  artistSlug,
  imageUrl,
  artistName,
  trackSlugs,
  connections,
  connectionSummary,
  followerCount = 0,
  initialFavorited = false,
  initialFollowing = false,
}: ArtistNowPlayingPanelProps) {
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [liveFollowerCount, setLiveFollowerCount] = useState(followerCount);
  useOnValueChange(followerCount, (next) => setLiveFollowerCount(next));

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(undefined), 2800);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const overflowLabel =
    liveFollowerCount > connections.length
      ? `....+${liveFollowerCount - connections.length}`
      : undefined;

  const followerLabel =
    liveFollowerCount === 1 ? "1 Follower" : `${formatEngagementCount(liveFollowerCount)} Followers`;

  function handleStatusChange(message: string, nextFollowerCount?: number) {
    setStatusMessage(message);
    if (typeof nextFollowerCount === "number") {
      setLiveFollowerCount(nextFollowerCount);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l border-cyan-400/20 bg-black shadow-[inset_0_0_40px_rgba(0,255,230,0.08)]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <HdImage
          src={imageUrl}
          alt={artistName}
          className="size-full object-cover object-center"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-black/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-black to-transparent"
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 px-4 pb-4 pt-2.5 sm:px-5 sm:pb-4">
        <p className="text-micro font-semibold uppercase tracking-wide text-white/55">
          {followerLabel}
        </p>

        {connections.length > 0 || connectionSummary ? (
          <div className="flex items-start gap-2.5">
            {connections.length > 0 ? (
              <AvatarStack
                users={connections}
                max={3}
                size="md"
                overflowLabel={overflowLabel}
                className="shrink-0"
              />
            ) : null}
            {connectionSummary ? (
              <p className="min-w-0 flex-1 text-left text-caption leading-relaxed text-white/80 sm:text-caption">
                {connectionSummary}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-caption leading-relaxed text-white/55 sm:text-caption">
            No followers yet. Be the first to follow {artistName}.
          </p>
        )}

        {statusMessage ? (
          <p
            role="status"
            className="rounded-lg border border-brand-magenta/30 bg-brand-magenta/10 px-2.5 py-1.5 text-center text-caption font-medium text-brand-pink"
          >
            {statusMessage}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-2.5 pt-0.5">
          <div className={DETAIL_HERO_BTN_GROUP}>
            <ToggleArtistFavoriteButton
              artistSlug={artistSlug}
              initialFavorited={initialFavorited}
              className={PANEL_BTN}
              onStatusChange={(message) => handleStatusChange(message)}
            />
          </div>

          <div className={DETAIL_HERO_BTN_GROUP}>
            <button
              type="button"
              onClick={() => setCollectionDialogOpen(true)}
              title={`Add all ${artistName} songs to your playlists`}
              className={detailHeroBtnBase(
                cn(
                  "h-8 flex-col gap-0 border-transparent bg-gradient-to-r from-blue-600 to-violet-600 py-1 text-white transition duration-200 hover:opacity-90 sm:h-8",
                  PANEL_BTN,
                ),
              )}
            >
              <span className="text-micro font-semibold leading-none">+ Add To</span>
              <span className="text-micro font-semibold leading-none">Collection</span>
            </button>

            <Link
              href={getArtistPlayPath(artistSlug)}
              title={`Play all ${artistName} songs in order`}
              className={detailHeroBtnBase(
                cn(
                  "border-2 border-brand-magenta bg-black/70 text-white transition duration-200 hover:bg-brand-magenta/10",
                  PANEL_BTN,
                ),
              )}
            >
              <PlayCircle className="size-3 shrink-0 text-brand-magenta" />
              <span className="truncate">Play playlist</span>
            </Link>
          </div>

          <div className={DETAIL_HERO_BTN_GROUP}>
            <ToggleArtistFollowButton
              artistSlug={artistSlug}
              artistName={artistName}
              initialFollowing={initialFollowing}
              className={PANEL_BTN}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      <AddArtistTracksToCollectionDialog
        artistName={artistName}
        trackSlugs={trackSlugs}
        open={collectionDialogOpen}
        onClose={() => setCollectionDialogOpen(false)}
      />
    </aside>
  );
}
