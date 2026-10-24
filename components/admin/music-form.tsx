"use client";

import { useEffect, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { useFormDraft } from "@/hooks/use-form-draft";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  ACCENT_OPTIONS,
  LANGUAGE_OPTIONS,
  SONG_GENRE_OPTIONS,
} from "@/lib/catalog-enums";
import {
  CatalogReviewsEditor,
  Field,
  Section,
  inputClass,
} from "@/components/admin/catalog-nested-fields";
import { EnumMultiSelect, EnumSelect } from "@/components/admin/enum-selectors";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import {
  CatalogSearchPicker,
  type CatalogPickerSelection,
} from "@/components/forms/catalog-search-picker";
import type { MusicFormInput } from "@/lib/validators/admin/music";
import type { TrackLinkedSelections } from "@/lib/services/music.service";

export interface MusicFormProps {
  mode: "create" | "edit";
  recordId?: string;
  initial: MusicFormInput;
  initialLinked?: TrackLinkedSelections;
}

const ARTIST_SEARCH_TYPES = ["artist"] as const;

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const kinds = ["song", "ost", "album"] as const;

export function MusicForm({ mode, recordId, initial, initialLinked }: MusicFormProps) {
  const router = useAppRouter();
  const draftKey =
    mode === "create"
      ? "aniverse:admin:music:create"
      : `aniverse:admin:music:edit:${recordId}`;
  const { form, setForm, clearDraft, draftRestored } = useFormDraft<MusicFormInput>(
    draftKey,
    initial,
  );
  const [artistSelection, setArtistSelection] = useState<CatalogPickerSelection | null>(
    () =>
      initialLinked?.artist ??
      (initial.artistSlug
        ? {
            id: initial.artistSlug,
            type: "artist",
            title: initial.artist || initial.artistSlug,
          }
        : null),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const artistSearchTypes = useMemo(
    () => [...ARTIST_SEARCH_TYPES] as CatalogPickerSelection["type"][],
    [],
  );

  const linkedSourceLabel =
    initialLinked?.source?.title ?? (form.source?.trim() ? form.source : null);

  useOnValueChange(initialLinked?.artist, (artist) => {
    if (artist) setArtistSelection(artist);
  });

  useEffect(() => {
    if (artistSelection?.imageUrl || !form.artistSlug) return;
    const artistSlug = form.artistSlug;

    let cancelled = false;
    void (async () => {
      const response = await fetch(
        `/api/admin/catalog-search?slug=${encodeURIComponent(artistSlug)}&type=artist`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as { results: CatalogPickerSelection[] };
      const match = data.results[0];
      if (match && !cancelled) {
        setArtistSelection({
          id: match.id,
          type: "artist",
          title: match.title,
          subtitle: match.subtitle,
          imageUrl: match.imageUrl,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.artistSlug, artistSelection?.imageUrl]);

  function update<K extends keyof MusicFormInput>(key: K, value: MusicFormInput[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload: MusicFormInput = {
        ...form,
        contentSlug: "",
      };
      const url = mode === "create" ? "/api/admin/music" : `/api/admin/music/${recordId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save track.");
        return;
      }
      clearDraft();
      router.push("/admin/music");
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
        KPI stats (Liked By, Currently Listening, Played By, AI Match %) are computed from user activity — not entered here.
      </p>

      <Section title="Basics">
        <div className="grid gap-5 overflow-visible sm:grid-cols-2">
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => {
                update("title", e.target.value);
                if (!slugTouched) update("slug", slugify(e.target.value));
              }}
              required
            />
          </Field>
          <Field label="Native title">
            <input className={inputClass} value={form.nativeTitle ?? ""} onChange={(e) => update("nativeTitle", e.target.value)} />
          </Field>
          <Field label="Slug">
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); update("slug", e.target.value); }}
              required
            />
          </Field>
          <Field label="Kind">
            <select className={inputClass} value={form.kind} onChange={(e) => update("kind", e.target.value as MusicFormInput["kind"])}>
              {kinds.map((k) => <option key={k} value={k} className="bg-popover">{k}</option>)}
            </select>
          </Field>
          <Field label="Artist credit" hint="Display name shown on cards and the song page">
            <input className={inputClass} value={form.artist} onChange={(e) => update("artist", e.target.value)} required />
          </Field>
          <Field label="Linked artist profile" hint="Search Artist CMS — links this track to the artist page and their discography">
            <CatalogSearchPicker
              allowedTypes={artistSearchTypes}
              value={artistSelection}
              onChange={(selection) => {
                setArtistSelection(selection);
                update("artistSlug", selection?.id ?? "");
                if (selection?.title) update("artist", selection.title);
              }}
              placeholder="Search artists…"
              adminSearch
              resultLimit={40}
            />
          </Field>
          <Field
            label="Source show"
            hint="Managed from Content CMS — attach this track under Featured OSTs on the show/movie form"
          >
            <input
              className={`${inputClass} text-white/70`}
              value={linkedSourceLabel ?? ""}
              readOnly
              placeholder="Not linked to a show yet"
            />
          </Field>
          <Field label="Rating">
            <input className={inputClass} type="number" min={0} max={10} step={0.1} value={form.rating ?? ""} onChange={(e) => update("rating", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Year">
            <input className={inputClass} type="number" value={form.year ?? ""} onChange={(e) => update("year", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Duration" hint='e.g. "3:45"'>
            <input className={inputClass} value={form.durationLabel ?? ""} onChange={(e) => update("durationLabel", e.target.value)} />
          </Field>
          <Field label="Duration (seconds)">
            <input className={inputClass} type="number" value={form.durationSeconds ?? ""} onChange={(e) => update("durationSeconds", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <EnumSelect
            label="Language"
            value={form.language ?? ""}
            options={LANGUAGE_OPTIONS}
            onChange={(language) =>
              update("language", language as MusicFormInput["language"])
            }
          />
          <EnumMultiSelect
            label="Genres"
            values={form.genreLabels}
            options={SONG_GENRE_OPTIONS}
            onChange={(genreLabels) => update("genreLabels", genreLabels)}
          />
          <Field label="Album">
            <input className={inputClass} value={form.album ?? ""} onChange={(e) => update("album", e.target.value)} />
          </Field>
          <Field label="Trending label">
            <input className={inputClass} value={form.trendingLabel ?? ""} onChange={(e) => update("trendingLabel", e.target.value)} />
          </Field>
          <Field label="Credit label">
            <input className={inputClass} value={form.creditLabel ?? ""} onChange={(e) => update("creditLabel", e.target.value)} />
          </Field>
          <Field label="Featured rank" hint="Lower = shown in artist trending (1–100)">
            <input className={inputClass} type="number" min={1} max={100} value={form.featuredRank ?? ""} onChange={(e) => update("featuredRank", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <EnumSelect
            label="Accent"
            hint="Drives hero glow and stat card colors on the song detail page"
            value={form.accent ?? ""}
            options={ACCENT_OPTIONS}
            onChange={(accent) =>
              update("accent", (accent || undefined) as MusicFormInput["accent"])
            }
          />
        </div>
      </Section>

      <Section title="Media">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cover image" hint="Use high-resolution images for sharp detail pages">
            <ImageUploadInput
              value={form.imageUrl ?? ""}
              onChange={(value) => update("imageUrl", value)}
              inputClassName={inputClass}
            />
          </Field>
          <Field label="Backdrop">
            <ImageUploadInput
              value={form.backdropUrl ?? ""}
              onChange={(value) => update("backdropUrl", value)}
              inputClassName={inputClass}
            />
          </Field>
          <Field
            label="Audio URL (MP3)"
            hint="Direct link to the full song or OST file"
          >
            <input
              className={inputClass}
              value={form.audioUrl ?? ""}
              onChange={(e) => update("audioUrl", e.target.value)}
              placeholder="https://example.com/tracks/title.mp3"
            />
          </Field>
        </div>
        <Field label="Description / synopsis">
          <textarea className={`${inputClass} min-h-32 py-2`} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} />
        </Field>
        <Field label="Lyrics" hint="One line per lyric. Shown 4 lines at a time during playlist playback.">
          <textarea
            className={`${inputClass} min-h-40 py-2 font-mono text-xs leading-relaxed`}
            value={form.lyrics ?? ""}
            onChange={(e) => update("lyrics", e.target.value)}
            placeholder={"Line 1 of the song…\nLine 2…\nLine 3…"}
          />
        </Field>
      </Section>

      <CatalogReviewsEditor reviews={form.catalogReviews} onChange={(catalogReviews) => update("catalogReviews", catalogReviews)} />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-3">
        <GradientButton type="submit" disabled={pending} className="rounded-full px-6">
          {pending ? "Saving…" : mode === "create" ? "Create track" : "Save changes"}
        </GradientButton>
        <button type="button" onClick={() => router.back()} className="cursor-pointer rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:bg-white/10">Cancel</button>
      </div>
    </form>
  );
}
