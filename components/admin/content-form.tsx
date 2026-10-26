"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useFormDraft } from "@/hooks/use-form-draft";
import { FormResetButton } from "@/components/admin/form-reset-button";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  ACCENT_OPTIONS,
  CONTENT_GENRE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/catalog-enums";
import { contentMediaTypes, contentFormSchema } from "@/lib/validators/admin/content";
import type { ContentFormInput } from "@/lib/validators/admin/content";
import { sanitizeContentFormForSubmit } from "@/lib/validators/admin/content-form-utils";
import { formatZodErrors } from "@/lib/validators/admin/format-zod-error";
import {
  CatalogReviewsEditor,
  CharactersEditor,
  EpisodesEditor,
  SeasonsEditor,
  SlugListEditor,
} from "@/components/admin/catalog-nested-fields";
import { EnumMultiSelect, EnumSelect } from "@/components/admin/enum-selectors";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { CatalogImportPanel } from "@/components/admin/ai/catalog-import-panel";
import { ImportSummary } from "@/components/admin/ai/import-summary";
import { CatalogReviewPanel } from "@/components/admin/ai/catalog-review-panel";
import { useConfirm } from "@/components/feedback/feedback-provider";
import type { ContentImportResult } from "@/lib/catalog-import/types";
import type { AdminAiSettings } from "@/lib/ai/settings";

export interface ContentFormProps {
  mode: "create" | "edit";
  contentId?: string;
  initial: ContentFormInput;
  /** Which AI helpers are configured on the server. */
  ai?: AdminAiSettings;
}

const NUMBER_FIELDS = new Set<keyof ContentFormInput>(["rating", "year", "imdbRating", "malScore", "seasonCount", "episodeCount"]);
const LIST_FIELDS = new Set<keyof ContentFormInput>(["genreLabels", "languages", "highlightTags", "featuredTrackSlugs", "relatedContentSlugs"]);
/** Structured editors — the reviewer can flag them, but fixes are made by hand. */
const IMPORT_TYPE_HINTS = [
  { value: "", label: "Any type" },
  { value: "anime", label: "Anime" },
  { value: "show", label: "Show" },
  { value: "kdrama", label: "K-Drama" },
  { value: "movie", label: "Movie" },
  { value: "documentary", label: "Documentary" },
] as const;
const MANUAL_FIELDS = new Set<string>(["seasons", "episodes", "characters", "catalogReviews", "general", "type"]);
const ALLOWED_LIST_VALUES: Partial<Record<keyof ContentFormInput, Set<string>>> = {
  genreLabels: new Set(CONTENT_GENRE_OPTIONS.map((o) => o.value)),
  languages: new Set(LANGUAGE_OPTIONS.map((o) => o.value)),
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isMovieType(type: ContentFormInput["type"]) {
  return type === "movie" || type === "documentary";
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
        {label}
      </span>
      {hint ? <span className="text-xs text-white/40">{hint}</span> : null}
      {children}
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-white/45">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink";

function TagListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const value = input.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setInput("");
  }

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 cursor-pointer rounded-xl border border-white/20 px-4 text-sm font-medium text-white hover:bg-white/10"
        >
          Add
        </button>
      </div>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(items.filter((g) => g !== item))}
              aria-label={`Remove ${item}`}
              className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-red-500/20"
            >
              {item} ×
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  );
}

/** Admin form for creating and editing catalog content (video titles). */
export function ContentForm({ mode, contentId, initial, ai = { enabled: false, tmdbEnabled: false } }: ContentFormProps) {
  const router = useAppRouter();
  const draftKey =
    mode === "create"
      ? "aniverse:admin:content:create"
      : `aniverse:admin:content:edit:${contentId}`;
  const { form, setForm, clearDraft, resetForm, resetKey, draftRestored } = useFormDraft<ContentFormInput>(
    draftKey,
    initial,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [importResult, setImportResult] = useState<ContentImportResult | null>(null);
  const [importFacts, setImportFacts] = useState<Record<string, unknown> | undefined>();
  const confirmAction = useConfirm();
  const isMovie = isMovieType(form.type);

  async function handleImported(result: ContentImportResult) {
    if (form.title.trim()) {
      const replace = await confirmAction({
        title: "Replace the current form?",
        description: `The imported draft for "${result.draft.title}" will replace what you've entered so far.`,
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
    if (field === "general" || MANUAL_FIELDS.has(field)) return;
    const key = field as keyof ContentFormInput;
    if (NUMBER_FIELDS.has(key)) {
      const number = Number(value);
      update(key, (value.trim() === "" || Number.isNaN(number) ? undefined : number) as never);
      return;
    }
    if (LIST_FIELDS.has(key)) {
      const allowed = ALLOWED_LIST_VALUES[key];
      const items = value.split(",").map((item) => item.trim()).filter(Boolean);
      update(key, (allowed ? items.map((item) => item.toLowerCase()).filter((item) => allowed.has(item)) : items) as never);
      return;
    }
    if (key === "slug") setSlugTouched(true);
    update(key, value as never);
  }

  function update<K extends keyof ContentFormInput>(
    key: K,
    value: ContentFormInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateType(type: ContentFormInput["type"]) {
    setForm((current) => {
      if (!isMovieType(type)) return { ...current, type };
      return {
        ...current,
        type,
        seasons: [],
        episodes: [],
        seasonCount: undefined,
        episodeCount: undefined,
        seasonLabel: "",
        airingDay: "",
        broadcast: "",
      };
    });
  }

  /** Start over: empty form on create, last saved version on edit. */
  function handleReset() {
    resetForm(initial);
    setSlugTouched(mode === "edit");
    setError(null);
    setImportResult(null);
    setImportFacts(undefined);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const rawPayload: ContentFormInput = isMovie
      ? {
          ...form,
          seasons: [],
          episodes: [],
          seasonCount: undefined,
          episodeCount: undefined,
          seasonLabel: "",
          airingDay: "",
          broadcast: "",
        }
      : form;

    const payload = sanitizeContentFormForSubmit(rawPayload);
    const validation = contentFormSchema.safeParse(payload);
    if (!validation.success) {
      setError(formatZodErrors(validation.error));
      setPending(false);
      return;
    }

    try {
      const url =
        mode === "create"
          ? "/api/admin/content"
          : `/api/admin/content/${contentId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not save content.");
        return;
      }

      clearDraft();
      router.push("/admin/content");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
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
        <CatalogImportPanel<ContentImportResult>
          apiBase="/api/admin/ai/content"
          aiEnabled={ai.enabled}
          intro={
            <>
              Search a title — facts come from {ai.tmdbEnabled ? "TMDB (movies, shows, K-dramas) and " : ""}AniList (anime), and{" "}
              {ai.providerLabel ?? "the AI model"} drafts the editorial fields. You review everything before saving.
            </>
          }
          placeholder="e.g. Frieren, Breaking Bad, Parasite"
          typeHints={IMPORT_TYPE_HINTS}
          notice={
            ai.tmdbEnabled ? null : (
              <>
                Only anime sources are on. Add <code className="break-all font-mono">TMDB_API_KEY</code> for movies, shows and K-dramas.
              </>
            )
          }
          onImported={(result) => void handleImported(result)}
        />
      ) : null}
      {importResult ? <ImportSummary result={importResult} onDismiss={() => setImportResult(null)} /> : null}
      {draftRestored ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          Restored your unsaved draft from this browser. Your entries are kept locally until you save successfully.
        </p>
      ) : null}
      <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100/80">
        Engagement KPIs (Liked By, Currently Watching, Viewed By, AI Match %) are
        not entered here — they are calculated from user ratings, watchlist,
        watch events, and collections when users interact with this title.
      </p>

      <Section
        title="Basics"
        description="Core identity shown in the detail hero header."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                update("title", title);
                if (!slugTouched) update("slug", slugify(title));
              }}
              required
            />
          </Field>

          <Field label="Native title" hint="e.g. 呪術廻戦">
            <input
              className={inputClass}
              value={form.nativeTitle ?? ""}
              onChange={(e) => update("nativeTitle", e.target.value)}
            />
          </Field>

          <Field label="Slug (URL)">
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", e.target.value);
              }}
              required
            />
          </Field>

          <Field label="Type">
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) =>
                updateType(e.target.value as ContentFormInput["type"])
              }
            >
              {contentMediaTypes.map((type) => (
                <option key={type} value={type} className="bg-popover">
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <EnumSelect
            label="Accent"
            hint="Drives hero inner glow and KPI stat card colors on the public page"
            value={form.accent ?? ""}
            options={ACCENT_OPTIONS}
            onChange={(accent) =>
              update(
                "accent",
                (accent || undefined) as ContentFormInput["accent"],
              )
            }
          />

          <Field label="Rating (0–10)">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.rating ?? ""}
              onChange={(e) =>
                update(
                  "rating",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </Field>

          <Field label="Release year">
            <input
              className={inputClass}
              type="number"
              min={1900}
              max={2100}
              value={form.year ?? ""}
              onChange={(e) =>
                update("year", e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </Field>

          <Field label="Trending label" hint='e.g. "Trending Globally At 49th in Shows/Anime"'>
            <input
              className={inputClass}
              value={form.trendingLabel ?? ""}
              onChange={(e) => update("trendingLabel", e.target.value)}
            />
          </Field>

          <Field label="Credit label" hint="Optional subtitle under the title">
            <input
              className={inputClass}
              value={form.creditLabel ?? ""}
              onChange={(e) => update("creditLabel", e.target.value)}
            />
          </Field>

          <Field label="Meta chip" hint='Short card meta e.g. "4 Seasons, Film"'>
            <input
              className={inputClass}
              value={form.meta ?? ""}
              onChange={(e) => update("meta", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Media" description="Poster and backdrop images.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Poster image" hint="Use high-resolution images (≥1200px wide) for sharp detail pages">
            <ImageUploadInput
              value={form.imageUrl ?? ""}
              onChange={(value) => update("imageUrl", value)}
              inputClassName={inputClass}
            />
          </Field>

          <Field label="Backdrop image">
            <ImageUploadInput
              value={form.backdropUrl ?? ""}
              onChange={(value) => update("backdropUrl", value)}
              inputClassName={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section title="Copy">
        <Field label="Short description">
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            value={form.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>

        <Field label="Synopsis (detail page)">
          <textarea
            className={`${inputClass} min-h-32 py-2`}
            value={form.synopsis ?? ""}
            onChange={(e) => update("synopsis", e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Tags & structure"
        description={
          isMovie
            ? "Genres and languages for movies. Season/episode fields are hidden for films."
            : "Genres, hero chips, and season/episode counts for series."
        }
      >
        <EnumMultiSelect
          label="Genres"
          values={form.genreLabels}
          options={CONTENT_GENRE_OPTIONS}
          onChange={(genreLabels) => update("genreLabels", genreLabels)}
        />

        <TagListEditor
          label="Highlight tags"
          items={form.highlightTags}
          placeholder="All Seasons, 12 Episodes, English…"
          onChange={(highlightTags) => update("highlightTags", highlightTags)}
        />

        <EnumMultiSelect
          label="Languages"
          values={form.languages}
          options={LANGUAGE_OPTIONS}
          onChange={(languages) => update("languages", languages)}
        />

        {!isMovie ? (
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Season count">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={form.seasonCount ?? ""}
                onChange={(e) =>
                  update(
                    "seasonCount",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
            </Field>

            <Field label="Episode count">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={form.episodeCount ?? ""}
                onChange={(e) =>
                  update(
                    "episodeCount",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
            </Field>

            <Field label="Season label" hint='e.g. "Season 1"'>
              <input
                className={inputClass}
                value={form.seasonLabel ?? ""}
                onChange={(e) => update("seasonLabel", e.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Section>

      <Section
        title="Production metadata"
        description="Two-column metadata grid on the public detail page."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Studio">
            <input
              className={inputClass}
              value={form.studio ?? ""}
              onChange={(e) => update("studio", e.target.value)}
            />
          </Field>

          <Field label="Director">
            <input
              className={inputClass}
              value={form.director ?? ""}
              onChange={(e) => update("director", e.target.value)}
            />
          </Field>

          <Field label="Composer">
            <input
              className={inputClass}
              value={form.composer ?? ""}
              onChange={(e) => update("composer", e.target.value)}
            />
          </Field>

          <Field label="Original author">
            <input
              className={inputClass}
              value={form.originalAuthor ?? ""}
              onChange={(e) => update("originalAuthor", e.target.value)}
            />
          </Field>

          <Field label="Source material">
            <input
              className={inputClass}
              value={form.sourceMaterial ?? ""}
              onChange={(e) => update("sourceMaterial", e.target.value)}
              placeholder="Manga, Light Novel, Original…"
            />
          </Field>

          <Field label="Producers">
            <input
              className={inputClass}
              value={form.producers ?? ""}
              onChange={(e) => update("producers", e.target.value)}
            />
          </Field>

          <Field label="Network">
            <input
              className={inputClass}
              value={form.network ?? ""}
              onChange={(e) => update("network", e.target.value)}
            />
          </Field>

          <Field label="Country">
            <input
              className={inputClass}
              value={form.country ?? ""}
              onChange={(e) => update("country", e.target.value)}
            />
          </Field>

          <Field label="Status">
            <input
              className={inputClass}
              value={form.status ?? ""}
              onChange={(e) => update("status", e.target.value)}
              placeholder="Ongoing, Completed…"
            />
          </Field>

          <Field label="Age rating">
            <input
              className={inputClass}
              value={form.ageRating ?? ""}
              onChange={(e) => update("ageRating", e.target.value)}
              placeholder="16+, PG-13…"
            />
          </Field>

          <Field label="IMDb rating">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.imdbRating ?? ""}
              onChange={(e) =>
                update(
                  "imdbRating",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </Field>

          <Field label="MAL score">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.malScore ?? ""}
              onChange={(e) =>
                update(
                  "malScore",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </Field>

          <Field label="Aired from">
            <input
              className={inputClass}
              value={form.airedFrom ?? ""}
              onChange={(e) => update("airedFrom", e.target.value)}
              placeholder="Oct 2020"
            />
          </Field>

          <Field label="Aired to">
            <input
              className={inputClass}
              value={form.airedTo ?? ""}
              onChange={(e) => update("airedTo", e.target.value)}
              placeholder="Present"
            />
          </Field>

          {!isMovie ? (
            <>
              <Field label="Broadcast">
                <input
                  className={inputClass}
                  value={form.broadcast ?? ""}
                  onChange={(e) => update("broadcast", e.target.value)}
                  placeholder="Fridays 11:00 PM JST"
                />
              </Field>

              <Field label="Airing day">
                <input
                  className={inputClass}
                  value={form.airingDay ?? ""}
                  onChange={(e) => update("airingDay", e.target.value)}
                />
              </Field>

              <Field label="Episode duration">
                <input
                  className={inputClass}
                  value={form.episodeDuration ?? ""}
                  onChange={(e) => update("episodeDuration", e.target.value)}
                  placeholder="24 Min"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Runtime" hint='e.g. "122 Min" or "Full Movie"'>
                <input
                  className={inputClass}
                  value={form.episodeDuration ?? ""}
                  onChange={(e) => update("episodeDuration", e.target.value)}
                  placeholder="122 Min"
                />
              </Field>
              <Field
                label="Video URL (MP4)"
                hint="Direct link to the full movie or documentary file"
              >
                <input
                  className={inputClass}
                  value={form.videoUrl ?? ""}
                  onChange={(e) => update("videoUrl", e.target.value)}
                  placeholder="https://example.com/movies/title.mp4"
                />
              </Field>
            </>
          )}

          <Field label="Trailer URL" hint="Official YouTube trailer — shown on the detail page">
            <input
              className={inputClass}
              value={form.trailerUrl ?? ""}
              onChange={(e) => update("trailerUrl", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </Field>

          <Field
            label="Where to watch"
            hint={form.tmdbId ? `Linked to TMDB ${form.tmdbKind || "title"} #${form.tmdbId} — providers load live` : "Import from TMDB to show streaming providers"}
          >
            <input className={`${inputClass} opacity-60`} value={form.tmdbId ? `TMDB ${form.tmdbKind} #${form.tmdbId}` : "Not linked"} readOnly />
          </Field>

          <Field label="Last update">
            <input
              className={inputClass}
              value={form.lastUpdate ?? ""}
              onChange={(e) => update("lastUpdate", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {!isMovie ? (
        <>
          <SeasonsEditor
            seasons={form.seasons}
            onChange={(seasons) => update("seasons", seasons)}
          />

          <EpisodesEditor
            episodes={form.episodes}
            onChange={(episodes) => update("episodes", episodes)}
          />
        </>
      ) : null}

      <CharactersEditor
        characters={form.characters}
        contentType={form.type}
        onChange={(characters) => update("characters", characters)}
      />

      <Section
        title="Featured OSTs & related"
        description="Search the catalog to link tracks and related titles."
      >
        <SlugListEditor
          label="Featured tracks"
          hint="Create tracks in Music CMS first, then search and add them here."
          items={form.featuredTrackSlugs}
          placeholder="Search songs, OSTs, albums…"
          allowedTypes={["song"]}
          onChange={(featuredTrackSlugs) => update("featuredTrackSlugs", featuredTrackSlugs)}
        />
        <SlugListEditor
          label="Related content"
          items={form.relatedContentSlugs}
          placeholder="Search anime, movies, shows…"
          allowedTypes={["content"]}
          onChange={(relatedContentSlugs) => update("relatedContentSlugs", relatedContentSlugs)}
        />
      </Section>

      <CatalogReviewsEditor
        reviews={form.catalogReviews}
        onChange={(catalogReviews) => update("catalogReviews", catalogReviews)}
      />

      <CatalogReviewPanel
        endpoint="/api/admin/ai/content/review"
        form={form}
        facts={importFacts}
        aiEnabled={ai.enabled}
        providerLabel={ai.providerLabel}
        canApply={canApplySuggestion}
        onApply={applySuggestion}
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <GradientButton type="submit" disabled={pending} className="rounded-full px-6">
          {pending ? "Saving…" : mode === "create" ? "Create content" : "Save changes"}
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
