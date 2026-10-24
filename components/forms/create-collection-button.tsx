"use client";

import { useMemo, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Plus } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  FormTagMultiSelect,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/forms/form-shell";
import { CatalogMultiSearchPicker } from "@/components/forms/catalog-search-picker";
import { ACCENT_OPTIONS, CONTENT_GENRE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import {
  collectionCategories,
  collectionKinds,
} from "@/lib/validators/collection";
import { slugify } from "@/lib/slugify";

export function CreateCollectionButton() {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<(typeof collectionCategories)[number]>("Anime");
  const [genreLabels, setGenreLabels] = useState<string[]>([]);
  const [kind, setKind] = useState<(typeof collectionKinds)[number]>("content");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [accent, setAccent] = useState("blue");
  const [imageUrl, setImageUrl] = useState("");
  const [contentSlugs, setContentSlugs] = useState<string[]>([]);
  const [trackSlugs, setTrackSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const genreOptions =
    kind === "music" ? SONG_GENRE_OPTIONS : CONTENT_GENRE_OPTIONS;

  function handleKindChange(nextKind: (typeof collectionKinds)[number]) {
    setKind(nextKind);
    const allowed = new Set(
      (nextKind === "music" ? SONG_GENRE_OPTIONS : CONTENT_GENRE_OPTIONS).map(
        (option) => option.value,
      ),
    );
    setGenreLabels((current) =>
      current.filter((value) => allowed.has(value as never)),
    );
  }

  const slugPreview = useMemo(
    () => slug.trim() || slugify(name || "my-collection"),
    [name, slug],
  );

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setCategory("Anime");
    setGenreLabels([]);
    setKind("content");
    setVisibility("PRIVATE");
    setAccent("blue");
    setImageUrl("");
    setContentSlugs([]);
    setTrackSlugs([]);
    setError(undefined);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slugPreview,
        description,
        category,
        genreLabels,
        kind,
        visibility,
        accent,
        imageUrl: imageUrl || undefined,
        initialContentSlugs: contentSlugs,
        initialTrackSlugs: trackSlugs,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not create collection.");
      return;
    }

    const createdSlug = data.collection?.id ?? slugPreview;
    setOpen(false);
    resetForm();
    router.push(`/collection/${createdSlug}`);
    router.refresh();
  }

  return (
    <>
      <GradientButton
        size="sm"
        className="w-full rounded-full px-4 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Plus className="me-1.5 size-4" />
        Create New Collection
      </GradientButton>

      <FormShell
        open={open}
        title="Create collection"
        description="Organize anime, movies, shows, and music into a personal list."
        onClose={() => setOpen(false)}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Anime Masterpieces"
              required
            />
          </FormField>

          <FormField label="Slug" hint={`URL: /collection/${slugPreview}`}>
            <TextInput
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={slugPreview}
            />
          </FormField>

          <FormField label="Description">
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A hand-picked vault of anime that defined your taste."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Collection type">
              <SelectInput
                value={kind}
                onChange={(event) =>
                  handleKindChange(
                    event.target.value as (typeof collectionKinds)[number],
                  )
                }
              >
                <option value="content">Shows &amp; movies</option>
                <option value="music">Music playlist</option>
              </SelectInput>
            </FormField>

            <FormField label="Category">
              <SelectInput
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as (typeof collectionCategories)[number],
                  )
                }
              >
                {collectionCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <FormTagMultiSelect
            label="Genre tags"
            hint="Shown on the collection page when items are not added yet."
            values={genreLabels}
            options={genreOptions}
            onChange={setGenreLabels}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Visibility">
              <SelectInput
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as "PUBLIC" | "PRIVATE")
                }
              >
                <option value="PRIVATE">Private</option>
                <option value="PUBLIC">Public</option>
              </SelectInput>
            </FormField>
            <FormField label="Accent">
              <SelectInput
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
              >
                {ACCENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Cover image">
            <ImageUploadInput
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="Or paste an image URL"
            />
          </FormField>

          {kind === "content" ? (
            <FormField
              label="Initial items"
              hint="Search and add catalog titles to seed the collection."
            >
              <CatalogMultiSearchPicker
                allowedTypes={["content", "song"]}
                values={contentSlugs}
                onChange={setContentSlugs}
                placeholder="Search anime, movies, shows, music…"
              />
            </FormField>
          ) : (
            <FormField
              label="Initial tracks"
              hint="Search and add music tracks to seed the playlist."
            >
              <CatalogMultiSearchPicker
                allowedTypes={["song"]}
                values={trackSlugs}
                onChange={setTrackSlugs}
                placeholder="Search songs, OSTs, albums…"
              />
            </FormField>
          )}

          <FormError message={error} />
          <FormActions
            onCancel={() => setOpen(false)}
            submitLabel="Create collection"
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}
