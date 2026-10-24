"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase, DETAIL_HERO_BTN_COMPACT } from "@/lib/detail-route-ui";
import { UserHandleSearchInput } from "@/components/forms/user-handle-search-input";

interface AddCollectionCollaboratorButtonProps {
  collectionSlug: string;
  canManage?: boolean;
  className?: string;
}

export function AddCollectionCollaboratorButton({
  collectionSlug,
  canManage = false,
  className,
}: AddCollectionCollaboratorButtonProps) {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  if (!canManage) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await fetch(
        `/api/collections/${encodeURIComponent(collectionSlug)}/collaborators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: handle.trim() }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not add collaborator.",
        );
      }
      setMessage(
        data.added
          ? `Added ${data.collaborator?.name ?? handle} as collaborator.`
          : `${data.collaborator?.name ?? handle} is already a collaborator.`,
      );
      setHandle("");
      setOpen(false);
    } catch (submitError) {
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : "Could not add collaborator.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={detailHeroBtnBase(
          cn(
            DETAIL_HERO_BTN_COMPACT,
            "border-transparent bg-gradient-to-r from-blue-600 to-violet-600 text-white",
          ),
        )}
      >
        <Plus className="size-3.5 shrink-0" />
        <span className="truncate">Add Collaborators</span>
      </button>
      {open ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="absolute left-1/2 z-20 mt-2 w-[min(100%,240px)] -translate-x-1/2 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/90 p-3 shadow-xl"
        >
          <UserHandleSearchInput
            value={handle}
            onChange={setHandle}
            placeholder="Search user handles…"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className="rounded-lg bg-brand-pink/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add"}
          </button>
        </form>
      ) : null}
      {message ? (
        <p className="mt-1 text-center text-caption text-white/70">{message}</p>
      ) : null}
    </div>
  );
}
