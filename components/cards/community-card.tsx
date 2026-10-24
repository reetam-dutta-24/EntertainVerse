"use client";

import { useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { getCommunityDetailPath } from "@/lib/community-routes";
import type { Community } from "@/types";
import { Button } from "@/components/ui/button";
import { TileCard } from "@/components/cards/tile-card";
import { DeleteCommunityButton } from "@/components/forms/delete-community-button";
import { EditCommunityButton } from "@/components/forms/edit-community-button";
import { cardDeleteActionClass, cardEditActionClass } from "@/lib/form-action-styles";

const activityLabels: Record<
  NonNullable<Community["activityLevel"]>,
  string
> = {
  "very-active": "Very active community",
  active: "Active community",
  moderate: "Moderately active",
  quiet: "Quiet community",
};

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
  ...props
}: CommunityCardProps) {
  const router = useAppRouter();
  const [ctaHovered, setCtaHovered] = useState(false);
  const showManage = community.canEdit || community.canDelete;
  const ctaLabel = ctaMode === "join" && !ctaHovered ? "Join community" : "View community";

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

  const lastActive = community.lastActiveAt ? ` · active ${community.lastActiveAt}` : "";

  return (
    <TileCard
      title={community.name}
      imageUrl={community.imageUrl ?? community.wallpaperUrl}
      accent={community.accent ?? "cyan"}
      stats={[
        { icon: Users, label: "Members", value: community.memberCount },
        { icon: MessageSquare, label: "Posts", value: community.postCount },
      ]}
      visibility={community.visibility === "private" ? "private" : "public"}
      reason={community.reason}
      description={
        community.description ||
        `${community.category} · ${activityLabels[community.activityLevel]}${lastActive}`
      }
      cta={
        demo ? undefined : (
          <Button
            variant="gradient"
            size="sm"
            className="h-8 w-full rounded-full text-caption"
            onClick={handleAction}
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
          >
            {ctaLabel}
          </Button>
        )
      }
      manage={
        showManage ? (
          <>
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
          </>
        ) : undefined
      }
      {...props}
    />
  );
}
