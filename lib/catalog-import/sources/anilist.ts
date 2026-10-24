import "server-only";

import type { ContentFormInput } from "@/lib/validators/admin/content";
import type { CatalogCandidate, SourceFacts } from "@/lib/catalog-import/types";

/**
 * AniList (public GraphQL, no key) for anime, plus Jikan (MyAnimeList mirror,
 * no key) for the real MAL score and broadcast slot when an MAL id exists.
 */

const ANILIST = "https://graphql.anilist.co";
const JIKAN = "https://api.jikan.moe/v4";

async function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`AniList ${response.status}`);
  const body = (await response.json()) as { data: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`AniList: ${body.errors[0]!.message}`);
  return body.data;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthYear(date?: { year?: number | null; month?: number | null } | null) {
  if (!date?.year) return undefined;
  return date.month ? `${MONTHS[date.month - 1]} ${date.year}` : String(date.year);
}

/** AniList descriptions contain <br> and <i> tags. */
function plain(text?: string | null) {
  return (text ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function searchAnilist(query: string): Promise<CatalogCandidate[]> {
  const data = await anilist<{
    Page: {
      media: {
        id: number;
        title: { romaji?: string; english?: string; native?: string };
        startDate: { year?: number };
        format?: string;
        coverImage: { large?: string };
        description?: string;
      }[];
    };
  }>(
    `query ($search: String) {
      Page(perPage: 8) {
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
          id title { romaji english native } startDate { year } format
          coverImage { large } description(asHtml: false)
        }
      }
    }`,
    { search: query },
  );
  return data.Page.media.map((m) => ({
    source: "anilist" as const,
    sourceId: String(m.id),
    title: m.title.english || m.title.romaji || "Untitled",
    originalTitle: m.title.native,
    year: m.startDate.year,
    kindLabel: m.format === "MOVIE" ? "Anime film" : "Anime",
    overview: plain(m.description).slice(0, 220),
    imageUrl: m.coverImage.large,
  }));
}

interface AnilistMedia {
  id: number;
  idMal?: number | null;
  siteUrl: string;
  title: { romaji?: string; english?: string; native?: string };
  description?: string;
  format?: string;
  status?: string;
  episodes?: number | null;
  duration?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate: { year?: number; month?: number; day?: number };
  endDate: { year?: number; month?: number; day?: number };
  averageScore?: number | null;
  genres: string[];
  tags: { name: string; rank: number; isMediaSpoiler: boolean }[];
  studios: { nodes: { name: string }[] };
  countryOfOrigin?: string;
  source?: string;
  coverImage: { extraLarge?: string };
  bannerImage?: string | null;
  nextAiringEpisode?: { airingAt: number; episode: number } | null;
  streamingEpisodes: { title: string; thumbnail?: string }[];
  characters: {
    edges: {
      role: string;
      node: { name: { full: string }; image: { large?: string } };
      voiceActors: { name: { full: string } }[];
    }[];
  };
  staff: { edges: { role: string; node: { name: { full: string } } }[] };
}

export async function fetchAnilistFacts(id: string): Promise<SourceFacts> {
  const { Media: m } = await anilist<{ Media: AnilistMedia }>(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id idMal siteUrl title { romaji english native } description(asHtml: false)
        format status episodes duration season seasonYear
        startDate { year month day } endDate { year month day } averageScore genres
        tags { name rank isMediaSpoiler } studios(isMain: true) { nodes { name } }
        countryOfOrigin source coverImage { extraLarge } bannerImage
        nextAiringEpisode { airingAt episode }
        streamingEpisodes { title thumbnail }
        characters(perPage: 8, sort: [ROLE, RELEVANCE]) {
          edges { role node { name { full } image { large } } voiceActors(language: JAPANESE, sort: [RELEVANCE]) { name { full } } }
        }
        staff(perPage: 50, sort: [RELEVANCE]) { edges { role node { name { full } } } }
      }
    }`,
    { id: Number(id) },
  );

  // MAL score / broadcast slot / age rating come from Jikan when available.
  let mal: { score?: number; rating?: string; broadcast?: { day?: string; time?: string; string?: string } } = {};
  if (m.idMal) {
    // Best effort — a slow MAL mirror must not hold up the import.
    mal = await fetch(`${JIKAN}/anime/${m.idMal}`, { cache: "no-store", signal: AbortSignal.timeout(4_000) })
      .then((r) => (r.ok ? r.json() : { data: {} }))
      .then((body: { data: typeof mal }) => body.data ?? {})
      .catch(() => ({}));
  }

  const staffWith = (pattern: RegExp) =>
    m.staff.edges.filter((e) => pattern.test(e.role)).map((e) => e.node.name.full);
  const isMovie = m.format === "MOVIE";
  const title = m.title.english || m.title.romaji || "Untitled";
  const finished = m.status === "FINISHED";

  // Only real episode titles (from licensed streaming listings) — never invented ones.
  const episodes = m.streamingEpisodes
    .map((e, index) => {
      const match = e.title.match(/Episode\s+(\d+)\s*[-–:]\s*(.+)/i);
      return match
        ? { number: Number(match[1]), title: match[2]!.trim(), thumbnailUrl: e.thumbnail ?? "" }
        : { number: index + 1, title: e.title, thumbnailUrl: e.thumbnail ?? "" };
    })
    .sort((a, b) => a.number - b.number)
    .map((e) => ({
      seasonNumber: 1,
      number: e.number,
      title: e.title,
      duration: m.duration ? `${m.duration} Min` : "",
      description: "",
      thumbnailUrl: e.thumbnailUrl,
      videoUrl: "",
      releaseDate: "",
      language: "" as const,
      rating: undefined,
    }));

  const draft: Partial<ContentFormInput> = {
    title,
    nativeTitle: m.title.native ?? "",
    type: isMovie ? "movie" : "anime",
    imageUrl: m.coverImage.extraLarge ?? "",
    backdropUrl: m.bannerImage ?? "",
    year: m.startDate.year,
    rating: m.averageScore ? Math.round(m.averageScore) / 10 : undefined,
    malScore: typeof mal.score === "number" ? mal.score : undefined,
    studio: m.studios.nodes[0]?.name ?? "",
    director: staffWith(/^Director$/i).slice(0, 2).join(", "),
    composer: staffWith(/^Music$/i).slice(0, 2).join(", "),
    originalAuthor: staffWith(/Original Creator|Original Story/i).slice(0, 2).join(", "),
    airedFrom: monthYear(m.startDate) ?? "",
    airedTo: finished && !isMovie ? (monthYear(m.endDate) ?? "") : "",
    episodeDuration: m.duration ? (isMovie ? `${Math.floor(m.duration / 60)}h ${m.duration % 60}m` : `${m.duration} Min`) : "",
    seasonCount: isMovie ? undefined : 1,
    episodeCount: isMovie ? undefined : (m.episodes ?? undefined),
    meta: isMovie ? "Feature Film" : `1 Season, ${m.episodes ?? "?"} Episodes`,
    seasonLabel: isMovie ? "" : "Season 1",
    seasons: isMovie ? [] : [{ label: "Season 1", episodeCount: m.episodes ?? undefined }],
    episodes: isMovie ? [] : episodes,
    characters: m.characters.edges.map((e) => ({
      name: e.node.name.full,
      role: e.role === "MAIN" ? "Main" : "Supporting",
      voiceActor: e.voiceActors[0]?.name.full ?? "",
      imageUrl: e.node.image.large ?? "",
    })),
  };

  return {
    source: "anilist",
    sourceId: id,
    sourceUrl: m.siteUrl,
    draft,
    facts: {
      kind: isMovie ? "anime film" : "anime series",
      titleEnglish: m.title.english, titleRomaji: m.title.romaji, titleNative: m.title.native,
      description: plain(m.description).slice(0, 2000), format: m.format, status: m.status,
      episodes: m.episodes, durationMinutes: m.duration, season: m.season, seasonYear: m.seasonYear,
      startDate: m.startDate, endDate: m.endDate, genres: m.genres,
      tags: m.tags.filter((t) => !t.isMediaSpoiler && t.rank >= 60).map((t) => t.name).slice(0, 10),
      studios: m.studios.nodes.map((s) => s.name), countryOfOrigin: m.countryOfOrigin, source: m.source,
      nextAiringEpisode: m.nextAiringEpisode
        ? { episode: m.nextAiringEpisode.episode, airingAt: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() }
        : null,
      malScore: mal.score, malAgeRating: mal.rating, malBroadcast: mal.broadcast?.string,
      anilistAverageScore: m.averageScore,
    },
  };
}
