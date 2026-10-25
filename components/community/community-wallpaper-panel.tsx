"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  detailHeroBtnBase,
  DETAIL_HERO_BTN_GROUP,
  DETAIL_HERO_BTN_PAIR,
} from "@/lib/detail-route-ui";
import { ShareUrlButton } from "@/components/ui/share-url-button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Chip } from "@/components/ui/chip";
import { CommunityJoinAction } from "@/components/community/community-join-action";
import type { UserSummary } from "@/types";

export interface CommunityWallpaperPanelProps {
  communitySlug: string;
  wallpaperUrl: string;
  communityName: string;
  members: UserSummary[];
  memberSummary?: string;
  collectionCount?: number;
  popularityLabel?: string;
  globalRankLabel?: string;
  isMember?: boolean;
}

/** Right hero panel — wallpaper, member stats, join CTAs. */
export function CommunityWallpaperPanel({
  communitySlug,
  wallpaperUrl,
  communityName,
  members,
  memberSummary,
  collectionCount,
  popularityLabel,
  globalRankLabel,
  isMember = false,
}: CommunityWallpaperPanelProps) {
  const overflowCount = Math.max(0, members.length - 3);
  const overflowLabel =
    overflowCount > 0 ? `...+${overflowCount}` : undefined;

  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-cyan-400/20 bg-black shadow-[inset_0_0_40px_rgba(0,255,230,0.08)]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wallpaperUrl}
          alt={communityName}
          className="size-full object-cover object-top"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-lime-300/15 via-transparent to-transparent"
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
          <div className={cn(DETAIL_HERO_BTN_PAIR, "justify-center")}>
            <button
              type="button"
              className={detailHeroBtnBase(
                "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
              )}
            >
              <Pencil className="size-3.5 shrink-0" />
              <span className="truncate">Edit wallpaper</span>
            </button>
            <ShareUrlButton
              label="Share community"
              title={communityName}
              text={`Join ${communityName} on EntertainVerse`}
            />
          </div>

          {members.length > 0 ? (
            <div className="flex items-center justify-center gap-2.5">
              <AvatarStack
                users={members}
                max={3}
                size="md"
                overflowLabel={overflowLabel}
              />
              {memberSummary ? (
                <p className="text-caption font-medium text-white/85 sm:text-xs">
                  {memberSummary}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-2">
            {collectionCount != null ? (
              <Chip variant="indigo" className="h-6 px-3 text-caption">
                {collectionCount} items in collections
              </Chip>
            ) : null}
            {popularityLabel ? (
              <Chip chipKey="action" className="h-6 px-3 text-caption">
                {popularityLabel}
              </Chip>
            ) : null}
            {globalRankLabel ? (
              <Chip variant="brand" className="h-6 px-3 text-caption">
                {globalRankLabel}
              </Chip>
            ) : null}
          </div>

          <CommunityJoinAction
            communitySlug={communitySlug}
            isMember={isMember}
          />

          <div className={DETAIL_HERO_BTN_GROUP}>
            <button
              type="button"
              className={detailHeroBtnBase(
                "border-transparent bg-gradient-to-r from-blue-600 to-violet-600 text-white",
              )}
            >
              <span className="truncate">Connect on Discord</span>
            </button>
            <button
              type="button"
              className={detailHeroBtnBase(
                "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
              )}
            >
              <span className="truncate">View community Background</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
