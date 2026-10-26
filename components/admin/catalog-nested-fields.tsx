"use client";

import React, { isValidElement, useId } from "react";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { CatalogMultiSearchPicker } from "@/components/forms/catalog-search-picker";
import type { SearchResultType } from "@/lib/search/types";
import { resolveCastCreditLabel } from "@/lib/content-media";
import type { MediaType } from "@/types";
import type {
  CatalogReviewInput,
  ContentCharacterInput,
  ContentEpisodeInput,
  ContentSeasonInput,
} from "@/lib/validators/admin/catalog-shared";

export const inputClass =
  "h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink";

const NATIVE_CONTROLS = new Set(["input", "select", "textarea"]);

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const labelId = useId();
  const heading = (
    <>
      <span id={labelId} className="text-xs font-semibold uppercase tracking-wide text-white/55">
        {label}
      </span>
      {hint ? <span className="text-xs text-white/60">{hint}</span> : null}
    </>
  );
  // A single input / select / textarea: a real <label>, so screen readers announce it
  // and clicking the text focuses the control.
  if (isValidElement(children) && typeof children.type === "string" && NATIVE_CONTROLS.has(children.type)) {
    return (
      <label className="flex flex-col gap-1.5">
        {heading}
        {children}
      </label>
    );
  }
  // Composite fields (chip pickers, tag lists): a named group — a <label> around several
  // controls would make clicking the text toggle the first one.
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      {heading}
      {children}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SlugListEditor({
  label,
  hint,
  items,
  placeholder,
  onChange,
  allowedTypes = ["content"],
}: {
  label: string;
  hint?: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
  allowedTypes?: SearchResultType[];
}) {
  const typeHints = Object.fromEntries(
    items.map((item) => [item, allowedTypes[0]!]),
  ) as Record<string, SearchResultType>;

  return (
    <Field label={label} hint={hint}>
      <CatalogMultiSearchPicker
        allowedTypes={allowedTypes}
        values={items}
        onChange={onChange}
        typeHints={typeHints}
        placeholder={placeholder}
        adminSearch
        resultLimit={40}
        maxItems={48}
      />
    </Field>
  );
}

export function TagListEditor({
  label,
  hint,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = React.useState("");

  function add() {
    const value = input.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setInput("");
  }

  return (
    <Field label={label} hint={hint}>
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

import { ACCENT_OPTIONS } from "@/lib/catalog-enums";
import { DEFAULT_AVATAR_COLOR } from "@/lib/brand-colors";

export function SeasonsEditor({
  seasons,
  onChange,
}: {
  seasons: ContentSeasonInput[];
  onChange: (seasons: ContentSeasonInput[]) => void;
}) {
  function update(index: number, patch: Partial<ContentSeasonInput>) {
    onChange(seasons.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <Section title="Seasons" description="Season tabs on the detail page.">
      {seasons.map((season, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
          <Field label="Label">
            <input
              className={inputClass}
              value={season.label}
              onChange={(e) => update(index, { label: e.target.value })}
            />
          </Field>
          <Field label="Episode count">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={season.episodeCount ?? ""}
              onChange={(e) =>
                update(index, {
                  episodeCount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onChange(seasons.filter((_, i) => i !== index))}
              className="cursor-pointer rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
            >
              Remove season
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...seasons, { label: `Season ${seasons.length + 1}`, episodeCount: 0 }])
        }
        className="cursor-pointer self-start rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        + Add season
      </button>
    </Section>
  );
}

export function EpisodesEditor({
  episodes,
  onChange,
}: {
  episodes: ContentEpisodeInput[];
  onChange: (episodes: ContentEpisodeInput[]) => void;
}) {
  function update(index: number, patch: Partial<ContentEpisodeInput>) {
    onChange(episodes.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <Section title="Episodes" description="Episode list on the detail page.">
      {episodes.map((episode, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-white/10 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Season #">
              <input
                className={inputClass}
                type="number"
                min={1}
                value={episode.seasonNumber}
                onChange={(e) => update(index, { seasonNumber: Number(e.target.value) })}
              />
            </Field>
            <Field label="Episode #">
              <input
                className={inputClass}
                type="number"
                min={1}
                value={episode.number}
                onChange={(e) => update(index, { number: Number(e.target.value) })}
              />
            </Field>
            <Field label="Title">
              <input
                className={inputClass}
                value={episode.title}
                onChange={(e) => update(index, { title: e.target.value })}
              />
            </Field>
            <Field label="Duration">
              <input
                className={inputClass}
                value={episode.duration ?? ""}
                onChange={(e) => update(index, { duration: e.target.value })}
                placeholder="24m"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-20 py-2`}
              value={episode.description ?? ""}
              onChange={(e) => update(index, { description: e.target.value })}
            />
          </Field>
          <Field label="Video URL (MP4)" hint="Direct link to the episode video file">
            <input
              className={inputClass}
              value={episode.videoUrl ?? ""}
              onChange={(e) => update(index, { videoUrl: e.target.value })}
              placeholder="https://example.com/episodes/01.mp4"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Thumbnail">
              <ImageUploadInput
                value={episode.thumbnailUrl ?? ""}
                onChange={(value) => update(index, { thumbnailUrl: value })}
                inputClassName={inputClass}
              />
            </Field>
            <Field label="Language">
              <input
                className={inputClass}
                value={episode.language ?? ""}
                onChange={(e) => update(index, { language: e.target.value })}
              />
            </Field>
            <Field label="Rating">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={episode.rating ?? ""}
                onChange={(e) =>
                  update(index, {
                    rating: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => onChange(episodes.filter((_, i) => i !== index))}
            className="cursor-pointer self-start text-xs text-red-400 hover:underline"
          >
            Remove episode
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...episodes,
            {
              seasonNumber: 1,
              number: episodes.length + 1,
              title: `Episode ${episodes.length + 1}`,
              duration: "",
              description: "",
              thumbnailUrl: "",
              language: "",
            },
          ])
        }
        className="cursor-pointer self-start rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        + Add episode
      </button>
    </Section>
  );
}

export function CharactersEditor({
  characters,
  onChange,
  contentType = "show",
}: {
  characters: ContentCharacterInput[];
  onChange: (characters: ContentCharacterInput[]) => void;
  contentType?: MediaType;
}) {
  const castFieldLabel = resolveCastCreditLabel(contentType);
  function update(index: number, patch: Partial<ContentCharacterInput>) {
    onChange(characters.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <Section title="Characters" description="Cast & characters section.">
      {characters.map((character, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={character.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <input
              className={inputClass}
              value={character.role ?? ""}
              onChange={(e) => update(index, { role: e.target.value })}
            />
          </Field>
          <Field label={castFieldLabel}>
            <input
              className={inputClass}
              value={character.voiceActor ?? ""}
              onChange={(e) => update(index, { voiceActor: e.target.value })}
            />
          </Field>
          <Field label="Image">
            <ImageUploadInput
              value={character.imageUrl ?? ""}
              onChange={(value) => update(index, { imageUrl: value })}
              inputClassName={inputClass}
            />
          </Field>
          <Field label="Accent">
            <select
              className={inputClass}
              value={character.accent ?? ""}
              onChange={(e) =>
                update(index, {
                  accent: (e.target.value || undefined) as ContentCharacterInput["accent"],
                })
              }
            >
              <option value="" className="bg-popover">None</option>
              {ACCENT_OPTIONS.map((a) => (
                <option key={a.value} value={a.value} className="bg-popover">{a.label}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onChange(characters.filter((_, i) => i !== index))}
              className="cursor-pointer text-xs text-red-400 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...characters, { name: "", role: "", voiceActor: "", imageUrl: "" }])
        }
        className="cursor-pointer self-start rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        + Add character
      </button>
    </Section>
  );
}

export function CatalogReviewsEditor({
  reviews,
  onChange,
}: {
  reviews: CatalogReviewInput[];
  onChange: (reviews: CatalogReviewInput[]) => void;
}) {
  function update(index: number, patch: Partial<CatalogReviewInput>) {
    onChange(reviews.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <Section title="Curated reviews" description="Featured reviews on the detail page.">
      {reviews.map((review, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-white/10 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Author name">
              <input
                className={inputClass}
                value={review.authorName}
                onChange={(e) => update(index, { authorName: e.target.value })}
              />
            </Field>
            <Field label="Rating">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={review.rating}
                onChange={(e) => update(index, { rating: Number(e.target.value) })}
              />
            </Field>
            <Field label="Like count">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={review.likeCount ?? ""}
                onChange={(e) =>
                  update(index, {
                    likeCount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
          </div>
          <Field label="Headline">
            <input
              className={inputClass}
              value={review.headline ?? ""}
              onChange={(e) => update(index, { headline: e.target.value })}
            />
          </Field>
          <Field label="Review body">
            <textarea
              className={`${inputClass} min-h-24 py-2`}
              value={review.body}
              onChange={(e) => update(index, { body: e.target.value })}
            />
          </Field>
          <button
            type="button"
            onClick={() => onChange(reviews.filter((_, i) => i !== index))}
            className="cursor-pointer self-start text-xs text-red-400 hover:underline"
          >
            Remove review
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...reviews,
            {
              authorName: "",
              authorAvatarColor: DEFAULT_AVATAR_COLOR,
              rating: 9,
              headline: "",
              body: "",
            },
          ])
        }
        className="cursor-pointer self-start rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        + Add review
      </button>
    </Section>
  );
}

export function BandMembersEditor({
  members,
  onChange,
}: {
  members: { name: string; role?: string; imageUrl?: string }[];
  onChange: (members: { name: string; role?: string; imageUrl?: string }[]) => void;
}) {
  function update(
    index: number,
    patch: Partial<{ name: string; role?: string; imageUrl?: string }>,
  ) {
    onChange(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  return (
    <Section
      title="Band members"
      description="Add each member with a portrait photo — shown on the artist detail page (hero member row and band section)."
    >
      {members.map((member, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
          <Field label="Member name">
            <input
              className={inputClass}
              value={member.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <input
              className={inputClass}
              value={member.role ?? ""}
              onChange={(e) => update(index, { role: e.target.value })}
              placeholder="Vocalist, Rapper…"
            />
          </Field>
          <Field
            label="Member photo"
            hint="HD portrait — appears on the artist page member cards"
          >
            <ImageUploadInput
              value={member.imageUrl ?? ""}
              onChange={(value) => update(index, { imageUrl: value })}
              inputClassName={inputClass}
            />
          </Field>
          <button
            type="button"
            onClick={() => onChange(members.filter((_, i) => i !== index))}
            className="cursor-pointer text-xs text-red-400 hover:underline sm:col-span-2"
          >
            Remove member
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...members, { name: "", role: "", imageUrl: "" }])}
        className="cursor-pointer self-start rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        + Add member
      </button>
    </Section>
  );
}
