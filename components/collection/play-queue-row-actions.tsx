"use client";

import { useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import { FormShell } from "@/components/forms/form-shell";
import { cn } from "@/lib/utils";

interface PlayQueueRowActionsProps {
  onAddToQueue: () => void;
  onDelete?: () => boolean | Promise<boolean>;
  canDelete?: boolean;
  itemTitle?: string;
  collectionName?: string;
  addDisabled?: boolean;
  deleteLoading?: boolean;
  className?: string;
}

export function PlayQueueRowActions({
  onAddToQueue,
  onDelete,
  canDelete = false,
  itemTitle,
  collectionName,
  addDisabled = false,
  deleteLoading = false,
  className,
}: PlayQueueRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirmDelete() {
    if (!onDelete) return;
    const removed = await onDelete();
    if (removed) {
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-end gap-0.5 sm:gap-1",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          title="Add to queue"
          disabled={addDisabled}
          onClick={onAddToQueue}
          className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <ListPlus className="size-4" />
          <span className="sr-only">Add to queue</span>
        </button>
        {canDelete && onDelete ? (
          <button
            type="button"
            title="Remove from collection"
            disabled={deleteLoading}
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg p-1.5 text-white/45 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-30"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove from collection</span>
          </button>
        ) : null}
      </div>

      <FormShell
        open={confirmOpen}
        title="Remove from collection"
        description={
          itemTitle && collectionName
            ? `Do you want to delete "${itemTitle}" from "${collectionName}"?`
            : "Do you want to remove this item from the collection?"
        }
        onClose={() => !deleteLoading && setConfirmOpen(false)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/75">
            This removes the item from your collection playlist. The song or title
            itself stays in the catalog.
          </p>
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setConfirmOpen(false)}
              className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => void handleConfirmDelete()}
              className="rounded-full border border-red-600 bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </FormShell>
    </>
  );
}
