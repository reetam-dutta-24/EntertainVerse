"use client";

import { useEffect, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { Check, FolderPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FormActions,
  FormError,
  FormField,
  FormNotice,
  FormShell,
  TextInput,
} from "@/components/forms/form-shell";
import type { Collection } from "@/types";

export type CollectionItemKind = "content" | "song";

function collectionKindForItem(itemKind: CollectionItemKind): "content" | "music" {
  return itemKind === "song" ? "music" : "content";
}

function collectionKindLabel(collection: Collection) {
  return collection.collectionKind === "music"
    ? "Music playlist"
    : "Shows & movies";
}

function filterCollectionsByQuery(collections: Collection[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return collections;
  return collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(q) ||
      collection.category?.toLowerCase().includes(q) ||
      collection.description?.toLowerCase().includes(q),
  );
}

interface AddToCollectionDialogProps {
  itemKind: CollectionItemKind;
  itemSlug: string;
  itemTitle: string;
  open: boolean;
  onClose: () => void;
  onItemsAdded?: (count: number, collections?: number) => void;
}

export function AddToCollectionDialog({
  itemKind,
  itemSlug,
  itemTitle,
  open,
  onClose,
  onItemsAdded,
}: AddToCollectionDialogProps) {
  const router = useAppRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<{
    message: string;
    variant: "success" | "warning";
  }>();

  const collectionKind = collectionKindForItem(itemKind);

  const filteredCollections = useMemo(
    () => filterCollectionsByQuery(collections, searchQuery),
    [collections, searchQuery],
  );

  useOnValueChange(open, (isOpen) => {
    if (!isOpen) return;
    setError(undefined);
    setNotice(undefined);
    setSelectedSlugs([]);
    setSearchQuery("");
    setLoadingList(true);
  });

  useEffect(() => {
    if (!open) return;

    fetch(`/api/collections?scope=mine&kind=${collectionKind}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Could not load your collections.",
          );
        }
        return response.json() as Promise<{ collections: Collection[] }>;
      })
      .then((data) => setCollections(data.collections))
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoadingList(false));
  }, [open, collectionKind]);

  function toggleCollection(slug: string) {
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((value) => value !== slug)
        : [...current, slug],
    );
    setError(undefined);
    setNotice(undefined);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedSlugs.length === 0) {
      setError("Select at least one collection to add this item to.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setNotice(undefined);

    const body =
      itemKind === "song"
        ? { trackSlug: itemSlug }
        : { contentSlug: itemSlug };

    const added: string[] = [];
    const duplicates: string[] = [];
    const failures: string[] = [];

    let latestCollections: number | undefined;

    for (const slug of selectedSlugs) {
      const collectionName =
        collections.find((collection) => collection.id === slug)?.name ?? slug;

      const response = await fetch(`/api/collections/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        duplicates.push(collectionName);
        continue;
      }

      if (!response.ok) {
        failures.push(
          typeof data.error === "string"
            ? `${collectionName}: ${data.error}`
            : collectionName,
        );
        continue;
      }

      added.push(collectionName);
      if (typeof data.collections === "number") {
        latestCollections = data.collections;
      }
    }

    setSubmitting(false);

    if (added.length === 0 && duplicates.length > 0 && failures.length === 0) {
      setNotice({
        message:
          duplicates.length === 1
            ? `"${itemTitle}" is already in ${duplicates[0]}.`
            : `"${itemTitle}" is already in: ${duplicates.join(", ")}.`,
        variant: "warning",
      });
      return;
    }

    if (added.length === 0) {
      setError(failures[0] ?? "Could not add to collections.");
      return;
    }

    let message = `Added "${itemTitle}" to ${added.join(", ")}.`;
    if (duplicates.length > 0) {
      message += ` Skipped duplicates: ${duplicates.join(", ")}.`;
    }
    if (failures.length > 0) {
      message += ` Failed: ${failures.join("; ")}.`;
    }

    setNotice({
      message,
      variant: failures.length > 0 ? "warning" : "success",
    });
    onItemsAdded?.(added.length, latestCollections);
    router.refresh();

    window.setTimeout(() => {
      onClose();
    }, 900);
  }

  const emptyMessage =
    itemKind === "content"
      ? "You have no show/movie collections yet. Create one from the Collections dashboard first."
      : "You have no music playlists yet. Create a music playlist from the Collections dashboard first.";

  const submitLabel =
    selectedSlugs.length > 1
      ? `Add to ${selectedSlugs.length} Collections`
      : "Add to Collection";

  return (
    <FormShell
      open={open}
      title="Add to Collection"
      description={`Choose one or more ${collectionKind === "music" ? "music playlists" : "content collections"} for "${itemTitle}".`}
      onClose={onClose}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {loadingList ? (
          <p className="text-sm text-white/55">Loading your collections…</p>
        ) : collections.length === 0 ? (
          <FormNotice variant="warning" message={emptyMessage} />
        ) : (
          <>
            <FormField
              label="Search collections"
              hint={
                itemKind === "content"
                  ? "Only show/movie collections are listed."
                  : "Only music playlists are listed."
              }
            >
              <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-popover px-3 py-2.5 transition focus-within:border-brand-magenta/60 focus-within:ring-1 focus-within:ring-brand-magenta/30">
                <Search className="size-4 shrink-0 text-white/45" />
                <TextInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, category, or description…"
                  className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 focus:ring-0"
                />
              </label>
            </FormField>

            <FormField
              label="Select collections"
              hint={
                selectedSlugs.length > 0
                  ? `${selectedSlugs.length} selected — tap to toggle.`
                  : "Select one or more collections."
              }
            >
              {filteredCollections.length === 0 ? (
                <p className="text-sm text-white/55">
                  No collections match &ldquo;{searchQuery}&rdquo;.
                </p>
              ) : (
                <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-0.5">
                  {filteredCollections.map((collection) => {
                    const selected = selectedSlugs.includes(collection.id);
                    return (
                      <li key={collection.id}>
                        <button
                          type="button"
                          onClick={() => toggleCollection(collection.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                            selected
                              ? "border-brand-magenta/60 bg-brand-magenta/10 ring-1 ring-brand-magenta/30"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
                          )}
                        >
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-black/40">
                            {collection.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={collection.imageUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <span className="flex size-full items-center justify-center text-xs font-bold text-white/60">
                                {collection.name.charAt(0)}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">
                              {collection.name}
                            </span>
                            <span className="block truncate text-xs text-white/55">
                              {collectionKindLabel(collection)} · {collection.itemCount}{" "}
                              {collection.collectionKind === "music" ? "songs" : "items"}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-full border transition",
                              selected
                                ? "border-brand-magenta bg-brand-magenta text-white"
                                : "border-white/25 bg-transparent text-transparent",
                            )}
                          >
                            <Check className="size-3.5" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormField>
          </>
        )}

        <FormNotice message={notice?.message} variant={notice?.variant} />
        <FormError message={error} />

        <FormActions
          onCancel={onClose}
          submitLabel={submitLabel}
          loading={submitting}
        />
      </form>
    </FormShell>
  );
}

interface CardAddToCollectionButtonProps {
  itemKind: CollectionItemKind;
  itemSlug: string;
  itemTitle: string;
  className?: string;
}

export function CardAddToCollectionButton({
  itemKind,
  itemSlug,
  itemTitle,
  className,
}: CardAddToCollectionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-1 rounded-full border border-brand-purple/70 px-2 py-0.5 text-micro font-normal text-white transition-colors hover:bg-brand-purple/15",
          className,
        )}
      >
        <FolderPlus className="size-3 text-brand-purple" />
        Add to Collection
      </button>

      <AddToCollectionDialog
        itemKind={itemKind}
        itemSlug={itemSlug}
        itemTitle={itemTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
