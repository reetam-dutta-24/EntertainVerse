"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useFormDraft } from "@/hooks/use-form-draft";
import { FormResetButton } from "@/components/admin/form-reset-button";
import { GradientButton } from "@/components/ui/gradient-button";
import { ACCENT_OPTIONS } from "@/lib/catalog-enums";
import { Field, Section, inputClass } from "@/components/admin/catalog-nested-fields";
import { EnumSelect } from "@/components/admin/enum-selectors";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { communityCategories } from "@/lib/validators/community";
import type { AdminCommunityFormInput } from "@/lib/validators/admin/community";

export interface CommunityFormProps {
  mode: "create" | "edit";
  recordId?: string;
  initial: AdminCommunityFormInput;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const activityOptions = [
  { value: "very-active", label: "Very active" },
  { value: "active", label: "Active" },
  { value: "moderate", label: "Moderate" },
  { value: "quiet", label: "Quiet" },
];

export function CommunityForm({ mode, recordId, initial }: CommunityFormProps) {
  const router = useAppRouter();
  const draftKey =
    mode === "create"
      ? "aniverse:admin:community:create"
      : `aniverse:admin:community:edit:${recordId}`;
  const { form, setForm, clearDraft, resetForm, resetKey, draftRestored } = useFormDraft<AdminCommunityFormInput>(
    draftKey,
    initial,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  function update<K extends keyof AdminCommunityFormInput>(
    key: K,
    value: AdminCommunityFormInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /** Start over: empty form on create, last saved version on edit. */
  function handleReset() {
    resetForm(initial);
    setSlugTouched(mode === "edit");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const url =
        mode === "create"
          ? "/api/admin/communities"
          : `/api/admin/communities/${recordId}`;
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save community.");
        return;
      }
      clearDraft();
      router.push("/admin/communities");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={resetKey} onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-6">
      <div className="flex justify-end">
        <FormResetButton mode={mode} onReset={handleReset} disabled={pending} className="w-full sm:w-auto" />
      </div>
      {draftRestored ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          Restored your unsaved draft from this browser.
        </p>
      ) : null}
      <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100/80">
        Global communities are public by default. You are added as the community admin on create.
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
          <Field label="Category">
            <select
              className={inputClass}
              value={form.category}
              onChange={(event) =>
                update("category", event.target.value as AdminCommunityFormInput["category"])
              }
            >
              {communityCategories.map((category) => (
                <option key={category} value={category} className="bg-popover">
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <EnumSelect
            label="Visibility"
            value={form.visibility}
            options={[
              { value: "PUBLIC", label: "Public" },
              { value: "PRIVATE", label: "Private" },
            ]}
            onChange={(visibility) =>
              update("visibility", visibility as AdminCommunityFormInput["visibility"])
            }
          />
          <EnumSelect
            label="Activity level"
            value={form.activityLevel ?? "active"}
            options={activityOptions}
            onChange={(activityLevel) =>
              update(
                "activityLevel",
                activityLevel as AdminCommunityFormInput["activityLevel"],
              )
            }
          />
          <EnumSelect
            label="Accent"
            value={form.accent ?? "cyan"}
            options={ACCENT_OPTIONS}
            onChange={(accent) =>
              update("accent", accent as AdminCommunityFormInput["accent"])
            }
          />
        </div>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-32 py-2`}
            value={form.description ?? ""}
            onChange={(event) => update("description", event.target.value)}
          />
        </Field>
      </Section>

      <Section title="Media">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Card image">
            <ImageUploadInput
              value={form.imageUrl ?? ""}
              onChange={(value) => update("imageUrl", value)}
              inputClassName={inputClass}
            />
          </Field>
          <Field label="Wallpaper">
            <ImageUploadInput
              value={form.wallpaperUrl ?? ""}
              onChange={(value) => update("wallpaperUrl", value)}
              inputClassName={inputClass}
            />
          </Field>
        </div>
      </Section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <GradientButton type="submit" disabled={pending} className="rounded-full px-6">
          {pending ? "Saving…" : mode === "create" ? "Create community" : "Save changes"}
        </GradientButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Cancel
        </button>
        <FormResetButton mode={mode} onReset={handleReset} disabled={pending} className="sm:ms-auto" />
      </div>
    </form>
  );
}
