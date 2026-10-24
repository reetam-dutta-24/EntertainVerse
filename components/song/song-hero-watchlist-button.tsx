"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Clapperboard, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";
import {
  CatalogSearchPicker,
  type CatalogPickerSelection,
} from "@/components/forms/catalog-search-picker";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
} from "@/components/forms/form-shell";

interface SongHeroWatchlistButtonProps {
  sourceContentSlug?: string;
  sourceTitle?: string;
  initialOnWatchlist?: boolean;
  className?: string;
}

export function SongHeroWatchlistButton({
  sourceContentSlug,
  sourceTitle,
  initialOnWatchlist = false,
  className,
}: SongHeroWatchlistButtonProps) {
  const router = useAppRouter();
  const [onWatchlist, setOnWatchlist] = useState(initialOnWatchlist);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pick, setPick] = useState<CatalogPickerSelection | null>(null);
  const [dialogError, setDialogError] = useState<string>();
  const [dialogLoading, setDialogLoading] = useState(false);

  async function addSlug(contentSlug: string) {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentSlug,
        priority: "NORMAL",
        status: "PENDING",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : "Could not add to watchlist.",
      );
    }
    setOnWatchlist(true);
    router.refresh();
  }

  async function handleQuickAdd() {
    if (!sourceContentSlug) {
      setDialogOpen(true);
      return;
    }
    if (onWatchlist) return;

    setLoading(true);
    setError(undefined);
    try {
      await addSlug(sourceContentSlug);
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not add to watchlist.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDialogSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pick) {
      setDialogError("Search and select a show or movie to add.");
      return;
    }

    setDialogLoading(true);
    setDialogError(undefined);
    try {
      await addSlug(pick.id);
      setDialogOpen(false);
      setPick(null);
    } catch (submitError) {
      setDialogError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add to watchlist.",
      );
    } finally {
      setDialogLoading(false);
    }
  }

  const label = onWatchlist
    ? "On Watchlist"
    : sourceContentSlug
      ? "Add to watchlist"
      : "Add Show To Watchlist";

  return (
    <>
      <div className={cn("min-w-0", className)}>
        <button
          type="button"
          disabled={loading || onWatchlist}
          onClick={() => void handleQuickAdd()}
          title={
            sourceTitle
              ? `Add ${sourceTitle} to your watchlist`
              : "Add linked show or movie to your watchlist"
          }
          className={detailHeroBtnBase(
            "border-transparent bg-gradient-blue-violet hover:border-brand-magenta hover:bg-transparent hover:[background-image:none]",
          )}
        >
          {onWatchlist ? (
            <Clapperboard className="size-3.5 shrink-0" />
          ) : (
            <Plus className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </button>
        {error ? (
          <p className="mt-1 text-caption text-red-400">{error}</p>
        ) : null}
      </div>

      <FormShell
        open={dialogOpen}
        title="Add to watchlist"
        description="Pick the anime, movie, or show this track belongs to."
        onClose={() => {
          setDialogOpen(false);
          setPick(null);
          setDialogError(undefined);
        }}
      >
        <form onSubmit={handleDialogSubmit} className="flex flex-col gap-4">
          <FormField label="Search title">
            <CatalogSearchPicker
              allowedTypes={["content"]}
              value={pick}
              onChange={setPick}
              placeholder="Search anime, movies, shows…"
              showHint={false}
            />
          </FormField>
          <FormError message={dialogError} />
          <FormActions
            onCancel={() => {
              setDialogOpen(false);
              setPick(null);
            }}
            submitLabel="Add to watchlist"
            loading={dialogLoading}
          />
        </form>
      </FormShell>
    </>
  );
}
