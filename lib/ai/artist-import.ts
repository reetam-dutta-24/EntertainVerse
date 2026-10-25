import "server-only";

import { z } from "zod";
import { ACCENT_OPTIONS, ARTIST_GENRE_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/catalog-enums";
import { activeProviderLabel, generateStructured, researchWithWeb } from "@/lib/ai/provider";
import { recordProvenance, slugify } from "@/lib/ai/import-utils";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import type { ListenLink } from "@/lib/listen-links";
import type { ArtistFormInput } from "@/lib/validators/admin/artist";
import {
  deezerPicture,
  fetchDeezerArtist,
  findDeezerArtist,
  searchDeezerArtists,
  type DeezerArtist,
} from "@/lib/catalog-import/sources/deezer";
import { findItunesArtist } from "@/lib/catalog-import/sources/itunes";
import {
  fetchMusicBrainzArtist,
  findMusicBrainzArtist,
  musicBrainzArtistDraft,
  musicBrainzFacts,
  searchMusicBrainzArtists,
} from "@/lib/catalog-import/sources/musicbrainz";
import type { ArtistImportResult, CatalogCandidate } from "@/lib/catalog-import/types";

const genreValues = ARTIST_GENRE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const languageValues = LANGUAGE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const accentValues = ACCENT_OPTIONS.map((o) => o.value) as [string, ...string[]];

/** Editorial fields the model fills; group/solo, members, photo and links are mapped in code. */
const enrichmentSchema = z.object({
  nativeTitle: z.string(),
  synopsis: z.string(),
  genreLabels: z.array(z.enum(genreValues)),
  languages: z.array(z.enum(languageValues)),
  primaryTags: z.array(z.string()),
  label: z.string(),
  debutYear: z.number().nullable(),
  accent: z.enum(accentValues),
  notes: z.array(z.string()),
});

const webDraftSchema = enrichmentSchema.extend({
  title: z.string(),
  isGroup: z.boolean(),
  members: z.array(z.object({ name: z.string(), role: z.string() })),
});

const STYLE_GUIDE = `You prepare artist profiles for EntertainVerse, a discovery app for anime, shows and their music (J-Pop, K-Pop, OST artists and more).

House style (match it exactly):
- nativeTitle: the stage name written in its original script, e.g. "트와이스" for TWICE or "ヨルシカ" for Yorushika. Never a legal or birth name; "" when the official name is already in Latin letters (e.g. LiSA) or you're unsure.
- synopsis: two short paragraphs, max 900 characters, in your own words — who they are, their sound, notable songs or anime/show tie-ins. Never quote lyrics.
- genreLabels: the 1-3 genres from the allowed list that fit best.
- languages: the languages they mainly sing in, from the allowed list.
- primaryTags: 2-4 short chips, e.g. "Duo", "Girl Group", "Anime Themes", "Singer-Songwriter".
- label: their current record label or agency, e.g. "JYP Entertainment", "Sony Music Japan"; "" if unsure.
- debutYear: the year of their debut release; null if unsure.
- accent: the palette colour that best matches their visual identity.
- notes: anything the editor should double-check before publishing.

Accuracy rules: use only the provided facts plus well-established knowledge about this exact artist. If you are not sure, leave the field empty (or null) instead of guessing.`;

function emptyForm(): ArtistFormInput {
  return {
    title: "", nativeTitle: "", slug: "", synopsis: "", imageUrl: "", rankLeft: "", rankRight: "", primaryTags: [],
    languages: [], label: "", isGroup: false, members: [], genreLabels: [], listenLinks: [], catalogReviews: [],
  };
}

export async function searchArtistSources(query: string): Promise<CatalogCandidate[]> {
  const [deezer, musicbrainz] = await Promise.all([
    searchDeezerArtists(query).catch(() => [] as CatalogCandidate[]),
    searchMusicBrainzArtists(query).catch(() => [] as CatalogCandidate[]),
  ]);
  // Deezer first (it has photos); MusicBrainz adds artists Deezer doesn't know.
  const names = new Set(deezer.map((c) => c.title.toLowerCase()));
  return [...deezer, ...musicbrainz.filter((c) => !names.has(c.title.toLowerCase()))].slice(0, 12);
}

function artistLinks(deezer: DeezerArtist | null, appleUrl?: string): ListenLink[] {
  const links: ListenLink[] = [];
  if (appleUrl) links.push({ service: "apple-music", url: appleUrl });
  if (deezer?.link) links.push({ service: "deezer", url: deezer.link });
  return links;
}

/** Import from Deezer / MusicBrainz: each source fills what the other lacks. */
export async function importArtistFromSource(
  candidate: Pick<CatalogCandidate, "source" | "sourceId">,
  report: ProgressReporter = () => {},
): Promise<ArtistImportResult> {
  const fromDeezer = candidate.source === "deezer";
  report({ label: `Fetching the artist from ${fromDeezer ? "Deezer" : "MusicBrainz"}`, percent: 5, ceiling: 12 });
  let deezer: DeezerArtist | null = null;
  let mbId: string | null = null;
  if (fromDeezer) {
    deezer = await fetchDeezerArtist(candidate.sourceId);
    mbId = await findMusicBrainzArtist(deezer.name).catch(() => null);
  } else {
    mbId = candidate.sourceId;
  }

  report({ label: "Looking up members and details on MusicBrainz", percent: 13, ceiling: 20 });
  const mb = mbId ? await fetchMusicBrainzArtist(mbId).catch((error) => (fromDeezer ? null : Promise.reject(error))) : null;
  const name = deezer?.name ?? mb?.name ?? "";

  report({ label: "Finding the photo and Apple Music / Deezer links", percent: 20, ceiling: 24 });
  const [apple, deezerMatch] = await Promise.all([
    findItunesArtist(name).catch(() => null),
    deezer ? deezer : findDeezerArtist(name).catch(() => null),
  ]);
  deezer = deezerMatch;

  const mbDraft = mb ? musicBrainzArtistDraft(mb) : null;
  const factsDraft: Partial<ArtistFormInput> = {
    title: name,
    imageUrl: deezerPicture(deezer?.picture_xl),
    listenLinks: artistLinks(deezer, apple?.url),
    ...(mbDraft ?? {}),
  };
  const facts = {
    ...(mb ? musicBrainzFacts(mb) : { name }),
    deezerFans: deezer?.nb_fan,
    deezerAlbums: deezer?.nb_album,
    appleMusicGenre: apple?.genre,
    topSongs: apple?.topSongs ?? [],
  };

  report({ label: `Drafting the profile with ${activeProviderLabel()}`, percent: 25, ceiling: 92 });
  const { notes, debutYear, ...editorial } = await generateStructured({
    system: STYLE_GUIDE,
    schema: enrichmentSchema,
    prompt: `Facts from the music sources:\n${JSON.stringify(facts, null, 2)}\n\nFill the editorial fields.`,
  });

  report({ label: "Assembling the draft", percent: 95, ceiling: 99 });
  const draft: ArtistFormInput = {
    ...emptyForm(),
    ...editorial,
    genreLabels: editorial.genreLabels as ArtistFormInput["genreLabels"],
    languages: editorial.languages as ArtistFormInput["languages"],
    accent: editorial.accent as ArtistFormInput["accent"],
    ...factsDraft,
    // Source facts win, but keep the model's value where the source had none.
    nativeTitle: factsDraft.nativeTitle || editorial.nativeTitle,
    debutYear: factsDraft.debutYear ?? debutYear ?? undefined,
  } as ArtistFormInput;
  draft.slug = slugify(draft.title);

  const provenance = recordProvenance<ArtistFormInput>({}, factsDraft, candidate.source);
  recordProvenance(provenance, { ...editorial, debutYear }, "ai");

  return {
    draft,
    provenance,
    source: candidate.source,
    sourceUrl: fromDeezer ? deezer?.link : `https://musicbrainz.org/artist/${candidate.sourceId}`,
    webSources: [],
    notes: [
      ...notes,
      ...(draft.imageUrl ? [] : ["No artist photo was found — upload one before publishing."]),
      ...(draft.isGroup && !draft.members.length ? ["MusicBrainz lists no current members — add them by hand."] : []),
      ...(mb ? [] : ["Not found on MusicBrainz — group/solo, members and debut year need checking."]),
    ],
    facts,
  };
}

/** Fallback when no music source has the artist: research on the web, then map. */
export async function importArtistFromWeb(
  query: string,
  typeHint?: string,
  report: ProgressReporter = () => {},
): Promise<ArtistImportResult> {
  report({ label: `Researching "${query}" on the web with ${activeProviderLabel()}`, percent: 4, ceiling: 50 });
  const research = await researchWithWeb(
    `Research the music ${typeHint === "group" ? "group" : typeHint === "solo" ? "solo artist" : "artist"} "${query}". ` +
      `Write a fact sheet covering: official name and original-script name, solo or group, current members and their ` +
      `roles, country, debut year, record label or agency, genres, languages they sing in, best-known songs, and any ` +
      `anime/show theme songs. Do not include any lyrics.`,
  );

  report({ label: `Drafting the profile from ${research.sources.length || "the"} web sources`, percent: 55, ceiling: 88 });
  const out = await generateStructured({
    system: `${STYLE_GUIDE}\n\nThe facts below come from web research. Every factual value must come from that fact sheet; anything marked unknown stays empty or null.`,
    schema: webDraftSchema,
    prompt: `Fact sheet:\n${research.factSheet}\n\nFill the artist profile.`,
  });

  report({ label: "Looking for a photo and listen links", percent: 90, ceiling: 98 });
  const { notes, debutYear, members, ...fields } = out;
  const [deezer, apple] = await Promise.all([
    findDeezerArtist(fields.title).catch(() => null),
    findItunesArtist(fields.title).catch(() => null),
  ]);
  const draft: ArtistFormInput = {
    ...emptyForm(),
    ...fields,
    genreLabels: fields.genreLabels as ArtistFormInput["genreLabels"],
    languages: fields.languages as ArtistFormInput["languages"],
    accent: fields.accent as ArtistFormInput["accent"],
    slug: slugify(fields.title || query),
    debutYear: debutYear ?? undefined,
    members: fields.isGroup ? members.map((m) => ({ ...m, imageUrl: "" })) : [],
    imageUrl: deezerPicture(deezer?.picture_xl),
    listenLinks: artistLinks(deezer, apple?.url),
  };

  return {
    draft,
    provenance: recordProvenance<ArtistFormInput>({}, draft, "web"),
    source: "web",
    webSources: research.sources,
    notes: [...notes, ...(draft.imageUrl ? [] : ["No artist photo was found — upload one before publishing."])],
    facts: { webFactSheet: research.factSheet },
  };
}
