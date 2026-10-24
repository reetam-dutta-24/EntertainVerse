import "server-only";

import type { CatalogCandidate } from "@/lib/catalog-import/types";

/**
 * MusicBrainz — open music encyclopedia, no key. Its rules: a descriptive
 * User-Agent and at most one request per second, so calls are queued.
 */
const API = "https://musicbrainz.org/ws/2";
const USER_AGENT = `AniVerse/1.0 ( ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"} )`;

let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCall = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function musicbrainz<T>(path: string, params: Record<string, string>, retry = true): Promise<T> {
  const result = await throttled(async () => {
    const url = new URL(`${API}${path}`);
    for (const [key, value] of Object.entries({ fmt: "json", ...params })) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    // 503 is MusicBrainz's "slow down" — signal one retry after a pause.
    if (response.status === 503 && retry) return null;
    if (!response.ok) throw new Error(`MusicBrainz ${path} failed (${response.status})`);
    return (await response.json()) as T;
  });
  if (result !== null) return result;
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  return musicbrainz<T>(path, params, false);
}

interface MbArtistHit {
  id: string;
  name: string;
  type?: string;
  country?: string;
  score?: number;
  disambiguation?: string;
  "life-span"?: { begin?: string; end?: string | null; ended?: boolean | null };
}

export interface MbArtist extends MbArtistHit {
  aliases?: { name: string; locale?: string | null; primary?: boolean | null; type?: string | null }[];
  genres?: { name: string; count: number }[];
  relations?: {
    type: string;
    direction: "forward" | "backward";
    ended?: boolean;
    attributes?: string[];
    /** "Credited as" — usually the romanised stage name (e.g. DAHYUN for 다현). */
    "target-credit"?: string;
    artist?: { id: string; name: string };
  }[];
}

const LOCALE_FOR_COUNTRY: Record<string, string> = { JP: "ja", KR: "ko", CN: "zh", TW: "zh", HK: "zh" };

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code?: string) {
  if (!code || code === "XW" || code === "XE") return "";
  try {
    return COUNTRY_NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}

export async function searchMusicBrainzArtists(query: string): Promise<CatalogCandidate[]> {
  const data = await musicbrainz<{ artists: MbArtistHit[] }>("/artist", { query, limit: "6" });
  return data.artists.map((a) => ({
    source: "musicbrainz",
    sourceId: a.id,
    title: a.name,
    year: a.type === "Group" && a["life-span"]?.begin ? Number(a["life-span"].begin.slice(0, 4)) : undefined,
    kindLabel: a.type ?? "Artist",
    overview: [a.disambiguation, countryName(a.country)].filter(Boolean).join(" · "),
  }));
}

/** Closest MusicBrainz artist for a name found elsewhere (exact name, high score). */
export async function findMusicBrainzArtist(name: string): Promise<string | null> {
  const data = await musicbrainz<{ artists: MbArtistHit[] }>("/artist", { query: `artist:"${name}"`, limit: "10" });
  const strong = data.artists.filter((a) => (a.score ?? 0) >= 90);
  // Exact spelling first ("LiSA" vs "Lisa"), then any casing.
  const match = strong.find((a) => a.name === name) ?? strong.find((a) => a.name.toLowerCase() === name.toLowerCase());
  return match?.id ?? null;
}

export function fetchMusicBrainzArtist(id: string) {
  return musicbrainz<MbArtist>(`/artist/${encodeURIComponent(id)}`, { inc: "artist-rels+aliases+genres" });
}

/** Facts mapped straight into the form: group/solo, debut, members, native name. */
export function musicBrainzArtistDraft(a: MbArtist) {
  const isGroup = a.type === "Group" || a.type === "Orchestra" || a.type === "Choir";
  const locale = a.country ? LOCALE_FOR_COUNTRY[a.country] : undefined;
  const native = locale
    ? (a.aliases ?? []).find(
        // Stage names only — never a legal/birth name.
        (alias) => alias.locale === locale && alias.primary && alias.type !== "Legal name" && alias.name !== a.name,
      )?.name
    : undefined;
  const members = isGroup
    ? (a.relations ?? [])
        .filter((r) => r.type === "member of band" && r.direction === "backward" && r.artist && !r.ended)
        .map((r) => ({
          name: r["target-credit"] || r.artist!.name,
          role: (r.attributes ?? []).filter((attr) => attr !== "original" && attr !== "founder").join(", "),
          imageUrl: "",
        }))
    : [];
  return {
    title: a.name,
    nativeTitle: native ?? "",
    isGroup,
    // For people MusicBrainz "begin" is the birth date, not a debut.
    debutYear: isGroup && a["life-span"]?.begin ? Number(a["life-span"].begin.slice(0, 4)) : undefined,
    members,
  };
}

export function musicBrainzFacts(a: MbArtist) {
  return {
    name: a.name,
    type: a.type,
    country: countryName(a.country),
    disambiguation: a.disambiguation,
    formedOrBorn: a["life-span"]?.begin,
    ended: a["life-span"]?.ended ?? false,
    genres: (a.genres ?? []).sort((x, y) => y.count - x.count).slice(0, 8).map((g) => g.name),
    aliases: (a.aliases ?? [])
      .slice(0, 8)
      .map((alias) => `${alias.name} (${[alias.locale, alias.type].filter(Boolean).join(", ") || "alias"})`),
  };
}
