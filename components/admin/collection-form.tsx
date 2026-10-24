"use client";

import { useMemo, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useFormDraft } from "@/hooks/use-form-draft";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  ACCENT_OPTIONS,
  CONTENT_GENRE_OPTIONS,
  SONG_GENRE_OPTIONS,
} from "@/lib/catalog-enums";
import { Field, Section, inputClass } from "@/components/admin/catalog-nested-fields";
import { EnumMultiSelect, EnumSelect } from "@/components/admin/enum-selectors";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import {
  CatalogMultiSearchPicker,
  type CatalogPickerSelection,
} from "@/components/forms/catalog-search-picker";
import type { SearchResultType } from "@/lib/search/types";
import {
  collectionCategories,
  collectionKinds,
} from "@/lib/validators/collection";
import type { AdminCollectionFormInput } from "@/lib/validators/admin/collection";

export interface CollectionFormProps {
  mode: "create" | "edit";
  recordId?: string;
  initial: AdminCollectionFormInput;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CollectionForm({ mode, recordId, initial }: CollectionFormProps) {
  const router = useAppRouter();
  const draftKey =
    mode === "create"
      ? "aniverse:admin:collection:create"
      : `aniverse:admin:collection:edit:${recordId}`;
  const { form, setForm, clearDraft, draftRestored } = useFormDraft<AdminCollectionFormInput>(
    draftKey,
    initial,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const genreOptions =
    form.kind === "music" ? SONG_GENRE_OPTIONS : CONTENT_GENRE_OPTIONS;

  const itemValues = useMemo(
    () => [...form.contentSlugs, ...form.trackSlugs],
    [form.contentSlugs, form.trackSlugs],
  );

  const itemTypeHints = useMemo(() => {
    const hints: Record<string, SearchResultType> = {};
    for (const slug of form.contentSlugs) hints[slug] = "content";
    for (const slug of form.trackSlugs) hints[slug] = "song";
    return hints;
  }, [form.contentSlugs, form.trackSlugs]);

  function applyItemSelections(selections: CatalogPickerSelection[]) {
    setForm((current) => ({
      ...current,
      contentSlugs: selections
        .filter((selection) => selection.type === "content")
        .map((selection) => selection.id),
      trackSlugs: selections
        .filter((selection) => selection.type === "song")
        .map((selection) => selection.id),
    }));
  }

  function applyItemSlugs(slugs: string[]) {
    applyItemSelections(
      slugs.map((id) => ({
        id,
        type: itemTypeHints[id] ?? "content",
        title: id,
      })),
    );
  }

  function update<K extends keyof AdminCollectionFormInput>(
    key: K,
    value: AdminCollectionFormInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleKindChange(kind: AdminCollectionFormInput["kind"]) {
    const allowed = new Set<string>(
      (kind === "music" ? SONG_GENRE_OPTIONS : CONTENT_GENRE_OPTIONS).map(
        (option) => option.value,
      ),
    );
    setForm((current) => ({
      ...current,
      kind,
      genreLabels: current.genreLabels.filter((value) => allowed.has(value)),
      contentSlugs: kind === "music" ? [] : current.contentSlugs,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const url =
        mode === "create"
          ? "/api/admin/collections"
          : `/api/admin/collections/${recordId}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save collection.");
        return;
      }
      clearDraft();
      router.push("/admin/collections");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-6">
      {draftRestored ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          Restored your unsaved draft from this browser.
        </p>
      ) : null}
      <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100/80">
        Global collections are public by default and owned by your admin account. Add catalog items below — search picks content and songs separately.
      </p>

      <Section title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => {
                update("name", event.target.value);
                if (!slugTouched) update("slug", slugify(event.target.value));
              }}
              required
            />
          </Field>
          <Field label="Slug">
            <input
              className={inputClass}
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                update("slug", event.target.value);
              }}
              required
            />
          </Field>
          <Field label="Collection type">
            <select
              className={inputClass}
              value={form.kind}
              onChange={(event) =>
                handleKindChange(event.target.value as AdminCollectionFormInput["kind"])
              }
            >
              {collectionKinds.map((kind) => (
                <option key={kind} value={kind} className="bg-popover">
                  {kind === "music" ? "Music playlist" : "Shows & movies"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={form.category}
              onChange={(event) =>
                update("category", event.target.value as AdminCollectionFormInput["category"])
              }
            >
              {collectionCategories.map((category) => (
                <option key={category} value={category} className="bg-popover">
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <EnumMultiSelect
            label="Genre tags"
            values={form.genreLabels}
            options={genreOptions}
            onChange={(genreLabels) => update("genreLabels", genreLabels)}
          />
          <EnumSelect
            label="Visibility"
            hint="Admin global collections are usually public"
            value={form.visibility}
            options={[
              { value: "PUBLIC", label: "Public" },
              { value: "PRIVATE", label: "Private" },
            ]}
            onChange={(visibility) =>
              update("visibility", visibility as AdminCollectionFormInput["visibility"])
            }
          />
          <EnumSelect
            label="Accent"
            value={form.accent ?? "blue"}
            options={ACCENT_OPTIONS}
            onChange={(accent) =>
              update("accent", accent as AdminCollectionFormInput["accent"])
            }
          />
        </div>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-28 py-2`}
            value={form.description ?? ""}
            onChange={(event) => update("description", event.target.value)}
          />
        </Field>
      </Section>

      <Section title="Cover">
        <Field label="Cover image">
          <ImageUploadInput
            value={form.imageUrl ?? ""}
            onChange={(value) => update("imageUrl", value)}
            inputClassName={inputClass}
          />
        </Field>
      </Section>

      <Section title="Items">
        {form.kind === "music" ? (
          <Field label="Tracks" hint="Search and add songs or OSTs to this playlist.">
            <CatalogMultiSearchPicker
              allowedTypes={["song"]}
              values={form.trackSlugs}
              onChange={(trackSlugs) => update("trackSlugs", trackSlugs)}
              typeHints={itemTypeHints}
              placeholder="Search songs and OSTs…"
              adminSearch
              resultLimit={40}
              maxItems={48}
            />
          </Field>
        ) : (
          <Field
            label="Catalog items"
            hint="Add anime, movies, shows, and music tracks to this collection."
          >
            <CatalogMultiSearchPicker
              allowedTypes={["content", "song"]}
              values={itemValues}
              onChange={applyItemSlugs}
              onSelectionsChange={applyItemSelections}
              typeHints={itemTypeHints}
              placeholder="Search catalog titles…"
              adminSearch
              resultLimit={40}
              maxItems={48}
            />
          </Field>
        )}
      </Section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-3">
        <GradientButton type="submit" disabled={pending} className="rounded-full px-6">
          {pending ? "Saving…" : mode === "create" ? "Create collection" : "Save changes"}
        </GradientButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
