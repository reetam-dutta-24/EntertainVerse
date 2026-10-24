"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { cn } from "@/lib/utils";
import { COLLECTION_CARD_H } from "@/lib/card-dimensions";
import { getCommunityDetailPath } from "@/lib/community-routes";
import { getAccentStyle } from "@/lib/accents";
import type { Community } from "@/types";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { CardHeaderImage } from "@/components/cards/card-header-image";
import { DeleteCommunityButton } from "@/components/forms/delete-community-button";
import { EditCommunityButton } from "@/components/forms/edit-community-button";
import { cardDeleteActionClass, cardEditActionClass } from "@/lib/form-action-styles";

const activityLabels: Record<
  NonNullable<Community["activityLevel"]>,
  string
> = {
  "very-active": "🔥 Very Active",
  active: "🔥 Active",
  moderate: "Moderate",
  quiet: "Quiet",
};

function formatCount(count: number) {
  return count >= 1000
    ? `${Math.round(count / 1000)}K`
    : count.toLocaleString();
}

export interface CommunityCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  community: Community;
  /** Join for global discover rows; view for joined/favourite rows. */
  ctaMode?: "view" | "join";
  /** Landing page — visual demo only, no navigation or join actions. */
  demo?: boolean;
  onAction?: () => void;
}

/** Community card — same shell as collection cards for consistent grids/carousels. */
export function CommunityCard({
  community,
  ctaMode = "view",
  demo = false,
  onAction,
  className,
  ...props
}: CommunityCardProps) {
  const router = useAppRouter();
  const [hovered, setHovered] = useState(false);
  const accent = getAccentStyle(community.accent ?? "cyan");
  const showManage = community.canEdit || community.canDelete;
  const ctaLabel = ctaMode === "join" && !hovered ? "Join Community" : "View Community";

  function handleAction() {
    if (demo) return;
    if (onAction) {
      onAction();
      return;
    }
    router.push(getCommunityDetailPath(community.id));
  }

  const editValues = {
    slug: community.id,
    name: community.name,
    description: community.description,
    category: community.category,
    visibility: community.visibility,
    activityLevel: community.activityLevel,
    accent: community.accent,
    imageUrl: community.imageUrl,
    wallpaperUrl: community.wallpaperUrl,
    memberLimit: community.memberLimit,
    canDelete: community.canDelete,
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[180px] rounded-[20px] transition-shadow duration-500 ease-out",
        hovered && accent.glow,
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      <div
        className="flex flex-col items-center overflow-hidden rounded-[20px] bg-glass-purple"
        style={{
          height: showManage
            ? COLLECTION_CARD_H + 28
            : demo
              ? COLLECTION_CARD_H - 28
              : COLLECTION_CARD_H,
        }}
      >
        <CardHeaderImage
          imageUrl={community.imageUrl ?? community.wallpaperUrl}
          accentClass={accent.header}
        />

        <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-between gap-px bg-surface pb-2.5 shadow-card-inner">
          <div className="flex w-full flex-col items-center gap-px">
            <h3 className="line-clamp-2 px-2.5 pt-2.5 text-center text-sm font-semibold leading-tight text-white">
              {community.name}
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-1.5 px-1">
              <Chip variant="blue" className="h-5 text-[10px]">
                {formatCount(community.memberCount)} Members
              </Chip>
              <Chip variant="indigo" className="h-5 text-[10px]">
                {community.category}
              </Chip>
            </div>

            {(community.createdAt || community.lastActiveAt) ? (
              <div className="px-2 py-1">
                <Chip variant="brand" className="h-5 text-[10px]">
                  {community.lastActiveAt
                    ? `Last Active ${community.lastActiveAt}`
                    : `Created on ${community.createdAt}`}
                </Chip>
              </div>
            ) : null}

            {community.description ? (
              <p className="w-[165px] px-1 text-center text-[10px] font-normal text-white/90 line-clamp-2">
                {community.description}
              </p>
            ) : (
              <p className="w-[165px] px-1 text-center text-[10px] font-normal text-white/75 line-clamp-2">
                {activityLabels[community.activityLevel]}
              </p>
            )}

            <p className="flex w-[165px] justify-between px-1.5 py-1 text-[10px] font-normal text-white/90">
              <span className="truncate">
                {community.postCount.toLocaleString()} Posts
              </span>
              <span className="shrink-0">
                {showManage
                  ? "✏️ Manage"
                  : community.visibility === "private"
                    ? "🔒 Private"
                    : "🌍 Public"}
              </span>
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-1.5 px-2">
            {!demo ? (
              <Button
                variant="gradient"
                size="sm"
                className="h-6 w-[100px] shrink-0 rounded-full px-2 text-[9px] font-normal"
                onClick={handleAction}
              >
                {ctaLabel}
              </Button>
            ) : null}

            {showManage ? (
              <div className="flex w-full items-center justify-center gap-2">
                {community.canEdit ? (
                  <EditCommunityButton
                    community={editValues}
                    trigger={
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className={cardEditActionClass}
                      >
                        Edit
                      </button>
                    }
                  />
                ) : null}
                {community.canDelete ? (
                  <DeleteCommunityButton
                    communitySlug={community.id}
                    communityName={community.name}
                    trigger={
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className={cardDeleteActionClass}
                      >
                        Delete
                      </button>
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
