import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ACCENT_OPTIONS, LANGUAGE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import { activeProviderLabel, generateStructured, researchWithWeb } from "@/lib/ai/provider";
import { formatDuration, recordProvenance, slugify } from "@/lib/ai/import-utils";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import type { MusicFormInput } from "@/lib/validators/admin/music";
import {
  fetchDeezerTrackFacts,
  findDeezerArtistPicture,
  findDeezerTrackLink,
  searchDeezerTracks,
} from "@/lib/catalog-import/sources/deezer";
import {
  fetchItunesTrackFacts,
  findItunesTrack,
  itunesTrackDraft,
  searchItunesTracks,
} from "@/lib/catalog-import/sources/itunes";
import type { CatalogCandidate, MusicImportResult, SourceFacts } from "@/lib/catalog-import/types";

const genreValues = SONG_GENRE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const languageValues = LANGUAGE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const accentValues = ACCENT_OPTIONS.map((o) => o.value) as [string, ...string[]];

/** Editorial fields the model fills; facts (duration, art, preview, links) are mapped in code. */
const enrichmentSchema = z.object({
  kind: z.enum(["song", "ost"]),
  nativeTitle: z.string(),
  description: z.string(),
  genreLabels: z.array(z.enum(genreValues)),
  language: z.enum([...languageValues, ""] as [string, ...string[]]),
  source: z.string(),
  creditLabel: z.string(),
  accent: z.enum(accentValues),
  notes: z.array(z.string()),
});

const webDraftSchema = enrichmentSchema.extend({
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  year: z.number().nullable(),
  durationSeconds: z.number().nullable(),
});

const STYLE_GUIDE = `You prepare song entries for AniVerse, a discovery app for anime, shows and their music (J-Pop, K-Pop, OSTs and more).

House style (match it exactly):
- kind: "ost" when the song is an opening, ending, insert song or soundtrack of an anime, show, film or game; otherwise "song".
- nativeTitle: the original-script title (e.g. Japanese or Korean) if it differs from the title; otherwise "".
- description: one or two sentences, max 280 characters, in your own words — what the song is and why it stands out. Never quote lyrics.
- genreLabels: the 1-3 genres from the allowed list that fit best ("ost" for anime/show soundtracks, plus its musical genre).
- language: the main sung language from the allowed list, or "" if instrumental or unsure.
- source: for an OST, the title it belongs to and its role, e.g. "Oshi no Ko — Opening 1"; otherwise "".
- creditLabel: short credit line such as "Performed by YOASOBI · Written by Ayase", or "" if unclear.
- accent: the palette colour that best matches the cover art / mood.
- notes: anything the editor should double-check before publishing.

Accuracy rules: use only the provided facts plus well-established knowledge about this exact song. If you are not sure, leave the field empty instead of guessing. Never write or reproduce lyrics.`;

const NO_LYRICS_NOTE = "Lyrics are never imported (they're copyrighted) — only paste lyrics you're licensed to display.";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export async function searchMusicSources(query: string): Promise<CatalogCandidate[]> {
  const [apple, deezer] = await Promise.all([
    searchItunesTracks(query).catch(() => [] as CatalogCandidate[]),
    searchDeezerTracks(query).catch(() => [] as CatalogCandidate[]),
  ]);
  // Apple first (its preview clips last); skip Deezer hits for the same song.
  const seen = new Set(apple.map((c) => norm(`${c.title}|${c.kindLabel}`)));
  const merged = [...apple];
  for (const candidate of deezer) {
    if (!seen.has(norm(`${candidate.title}|${candidate.kindLabel}`))) merged.push(candidate);
  }
  return merged.slice(0, 12);
}

function emptyForm(): MusicFormInput {
  return {
    title: "", nativeTitle: "", slug: "", artist: "", artistSlug: "", kind: "song", description: "", lyrics: "",
    source: "", album: "", language: "", genreLabels: [], durationLabel: "", imageUrl: "", backdropUrl: "",
    audioUrl: "", previewUrl: "", listenLinks: [], trendingLabel: "", creditLabel: "", contentSlug: "", catalogReviews: [],
  };
}

/** Link the track to an existing artist profile when the name matches. */
async function matchArtistSlug(artist: string) {
  if (!artist.trim()) return "";
  const match = await prisma.artist.findFirst({
    where: { OR: [{ title: { equals: artist, mode: "insensitive" } }, { slug: slugify(artist) }] },
    select: { slug: true },
  });
  return match?.slug ?? "";
}

/** Fill the gaps one source leaves from the other: preview + Apple link, Deezer link, artist photo. */
async function crossLink(draft: Partial<MusicFormInput>, from: "itunes" | "deezer" | "web") {
  const artist = draft.artist ?? "";
  const title = draft.title ?? "";
  if (!artist || !title) return draft;
  const links = [...(draft.listenLinks ?? [])];
  const [apple, deezerLink, picture] = await Promise.all([
    from === "itunes" ? null : findItunesTrack(artist, title).catch(() => null),
    from === "deezer" ? null : findDeezerTrackLink(artist, title).catch(() => null),
    draft.backdropUrl ? draft.backdropUrl : findDeezerArtistPicture(artist).catch(() => ""),
  ]);
  const merged: Partial<MusicFormInput> = { ...draft, backdropUrl: picture };
  if (apple) {
    const appleDraft = itunesTrackDraft(apple);
    merged.previewUrl = appleDraft.previewUrl;
    links.unshift(...(appleDraft.listenLinks ?? []));
    merged.imageUrl ||= appleDraft.imageUrl;
    merged.durationSeconds ??= appleDraft.durationSeconds;
    merged.durationLabel ||= appleDraft.durationLabel;
  }
  if (deezerLink && !links.some((l) => l.service === "deezer")) links.push({ service: "deezer", url: deezerLink });
  merged.listenLinks = links;
  return merged;
}

/** Import from Apple Music / Deezer: facts mapped in code, editorial fields by the model. */
export async function importMusicFromSource(
  candidate: Pick<CatalogCandidate, "source" | "sourceId">,
  report: ProgressReporter = () => {},
): Promise<MusicImportResult> {
  const fromApple = candidate.source === "itunes";
  report({ label: `Fetching the track from ${fromApple ? "Apple Music" : "Deezer"}`, percent: 5, ceiling: 15 });
  const source: SourceFacts<MusicFormInput> = fromApple
    ? await fetchItunesTrackFacts(candidate.sourceId)
    : await fetchDeezerTrackFacts(candidate.sourceId);

  report({ label: "Finding the official preview and listen links", percent: 16, ceiling: 24 });
  const [factsDraft, artistSlug] = await Promise.all([
    crossLink(source.draft, fromApple ? "itunes" : "deezer"),
    matchArtistSlug(source.draft.artist ?? ""),
  ]);

  report({ label: `Drafting the editorial fields with ${activeProviderLabel()}`, percent: 25, ceiling: 92 });
  const { notes, ...editorial } = await generateStructured({
    system: STYLE_GUIDE,
    schema: enrichmentSchema,
    prompt: `Facts from ${fromApple ? "Apple Music" : "Deezer"}:\n${JSON.stringify(source.facts, null, 2)}\n\nFill the editorial fields.`,
  });

  report({ label: "Assembling the draft", percent: 95, ceiling: 99 });
  const draft: MusicFormInput = {
    ...emptyForm(),
    ...factsDraft,
    ...editorial,
    language: editorial.language as MusicFormInput["language"],
    genreLabels: editorial.genreLabels as MusicFormInput["genreLabels"],
    accent: editorial.accent as MusicFormInput["accent"],
    artistSlug,
  };
  draft.slug = slugify(`${draft.title} ${draft.artist}`);

  const provenance = recordProvenance<MusicFormInput>({}, { ...factsDraft, artistSlug }, source.source);
  recordProvenance(provenance, editorial, "ai");

  return {
    draft,
    provenance,
    source: source.source,
    sourceUrl: source.sourceUrl,
    webSources: [],
    notes: [
      ...notes,
      ...(draft.previewUrl ? [] : ["No official preview clip was found — the player will use a demo track until you add audio."]),
      NO_LYRICS_NOTE,
    ],
    facts: source.facts,
  };
}

/** Fallback when neither store has the song: research on the web, then map. */
export async function importMusicFromWeb(
  query: string,
  typeHint?: string,
  report: ProgressReporter = () => {},
): Promise<MusicImportResult> {
  report({ label: `Researching "${query}" on the web with ${activeProviderLabel()}`, percent: 4, ceiling: 50 });
  const research = await researchWithWeb(
    `Research the ${typeHint === "ost" ? "anime/show theme song or soundtrack" : "song"} "${query}". Write a fact sheet ` +
      `covering: official title and original-script title, performing artist, album, release date, duration, sung ` +
      `language, genres, composer/lyricist/arranger, and — if it is an OST — which title it belongs to and its role ` +
      `(opening, ending, insert song). Do not include any lyrics.`,
  );

  report({ label: `Drafting the entry from ${research.sources.length || "the"} web sources`, percent: 55, ceiling: 88 });
  const out = await generateStructured({
    system: `${STYLE_GUIDE}\n\nThe facts below come from web research. Every factual value must come from that fact sheet; anything marked unknown stays empty or null.`,
    schema: webDraftSchema,
    prompt: `Fact sheet:\n${research.factSheet}\n\nFill the song entry.`,
  });

  report({ label: "Looking for the official preview and listen links", percent: 90, ceiling: 98 });
  const { notes, year, durationSeconds, ...fields } = out;
  const linked = await crossLink({ title: fields.title, artist: fields.artist }, "web");
  const draft: MusicFormInput = {
    ...emptyForm(),
    ...fields,
    language: fields.language as MusicFormInput["language"],
    genreLabels: fields.genreLabels as MusicFormInput["genreLabels"],
    accent: fields.accent as MusicFormInput["accent"],
    year: year ?? undefined,
    durationSeconds: durationSeconds ?? linked.durationSeconds,
    durationLabel: durationSeconds ? formatDuration(durationSeconds) : (linked.durationLabel ?? ""),
    imageUrl: linked.imageUrl ?? "",
    backdropUrl: linked.backdropUrl ?? "",
    previewUrl: linked.previewUrl ?? "",
    listenLinks: linked.listenLinks ?? [],
    artistSlug: await matchArtistSlug(fields.artist),
    slug: slugify(`${fields.title || query} ${fields.artist}`),
  };

  return {
    draft,
    provenance: recordProvenance<MusicFormInput>({}, draft, "web"),
    source: "web",
    webSources: research.sources,
    notes: [...notes, NO_LYRICS_NOTE],
    facts: { webFactSheet: research.factSheet },
  };
}
