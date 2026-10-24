"use client";

import { cloneElement, isValidElement, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { Pencil } from "lucide-react";
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
import { ACCENT_OPTIONS, CONTENT_GENRE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import {
  collectionCategories,
  collectionKinds,
} from "@/lib/validators/collection";

export interface CollectionEditValues {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  genreLabelIds?: string[];
  collectionKind?: "content" | "music";
  visibility?: "public" | "private";
  accent?: string;
  imageUrl?: string;
}

interface EditCollectionButtonProps {
  collection: CollectionEditValues;
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function EditCollectionButton({
  collection,
  trigger,
  onOpenChange,
}: EditCollectionButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [category, setCategory] = useState<
    (typeof collectionCategories)[number]
  >(
    (collection.category as (typeof collectionCategories)[number]) ?? "Mixed",
  );
  const [genreLabels, setGenreLabels] = useState<string[]>(
    collection.genreLabelIds ?? [],
  );
  const [kind, setKind] = useState<(typeof collectionKinds)[number]>(
    collection.collectionKind ?? "content",
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(
    collection.visibility === "public" ? "PUBLIC" : "PRIVATE",
  );
  const [accent, setAccent] = useState(collection.accent ?? "blue");
  const [imageUrl, setImageUrl] = useState(collection.imageUrl ?? "");
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

  useOnValueChange(open, (isOpen) => {
    if (!isOpen) return;
    setName(collection.name);
    setDescription(collection.description ?? "");
    setCategory(
      (collection.category as (typeof collectionCategories)[number]) ?? "Mixed",
    );
    setGenreLabels(collection.genreLabelIds ?? []);
    setKind(collection.collectionKind ?? "content");
    setVisibility(collection.visibility === "public" ? "PUBLIC" : "PRIVATE");
    setAccent(collection.accent ?? "blue");
    setImageUrl(collection.imageUrl ?? "");
    setError(undefined);
  });

  function handleOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(`/api/collections/${collection.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        category,
        genreLabels,
        kind,
        visibility,
        accent,
        imageUrl: imageUrl || "",
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update collection.");
      return;
    }

    handleOpen(false);
    router.refresh();
  }

  return (
    <>
      {trigger ? (
        isValidElement<{ onClick?: React.MouseEventHandler }>(trigger) ? (
          cloneElement(trigger, {
            onClick: (event: React.MouseEvent) => {
              trigger.props.onClick?.(event);
              handleOpen(true);
            },
          })
        ) : (
          <span role="button" tabIndex={0} onClick={() => handleOpen(true)}>
            {trigger}
          </span>
        )
      ) : (
        <GradientButton
          size="sm"
          className="gap-1.5 rounded-full px-4"
          onClick={() => handleOpen(true)}
        >
          <Pencil className="size-3.5" />
          Edit Collection
        </GradientButton>
      )}

      <FormShell
        open={open}
        title="Edit Collection"
        description="Update metadata, visibility, and cover image."
        onClose={() => handleOpen(false)}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Slug" hint="Collection URL cannot be changed.">
            <TextInput value={collection.slug} readOnly className="opacity-70" />
          </FormField>

          <FormField label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </FormField>

          <FormField label="Description">
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
            hint="Shown when the collection has no items yet."
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

          <FormError message={error} />
          <FormActions
            onCancel={() => handleOpen(false)}
            submitLabel="Save Changes"
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}
