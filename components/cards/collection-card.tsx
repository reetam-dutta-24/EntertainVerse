"use client";

import { Heart, Layers, Music, Users } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { getCollectionDetailPath } from "@/lib/collection-routes";
import type { Collection } from "@/types";
import { Button } from "@/components/ui/button";
import { TileCard, type TileStat } from "@/components/cards/tile-card";
import { DeleteCollectionButton } from "@/components/forms/delete-collection-button";
import { EditCollectionButton } from "@/components/forms/edit-collection-button";
import { cardDeleteActionClass, cardEditActionClass } from "@/lib/form-action-styles";

export interface CollectionCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  collection: Collection;
  /** Show edit/delete actions for collections the user owns. */
  editable?: boolean;
  /** Landing page — visual demo only, no navigation. */
  demo?: boolean;
  onView?: () => void;
}

/** Collection card — artwork, item/favourite/follower stats, View collection CTA. */
export function CollectionCard({
  collection,
  editable = false,
  demo = false,
  onView,
  ...props
}: CollectionCardProps) {
  const router = useAppRouter();
  const isMusic = collection.collectionKind === "music";

  function handleView() {
    if (demo) return;
    if (onView) {
      onView();
      return;
    }
    router.push(getCollectionDetailPath(collection.id));
  }

  const stats: TileStat[] = [
    { icon: isMusic ? Music : Layers, label: isMusic ? "Songs" : "Items", value: collection.itemCount },
    { icon: Heart, label: "Favourites", value: collection.favoriteCount },
  ];
  if (collection.visibility === "public") {
    stats.push({ icon: Users, label: "Followers", value: collection.followerCount ?? 0 });
  }

  return (
    <TileCard
      title={collection.name}
      imageUrl={collection.imageUrl}
      accent={collection.accent ?? "blue"}
      stats={stats}
      visibility={collection.visibility === "private" ? "private" : "public"}
      reason={collection.reason}
      description={
        collection.description ||
        (collection.updatedAt ? `Updated ${collection.updatedAt}` : `${collection.category} collection`)
      }
      cta={
        demo ? undefined : (
          <Button variant="gradient" size="sm" className="h-8 w-full rounded-full text-caption" onClick={handleView}>
            View collection
          </Button>
        )
      }
      manage={
        editable ? (
          <>
            <EditCollectionButton
              collection={{
                slug: collection.id,
                name: collection.name,
                description: collection.description,
                category: collection.category,
                genreLabelIds: collection.genreLabelIds,
                collectionKind: collection.collectionKind,
                visibility: collection.visibility,
                accent: collection.accent,
                imageUrl: collection.imageUrl,
              }}
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
            <DeleteCollectionButton
              collectionSlug={collection.id}
              collectionName={collection.name}
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
          </>
        ) : undefined
      }
      {...props}
    />
  );
}
