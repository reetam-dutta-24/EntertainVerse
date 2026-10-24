import "server-only";

import { formatDuration } from "@/lib/ai/import-utils";
import type { CatalogCandidate, SourceFacts } from "@/lib/catalog-import/types";
import type { MusicFormInput } from "@/lib/validators/admin/music";

/**
 * Deezer's public API — no key. Artist data works everywhere; track search
 * returns no rows from regions where Deezer isn't licensed (e.g. India), so the
 * importer treats it as a bonus source. Its preview URLs are signed and expire,
 * so they are never stored — the iTunes preview is used instead.
 */
const API = "https://api.deezer.com";

interface DeezerArtistRef {
  id: number;
  name: string;
  link?: string;
  picture_xl?: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  title_short?: string;
  link: string;
  duration?: number;
  release_date?: string;
  isrc?: string;
  explicit_lyrics?: boolean;
  artist: DeezerArtistRef;
  album?: { id: number; title: string; cover_xl?: string; release_date?: string };
  contributors?: { name: string; role?: string }[];
}

async function deezer<T>(path: string, params: Record<string, string> = {}, timeoutMs = 10_000): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Deezer ${path} failed (${response.status})`);
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (data.error) throw new Error(`Deezer: ${data.error.message ?? "request failed"}`);
  return data;
}

/** Deezer answers artists without a photo with a blank placeholder path. */
export function deezerPicture(url?: string) {
  return url && !/\/images\/artist\/\//.test(url) ? url : "";
}

export async function searchDeezerTracks(query: string): Promise<CatalogCandidate[]> {
  const data = await deezer<{ data: DeezerTrack[] }>("/search", { q: query, limit: "10" });
  return data.data.map((t) => ({
    source: "deezer",
    sourceId: String(t.id),
    title: t.title,
    kindLabel: t.artist.name,
    overview: t.album?.title,
    imageUrl: t.album?.cover_xl,
  }));
}

/** Deezer link for a song found elsewhere — best effort, short timeout. */
export async function findDeezerTrackLink(artist: string, title: string): Promise<string | null> {
  const data = await deezer<{ data: DeezerTrack[] }>("/search", { q: `artist:"${artist}" track:"${title}"`, limit: "1" }, 4_000);
  return data.data[0]?.link ?? null;
}

/** An artist photo for the track backdrop — best effort, short timeout. */
export async function findDeezerArtistPicture(artist: string): Promise<string> {
  return deezerPicture((await findDeezerArtist(artist))?.picture_xl);
}

export async function fetchDeezerTrackFacts(id: string): Promise<SourceFacts<MusicFormInput>> {
  const t = await deezer<DeezerTrack>(`/track/${encodeURIComponent(id)}`);
  const releaseDate = t.release_date ?? t.album?.release_date;
  const album = t.album?.title && t.album.title.toLowerCase() !== t.title.toLowerCase() ? t.album.title : "";
  return {
    source: "deezer",
    sourceId: id,
    sourceUrl: t.link,
    draft: {
      title: t.title_short || t.title,
      artist: t.artist.name,
      album,
      year: releaseDate ? Number(releaseDate.slice(0, 4)) : undefined,
      durationSeconds: t.duration,
      durationLabel: t.duration ? formatDuration(t.duration) : "",
      imageUrl: t.album?.cover_xl ?? "",
      backdropUrl: deezerPicture(t.artist.picture_xl),
      listenLinks: [{ service: "deezer", url: t.link }],
    },
    facts: {
      title: t.title,
      artist: t.artist.name,
      album: album || "none (released as a single)",
      releaseDate,
      isrc: t.isrc,
      durationSeconds: t.duration,
      explicit: t.explicit_lyrics,
      contributors: t.contributors?.map((c) => c.name),
    },
  };
}

// ---- artists (work in every region) -------------------------------------------------

export interface DeezerArtist extends DeezerArtistRef {
  nb_fan?: number;
  nb_album?: number;
}

const fans = (n?: number) =>
  n ? `${new Intl.NumberFormat("en", { notation: "compact" }).format(n)} fans on Deezer` : undefined;

export async function searchDeezerArtists(query: string): Promise<CatalogCandidate[]> {
  const data = await deezer<{ data: DeezerArtist[] }>("/search/artist", { q: query, limit: "15" });
  // Deezer's own ranking buries big names under exact-spelling lookalikes; fans are a better signal.
  const ranked = [...data.data].sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0)).slice(0, 6);
  return ranked.map((a) => ({
    source: "deezer",
    sourceId: String(a.id),
    title: a.name,
    kindLabel: "Artist",
    overview: fans(a.nb_fan),
    imageUrl: deezerPicture(a.picture_xl) || undefined,
  }));
}

export function fetchDeezerArtist(id: string) {
  return deezer<DeezerArtist>(`/artist/${encodeURIComponent(id)}`);
}

/** Deezer profile for an artist found elsewhere — best effort, short timeout. */
export async function findDeezerArtist(name: string): Promise<DeezerArtist | null> {
  const data = await deezer<{ data: DeezerArtist[] }>("/search/artist", { q: name, limit: "10" }, 4_000);
  const byFans = (list: DeezerArtist[]) => list.sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
  // Exact spelling first ("LiSA" vs "LISA"), then any casing.
  return (
    byFans(data.data.filter((a) => a.name === name)) ??
    byFans(data.data.filter((a) => a.name.toLowerCase() === name.toLowerCase())) ??
    null
  );
}
