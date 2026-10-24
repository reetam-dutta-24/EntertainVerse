"use client";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { getCollectionPlayPath } from "@/lib/collection-routes";
import {
  COLLECTION_MEDIA_COPY,
  type CollectionMediaVariant,
} from "@/lib/collection-media-copy";
import {
  detailHeroBtnBase,
  DETAIL_HERO_BTN_GROUP,
  DETAIL_HERO_BTN_GROUP_COMPACT,
  DETAIL_HERO_BTN_ACCENT_SOLID,
} from "@/lib/detail-route-ui";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { HdImage } from "@/components/ui/hd-image";
import { ToggleCollectionFavoriteButton } from "@/components/forms/toggle-collection-favorite-button";
import { ToggleCollectionFollowButton } from "@/components/forms/toggle-collection-follow-button";
import { AddCollectionCollaboratorButton } from "@/components/forms/add-collection-collaborator-button";
import type { CollectionCurrentActivity, UserSummary } from "@/types";

export interface CollectionActivityPanelProps {
  activity?: CollectionCurrentActivity;
  fallbackImageUrl?: string;
  fallbackTitle?: string;
  contributors: UserSummary[];
  contributorSummary?: string;
  variant?: CollectionMediaVariant;
  collectionSlug?: string;
  initialFavorited?: boolean;
  canFavorite?: boolean;
  canManage?: boolean;
  canFollow?: boolean;
  initialFollowing?: boolean;
  collectionName?: string;
}

/** Right hero panel — image + CTAs capped to hero height. */
export function CollectionActivityPanel({
  activity,
  fallbackImageUrl,
  fallbackTitle,
  contributors,
  contributorSummary,
  variant = "content",
  collectionSlug,
  initialFavorited,
  canFavorite = true,
  canManage = false,
  canFollow = false,
  initialFollowing = false,
  collectionName,
}: CollectionActivityPanelProps) {
  const copy = COLLECTION_MEDIA_COPY[variant];
  const wallpaperImageUrl = fallbackImageUrl || activity?.imageUrl || "";
  const title = activity?.title ?? fallbackTitle ?? "Featured";

  return (
    <aside className="flex h-full min-h-0 max-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden bg-black">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {wallpaperImageUrl ? (
          <HdImage
            src={wallpaperImageUrl}
            alt={title}
            className="size-full object-cover object-top"
          />
        ) : (
          <div
            aria-hidden
            className="size-full bg-gradient-to-br from-brand-purple/30 via-popover to-black"
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/25 via-transparent to-black/30"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-black to-transparent"
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 px-4 pb-4 pt-2 sm:gap-3 sm:px-5 sm:pb-5">
        {activity ? (
          <div className="space-y-1.5 text-center">
            <h2 className="text-base font-bold leading-snug text-white sm:text-lg">
              {activity.statusLabel}
            </h2>
            <p className="text-sm text-white/85">
              {activity.episodeLabel && activity.seasonLabel
                ? `${activity.episodeLabel}  ${activity.seasonLabel}`
                : activity.progressLabel}
            </p>
          </div>
        ) : null}

        <div className="flex w-full flex-col items-center gap-2">
          <div className={DETAIL_HERO_BTN_GROUP_COMPACT}>
            <AddCollectionCollaboratorButton
              collectionSlug={collectionSlug ?? ""}
              canManage={canManage && Boolean(collectionSlug)}
            />

            {collectionSlug && canFavorite ? (
              <ToggleCollectionFavoriteButton
                collectionSlug={collectionSlug}
                initialFavorited={initialFavorited}
              />
            ) : null}

            {collectionSlug && canFollow ? (
              <ToggleCollectionFollowButton
                collectionSlug={collectionSlug}
                collectionName={collectionName ?? fallbackTitle ?? "Collection"}
                initialFollowing={initialFollowing}
              />
            ) : null}
          </div>
        </div>

        {contributors.length > 0 ? (
          <div className="flex items-center gap-3 py-1">
            <AvatarStack users={contributors} max={3} size="md" />
            {contributorSummary ? (
              <p className="min-w-0 flex-1 text-left text-caption leading-relaxed text-white/80 sm:text-xs">
                {contributorSummary}
              </p>
            ) : null}
          </div>
        ) : null}

        {collectionSlug ? (
          <div className={DETAIL_HERO_BTN_GROUP}>
            <Link
              href={getCollectionPlayPath(collectionSlug)}
              className={detailHeroBtnBase(DETAIL_HERO_BTN_ACCENT_SOLID)}
            >
              <PlayCircle className="size-4 shrink-0" />
              <span className="truncate">{copy.playOrderCta}</span>
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
