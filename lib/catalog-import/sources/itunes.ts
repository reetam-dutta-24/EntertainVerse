import "server-only";

import { formatDuration } from "@/lib/ai/import-utils";
import type { ListenLink } from "@/lib/listen-links";
import type { CatalogCandidate, SourceFacts } from "@/lib/catalog-import/types";
import type { MusicFormInput } from "@/lib/validators/admin/music";

/**
 * Apple's public iTunes Search API — no key. Reachable from India (unlike
 * Deezer's track search), and its 30-second previews are stable official clips
 * that may be streamed in-app with a link back to Apple Music.
 */
const API = "https://itunes.apple.com";

const region = () => (process.env.WATCH_REGION || "IN").toUpperCase();

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artistId?: number;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
  artistViewUrl?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  trackExplicitness?: string;
}

async function itunes<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries({ country: region(), ...params })) url.searchParams.set(key, value);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`iTunes ${path} failed (${response.status})`);
  return (await response.json()) as T;
}

/** Full-size artwork: Apple serves any size by rewriting the thumbnail path. */
export function itunesArtwork(url?: string, size = 1000) {
  return url ? url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`) : "";
}

/** Drop Apple's affiliate tracking parameter. */
function cleanAppleUrl(url?: string) {
  return url ? url.replace(/[?&]uo=\d+/, "").replace(/\?$/, "") : "";
}

/** "Idol - Single" → "" (singles have no album), "THE BOOK - EP" → "THE BOOK". */
function albumName(collection: string | undefined, title: string) {
  const name = (collection ?? "").replace(/\s+-\s+(Single|EP)$/i, "").trim();
  return /\s-\s+Single$/i.test(collection ?? "") || name.toLowerCase() === title.toLowerCase() ? "" : name;
}

export async function searchItunesTracks(query: string): Promise<CatalogCandidate[]> {
  const data = await itunes<{ results: ItunesTrack[] }>("/search", { term: query, entity: "song", limit: "10" });
  return data.results.map((t) => ({
    source: "itunes",
    sourceId: String(t.trackId),
    title: t.trackName,
    year: t.releaseDate ? Number(t.releaseDate.slice(0, 4)) : undefined,
    kindLabel: t.artistName,
    overview: [t.collectionName, t.primaryGenreName].filter(Boolean).join(" · "),
    imageUrl: itunesArtwork(t.artworkUrl100, 200),
  }));
}

/** Best match for a song we found elsewhere — used to attach the preview and Apple link. */
export async function findItunesTrack(artist: string, title: string): Promise<ItunesTrack | null> {
  const data = await itunes<{ results: ItunesTrack[] }>("/search", { term: `${artist} ${title}`, entity: "song", limit: "5" });
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  return (
    data.results.find((t) => norm(t.trackName) === norm(title) && norm(t.artistName).includes(norm(artist).slice(0, 6))) ??
    data.results.find((t) => norm(t.trackName).startsWith(norm(title))) ??
    null
  );
}

/** The parts of an iTunes track that map straight into the form. */
export function itunesTrackDraft(t: ItunesTrack): Partial<MusicFormInput> {
  const seconds = t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : undefined;
  const listenLinks: ListenLink[] = t.trackViewUrl ? [{ service: "apple-music", url: cleanAppleUrl(t.trackViewUrl) }] : [];
  return {
    title: t.trackName,
    artist: t.artistName,
    album: albumName(t.collectionName, t.trackName),
    year: t.releaseDate ? Number(t.releaseDate.slice(0, 4)) : undefined,
    durationSeconds: seconds,
    durationLabel: seconds ? formatDuration(seconds) : "",
    imageUrl: itunesArtwork(t.artworkUrl100),
    previewUrl: t.previewUrl ?? "",
    listenLinks,
  };
}

export async function fetchItunesTrackFacts(id: string): Promise<SourceFacts<MusicFormInput>> {
  const data = await itunes<{ results: ItunesTrack[] }>("/lookup", { id });
  const t = data.results[0];
  if (!t) throw new Error("That track is no longer on Apple Music.");
  return {
    source: "itunes",
    sourceId: id,
    sourceUrl: cleanAppleUrl(t.trackViewUrl),
    draft: itunesTrackDraft(t),
    facts: {
      title: t.trackName,
      artist: t.artistName,
      album: albumName(t.collectionName, t.trackName) || "none (released as a single)",
      releaseDate: t.releaseDate?.slice(0, 10),
      storeGenre: t.primaryGenreName,
      durationSeconds: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : undefined,
      explicit: t.trackExplicitness === "explicit",
    },
  };
}
