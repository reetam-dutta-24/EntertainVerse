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
  const data = await deezer<{ data: DeezerArtistRef[] }>("/search/artist", { q: artist, limit: "1" }, 4_000);
  const match = data.data[0];
  return match && match.name.toLowerCase() === artist.toLowerCase() ? deezerPicture(match.picture_xl) : "";
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
