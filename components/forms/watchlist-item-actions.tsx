"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Trash2 } from "lucide-react";
import { SelectInput } from "@/components/forms/form-shell";
import { FormShell } from "@/components/forms/form-shell";
import { GradientButton } from "@/components/ui/gradient-button";
import { cardDeleteActionClass } from "@/lib/form-action-styles";
import type { ContentItem } from "@/types";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DROPPED", label: "Dropped" },
] as const;

export function WatchlistItemActions({ item }: { item: ContentItem }) {
  const router = useAppRouter();
  const [status, setStatus] = useState(item.watchlistStatus ?? "PENDING");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (!item.watchlistItemId) return null;

  async function handleStatusChange(nextStatus: string) {
    setStatusLoading(true);
    setError(undefined);

    const response = await fetch(`/api/watchlist/${item.watchlistItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json().catch(() => ({}));
    setStatusLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update status.");
      return;
    }

    setStatus(nextStatus as typeof status);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(`/api/watchlist/${item.watchlistItemId}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not remove from watchlist.");
      return;
    }

    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex w-full max-w-[160px] flex-col items-stretch gap-1.5">
        <SelectInput
          value={status}
          disabled={statusLoading}
          onChange={(event) => handleStatusChange(event.target.value)}
          className="h-8 py-1.5 text-caption"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className={`${cardDeleteActionClass} inline-flex items-center justify-center gap-1`}
        >
          <Trash2 className="size-3" />
          Remove
        </button>
        {error ? <p className="text-center text-caption text-red-400">{error}</p> : null}
      </div>

      <FormShell
        open={deleteOpen}
        title="Remove from Watchlist"
        description={`Remove "${item.title}" from your watchlist?`}
        onClose={() => !loading && setDeleteOpen(false)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/75">You can add this title back anytime from the catalog.</p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setDeleteOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <GradientButton
              size="sm"
              className="rounded-full border border-red-600 bg-red-600 px-5 hover:bg-red-500"
              disabled={loading}
              onClick={handleDelete}
            >
              {loading ? "Removing…" : "Remove"}
            </GradientButton>
          </div>
        </div>
      </FormShell>
    </>
  );
}
