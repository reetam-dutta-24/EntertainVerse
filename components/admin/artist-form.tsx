"use client";

import { useMemo, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useFormDraft } from "@/hooks/use-form-draft";
import { FormResetButton } from "@/components/admin/form-reset-button";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  ACCENT_OPTIONS,
  ARTIST_GENRE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/catalog-enums";
import {
  BandMembersEditor,
  CatalogReviewsEditor,
  Field,
  Section,
  TagListEditor,
  inputClass,
} from "@/components/admin/catalog-nested-fields";
import { EnumMultiSelect, EnumSelect } from "@/components/admin/enum-selectors";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { CatalogImportPanel } from "@/components/admin/ai/catalog-import-panel";
import { ImportSummary } from "@/components/admin/ai/import-summary";
import { CatalogReviewPanel } from "@/components/admin/ai/catalog-review-panel";
import { useConfirm } from "@/components/feedback/feedback-provider";
import type { AdminAiSettings } from "@/lib/ai/settings";
import type { ArtistImportResult } from "@/lib/catalog-import/types";
import { listenServiceFromUrl } from "@/lib/listen-links";
import type { ArtistFormInput } from "@/lib/validators/admin/artist";

export interface ArtistFormProps {
  mode: "create" | "edit";
  recordId?: string;
  initial: ArtistFormInput;
  ai?: AdminAiSettings;
}

const IMPORT_TYPE_HINTS = [
  { value: "", label: "Any artist" },
  { value: "group", label: "Group / band" },
  { value: "solo", label: "Solo artist" },
] as const;

/** Review suggestions for these fields need an editor, not a one-click replace. */
const MANUAL_FIELDS = new Set<string>(["general", "members", "catalogReviews", "listenLinks", "isGroup"]);
const NUMBER_FIELDS = new Set<string>(["rating", "debutYear"]);
const LIST_VALUES: Record<string, Set<string> | null> = {
  genreLabels: new Set(ARTIST_GENRE_OPTIONS.map((o) => o.value)),
  languages: new Set(LANGUAGE_OPTIONS.map((o) => o.value)),
  primaryTags: null,
};
const ACCENT_VALUES = new Set<string>(ACCENT_OPTIONS.map((o) => o.value));

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ArtistForm({ mode, recordId, initial, ai = { enabled: false, tmdbEnabled: false } }: ArtistFormProps) {
  const router = useAppRouter();
  const draftKey =
    mode === "create"
      ? "aniverse:admin:artist:create"
      : `aniverse:admin:artist:edit:${recordId}`;
  const { form, setForm, clearDraft, resetForm, resetKey, draftRestored } = useFormDraft<ArtistFormInput>(
    draftKey,
    initial,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [importResult, setImportResult] = useState<ArtistImportResult | null>(null);
  const [importFacts, setImportFacts] = useState<Record<string, unknown> | undefined>();
  const confirmAction = useConfirm();
  // The textarea keeps blank lines while typing; drop them before saving or reviewing.
  const cleanForm = useMemo(
    () => ({
      ...form,
      listenLinks: (form.listenLinks ?? [])
        .map((link) => ({ service: listenServiceFromUrl(link.url.trim()), url: link.url.trim() }))
        .filter((link) => link.url),
    }),
    [form],
  );

  function update<K extends keyof ArtistFormInput>(key: K, value: ArtistFormInput[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleImported(result: ArtistImportResult) {
    if (form.title.trim()) {
      const replace = await confirmAction({
        title: "Replace the current form?",
        description: `The imported profile for "${result.draft.title}" will replace what you've entered so far.`,
        confirmLabel: "Replace with import",
      });
      if (!replace) return;
    }
    setForm(result.draft);
    setSlugTouched(false);
    setImportResult(result);
    setImportFacts(result.facts);
  }

  function canApplySuggestion(field: string) {
    return !MANUAL_FIELDS.has(field);
  }

  function applySuggestion(field: string, value: string) {
    if (!canApplySuggestion(field)) return;
    const key = field as keyof ArtistFormInput;
    if (NUMBER_FIELDS.has(field)) {
      const number = Number(value);
      update(key, (value.trim() === "" || Number.isNaN(number) ? undefined : number) as never);
      return;
    }
    if (field in LIST_VALUES) {
      const allowed = LIST_VALUES[field];
      const items = value.split(",").map((item) => item.trim()).filter(Boolean);
      update(key, (allowed ? items.map((item) => item.toLowerCase()).filter((item) => allowed.has(item)) : items) as never);
      return;
    }
    if (field === "accent") {
      const accent = value.trim().toLowerCase();
      if (!accent || ACCENT_VALUES.has(accent)) update("accent", (accent || undefined) as ArtistFormInput["accent"]);
      return;
    }
    if (key === "slug") setSlugTouched(true);
    update(key, value as never);
  }

  /** Start over: empty form on create, last saved version on edit. */
  function handleReset() {
    resetForm(initial);
    setSlugTouched(mode === "edit");
    setError(null);
    setImportResult(null);
    setImportFacts(undefined);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const url = mode === "create" ? "/api/admin/artists" : `/api/admin/artists/${recordId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanForm),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save artist.");
        return;
      }
      clearDraft();
      router.push("/admin/artists");
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
      {mode === "create" ? (
        <CatalogImportPanel<ArtistImportResult>
          apiBase="/api/admin/ai/artists"
          aiEnabled={ai.enabled}
          intro={
            <>
              Search an artist — the photo and fan data come from Deezer, group/solo, members and debut from
              MusicBrainz, Apple Music and Deezer links are attached, and {ai.providerLabel ?? "the AI model"} drafts
              the bio and tags.
            </>
          }
          placeholder="e.g. YOASOBI, TWICE, LiSA"
          typeHints={IMPORT_TYPE_HINTS}
          artwork="square"
          onImported={(result) => void handleImported(result)}
        />
      ) : null}
      {importResult ? <ImportSummary result={importResult} onDismiss={() => setImportResult(null)} /> : null}
      {draftRestored ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          Restored your unsaved draft from this browser.
        </p>
      ) : null}
      <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100/80">
        Songs are linked via Music CMS (artist slug). KPI stats and AI Match % come from user activity.
      </p>

      <Section title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Artist name">
            <input className={inputClass} value={form.title} onChange={(e) => { update("title", e.target.value); if (!slugTouched) update("slug", slugify(e.target.value)); }} required />
          </Field>
          <Field label="Native name" hint="e.g. 트와이스">
            <input className={inputClass} value={form.nativeTitle ?? ""} onChange={(e) => update("nativeTitle", e.target.value)} />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={form.slug} onChange={(e) => { setSlugTouched(true); update("slug", e.target.value); }} required />
          </Field>
          <Field label="Rating">
            <input className={inputClass} type="number" min={0} max={10} step={0.1} value={form.rating ?? ""} onChange={(e) => update("rating", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Rank left" hint='#10 in Kpop music'>
            <input className={inputClass} value={form.rankLeft ?? ""} onChange={(e) => update("rankLeft", e.target.value)} />
          </Field>
          <Field label="Rank right" hint='#1 in your favourite artist'>
            <input className={inputClass} value={form.rankRight ?? ""} onChange={(e) => update("rankRight", e.target.value)} />
          </Field>
          <Field label="Label / agency">
            <input className={inputClass} value={form.label ?? ""} onChange={(e) => update("label", e.target.value)} placeholder="JYP Entertainment" />
          </Field>
          <Field label="Debut year">
            <input className={inputClass} type="number" value={form.debutYear ?? ""} onChange={(e) => update("debutYear", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <EnumSelect
            label="Accent"
            hint="Drives hero glow and stat card colors on the artist detail page"
            value={form.accent ?? ""}
            options={ACCENT_OPTIONS}
            onChange={(accent) =>
              update("accent", (accent || undefined) as ArtistFormInput["accent"])
            }
          />
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={form.isGroup} onChange={(e) => update("isGroup", e.target.checked)} className="size-4" />
            This is a band / group (not solo)
          </label>
        </div>
        <Field label="Bio / synopsis">
          <textarea className={`${inputClass} min-h-32 py-2`} value={form.synopsis ?? ""} onChange={(e) => update("synopsis", e.target.value)} />
        </Field>
        <Field label="Hero image" hint="Group banner or solo artist photo — shown in the right hero panel">
          <ImageUploadInput
            value={form.imageUrl ?? ""}
            onChange={(value) => update("imageUrl", value)}
            inputClassName={inputClass}
          />
        </Field>
        <EnumMultiSelect
          label="Genres"
          values={form.genreLabels}
          options={ARTIST_GENRE_OPTIONS}
          onChange={(genreLabels) => update("genreLabels", genreLabels)}
        />
        <Field
          label="Listen links"
          hint="One artist-profile URL per line — Apple Music, Deezer, Spotify, YouTube Music, JioSaavn"
        >
          <textarea
            className={`${inputClass} min-h-24 py-2 font-mono text-xs leading-relaxed`}
            value={(form.listenLinks ?? []).map((link) => link.url).join("\n")}
            onChange={(e) =>
              update(
                "listenLinks",
                e.target.value.split("\n").map((url) => ({ service: listenServiceFromUrl(url.trim()), url })),
              )
            }
            placeholder={"https://music.apple.com/…/artist/…\nhttps://www.deezer.com/artist/…"}
          />
        </Field>
        <TagListEditor label="Primary tags" items={form.primaryTags} placeholder="Dance Pop, K-pop…" onChange={(primaryTags) => update("primaryTags", primaryTags)} />
        <EnumMultiSelect
          label="Languages"
          values={form.languages}
          options={LANGUAGE_OPTIONS}
          onChange={(languages) => update("languages", languages)}
        />
      </Section>

      {form.isGroup ? (
        <BandMembersEditor members={form.members} onChange={(members) => update("members", members)} />
      ) : null}

      <CatalogReviewsEditor reviews={form.catalogReviews} onChange={(catalogReviews) => update("catalogReviews", catalogReviews)} />

      <CatalogReviewPanel
        endpoint="/api/admin/ai/artists/review"
        form={cleanForm}
        facts={importFacts}
        aiEnabled={ai.enabled}
        providerLabel={ai.providerLabel}
        canApply={canApplySuggestion}
        onApply={applySuggestion}
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <GradientButton type="submit" disabled={pending} className="rounded-full px-6">
          {pending ? "Saving…" : mode === "create" ? "Create artist" : "Save changes"}
        </GradientButton>
        <button type="button" onClick={() => router.back()} className="cursor-pointer rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:bg-white/10">Cancel</button>
        <FormResetButton mode={mode} onReset={handleReset} disabled={pending} className="sm:ms-auto" />
      </div>
    </form>
  );
}
