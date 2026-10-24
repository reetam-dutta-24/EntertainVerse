"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase, HERO_BTN_INTERACTIVE } from "@/lib/detail-route-ui";
import { AddToCollectionDialog } from "@/components/forms/add-to-collection-dialog";
import { useOptionalContentEngagement } from "@/components/content/content-engagement-context";

interface ContentHeroCollectionButtonProps {
  contentSlug: string;
  contentTitle: string;
  className?: string;
}

export function ContentHeroCollectionButton({
  contentSlug,
  contentTitle,
  className,
}: ContentHeroCollectionButtonProps) {
  const engagement = useOptionalContentEngagement();
  const [open, setOpen] = useState(false);

  function handleItemsAdded(count: number, collections?: number) {
    if (count <= 0) return;

    if (collections != null) {
      engagement?.applyCollections(collections);
    } else {
      void fetch(`/api/content/${encodeURIComponent(contentSlug)}/engagement`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { collections?: number } | null) => {
          if (data?.collections != null) {
            engagement?.applyCollections(data.collections);
          }
        })
        .catch(() => undefined);
    }

    engagement?.setToast(`Added to ${count} collection${count > 1 ? "s" : ""}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Add ${contentTitle} to a collection`}
        className={detailHeroBtnBase(
          cn(
            "border-transparent bg-gradient-blue-violet hover:border-brand-magenta hover:bg-transparent hover:[background-image:none]",
            HERO_BTN_INTERACTIVE,
            className,
          ),
        )}
      >
        <Plus className="size-3.5 shrink-0" />
        <span className="truncate">Add to collection</span>
      </button>

      <AddToCollectionDialog
        itemKind="content"
        itemSlug={contentSlug}
        itemTitle={contentTitle}
        open={open}
        onClose={() => setOpen(false)}
        onItemsAdded={handleItemsAdded}
      />
    </>
  );
}
