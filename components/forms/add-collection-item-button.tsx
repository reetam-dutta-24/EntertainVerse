"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Plus } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  CatalogMultiSearchPicker,
  type CatalogPickerSelection,
} from "@/components/forms/catalog-search-picker";
import {
  FormActions,
  FormError,
  FormField,
  FormNotice,
  FormShell,
} from "@/components/forms/form-shell";
import type { SearchResultType } from "@/lib/search/types";

export function AddCollectionItemButton({
  collectionSlug,
  collectionKind = "content",
  existingItemSlugs = [],
}: {
  collectionSlug: string;
  collectionKind?: "content" | "music";
  existingItemSlugs?: string[];
}) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [selections, setSelections] = useState<CatalogPickerSelection[]>([]);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [loading, setLoading] = useState(false);

  const allowedTypes: SearchResultType[] =
    collectionKind === "music" ? ["song"] : ["content", "song"];

  const searchPlaceholder =
    collectionKind === "music"
      ? "Search songs, OSTs, albums…"
      : "Search anime, movies, shows, music…";

  function resetForm() {
    setSlugs([]);
    setSelections([]);
    setError(undefined);
    setNotice(undefined);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selections.length === 0) {
      setError("Search and select at least one item to add.");
      return;
    }

    setLoading(true);
    setError(undefined);
    setNotice(undefined);

    const failures: string[] = [];
    const duplicates: string[] = [];
    let added = 0;

    for (const selection of selections) {
      const body =
        selection.type === "song"
          ? { trackSlug: selection.id }
          : selection.type === "content"
            ? { contentSlug: selection.id }
            : null;

      if (!body) {
        failures.push(selection.title);
        continue;
      }

      const response = await fetch(`/api/collections/${collectionSlug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 409) {
        duplicates.push(selection.title);
        continue;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        failures.push(
          typeof data.error === "string"
            ? `${selection.title}: ${data.error}`
            : selection.title,
        );
        continue;
      }

      added += 1;
    }

    setLoading(false);

    if (added === 0 && duplicates.length > 0 && failures.length === 0) {
      setNotice(
        duplicates.length === 1
          ? `"${duplicates[0]}" is already in this collection.`
          : `These items are already in the collection: ${duplicates.join(", ")}.`,
      );
      return;
    }

    if (added === 0) {
      setError(failures[0] ?? "Could not add items.");
      return;
    }

    if (duplicates.length > 0) {
      setNotice(
        `Added ${added} item${added === 1 ? "" : "s"}. Skipped duplicates: ${duplicates.join(", ")}.`,
      );
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  const submitLabel =
    selections.length > 1
      ? `Add ${selections.length} Items`
      : "Add to collection";

  return (
    <>
      <GradientButton
        size="sm"
        className="gap-1.5 rounded-full px-5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add New Item
      </GradientButton>

      <FormShell
        open={open}
        title="Add to collection"
        description="Search and pick multiple titles — keep searching to add more before submitting."
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Search & add items">
            <CatalogMultiSearchPicker
              allowedTypes={allowedTypes}
              values={slugs}
              onChange={setSlugs}
              onSelectionsChange={setSelections}
              placeholder={searchPlaceholder}
              blockedIds={existingItemSlugs}
            />
          </FormField>

          <FormNotice message={notice} variant="warning" />
          <FormError message={error} />
          <FormActions
            onCancel={() => {
              setOpen(false);
              resetForm();
            }}
            submitLabel={submitLabel}
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}
