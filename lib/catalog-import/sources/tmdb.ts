import "server-only";

import type { ContentFormInput } from "@/lib/validators/admin/content";
import type { CatalogCandidate, SourceFacts } from "@/lib/catalog-import/types";

/**
 * TMDB (themoviedb.org) — movies, shows, K-dramas, documentaries.
 * Needs TMDB_API_KEY (v3 key) or TMDB_READ_ACCESS_TOKEN (v4 bearer token).
 * Attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB."
 */

const API = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p/original";
const MAX_SEASONS_WITH_EPISODES = 4;

export function isTmdbConfigured() {
  return Boolean(process.env.TMDB_API_KEY || process.env.TMDB_READ_ACCESS_TOKEN);
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.TMDB_READ_ACCESS_TOKEN) {
    headers.authorization = `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`;
  } else if (process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
  const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`TMDB ${response.status} on ${path}`);
  return response.json() as Promise<T>;
}

const image = (path?: string | null) => (path ? `${IMAGE}${path}` : undefined);
const yearOf = (date?: string | null) => (date ? Number(date.slice(0, 4)) || undefined : undefined);

/** "2020-10-03" → "Oct 2020" (the catalog's date style). */
function monthYear(date?: string | null) {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function minutesLabel(minutes?: number | null, movie = false) {
  if (!minutes) return undefined;
  if (!movie) return `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

interface TmdbSearchResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  origin_country?: string[];
  genre_ids?: number[];
}

export async function searchTmdb(query: string): Promise<CatalogCandidate[]> {
  if (!isTmdbConfigured()) return [];
  const data = await tmdb<{ results: TmdbSearchResult[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 8)
    .map((r) => {
      const isTv = r.media_type === "tv";
      const korean = r.origin_country?.includes("KR");
      const animated = r.genre_ids?.includes(16) && r.origin_country?.includes("JP");
      return {
        source: "tmdb" as const,
        sourceId: String(r.id),
        tmdbKind: isTv ? ("tv" as const) : ("movie" as const),
        title: (isTv ? r.name : r.title) ?? "Untitled",
        originalTitle: isTv ? r.original_name : r.original_title,
        year: yearOf(isTv ? r.first_air_date : r.release_date),
        kindLabel: animated ? "Anime" : korean && isTv ? "K-Drama" : isTv ? "Show" : "Movie",
        overview: r.overview?.slice(0, 220),
        imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : undefined,
      };
    });
}

interface Person {
  name: string;
  job?: string;
  character?: string;
  roles?: { character: string }[];
  profile_path?: string | null;
}

export async function fetchTmdbFacts(id: string, kind: "movie" | "tv"): Promise<SourceFacts> {
  if (kind === "movie") {
    const m = await tmdb<{
      id: number; title: string; original_title: string; overview: string; tagline?: string;
      release_date?: string; runtime?: number; status?: string; vote_average?: number;
      genres: { name: string }[]; poster_path?: string; backdrop_path?: string;
      production_companies: { name: string }[]; production_countries: { name: string }[];
      spoken_languages: { english_name: string }[]; original_language: string;
      credits: { cast: Person[]; crew: Person[] };
      release_dates: { results: { iso_3166_1: string; release_dates: { certification: string }[] }[] };
    }>(`/movie/${id}`, { append_to_response: "credits,release_dates" });

    const crew = (job: string) => m.credits.crew.filter((p) => p.job === job).map((p) => p.name);
    const certification = m.release_dates.results
      .find((r) => r.iso_3166_1 === "US")
      ?.release_dates.find((d) => d.certification)?.certification;

    const draft: Partial<ContentFormInput> = {
      title: m.title,
      nativeTitle: m.original_title !== m.title ? m.original_title : "",
      type: "movie",
      imageUrl: image(m.poster_path) ?? "",
      backdropUrl: image(m.backdrop_path) ?? "",
      year: yearOf(m.release_date),
      rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : undefined,
      studio: m.production_companies[0]?.name ?? "",
      director: crew("Director").slice(0, 2).join(", "),
      composer: crew("Original Music Composer").slice(0, 2).join(", "),
      producers: crew("Producer").slice(0, 3).join(", "),
      country: m.production_countries[0]?.name ?? "",
      airedFrom: monthYear(m.release_date) ?? "",
      episodeDuration: minutesLabel(m.runtime, true) ?? "",
      meta: "Feature Film",
      characters: m.credits.cast.slice(0, 8).map((p) => ({
        name: p.character || p.name,
        role: "Cast",
        voiceActor: p.name,
        imageUrl: image(p.profile_path) ?? "",
      })),
    };

    return {
      source: "tmdb",
      sourceId: id,
      sourceUrl: `https://www.themoviedb.org/movie/${id}`,
      draft,
      facts: {
        kind: "movie", title: m.title, originalTitle: m.original_title, tagline: m.tagline,
        overview: m.overview, releaseDate: m.release_date, runtimeMinutes: m.runtime, status: m.status,
        genres: m.genres.map((g) => g.name), originalLanguage: m.original_language,
        spokenLanguages: m.spoken_languages.map((l) => l.english_name),
        studios: m.production_companies.map((c) => c.name).slice(0, 4),
        countries: m.production_countries.map((c) => c.name), usCertification: certification,
        directors: crew("Director"), writers: crew("Screenplay").concat(crew("Writer")).slice(0, 4),
        novelAuthor: crew("Novel"), voteAverage: m.vote_average,
        topCast: m.credits.cast.slice(0, 8).map((p) => `${p.name} as ${p.character}`),
      },
    };
  }

  const t = await tmdb<{
    id: number; name: string; original_name: string; overview: string; tagline?: string;
    first_air_date?: string; last_air_date?: string; status?: string; in_production?: boolean;
    episode_run_time: number[]; vote_average?: number; number_of_seasons?: number; number_of_episodes?: number;
    genres: { name: string }[]; poster_path?: string; backdrop_path?: string;
    networks: { name: string }[]; production_companies: { name: string }[]; origin_country: string[];
    spoken_languages: { english_name: string }[]; original_language: string;
    created_by: { name: string }[];
    seasons: { season_number: number; name: string; episode_count: number; air_date?: string }[];
    next_episode_to_air?: { air_date?: string } | null;
    aggregate_credits: { cast: Person[]; crew: (Person & { jobs?: { job: string }[] })[] };
    content_ratings: { results: { iso_3166_1: string; rating: string }[] };
  }>(`/tv/${id}`, { append_to_response: "aggregate_credits,content_ratings" });

  const seasons = t.seasons.filter((s) => s.season_number > 0);
  const episodeLists = await Promise.all(
    seasons.slice(0, MAX_SEASONS_WITH_EPISODES).map((s) =>
      tmdb<{ episodes: { episode_number: number; name: string; air_date?: string; runtime?: number; overview?: string; still_path?: string; vote_average?: number }[] }>(
        `/tv/${id}/season/${s.season_number}`,
      ).then((data) => ({ season: s.season_number, episodes: data.episodes }))
        .catch(() => ({ season: s.season_number, episodes: [] })),
    ),
  );
  const crewWith = (job: string) =>
    t.aggregate_credits.crew.filter((p) => p.jobs?.some((j) => j.job === job)).map((p) => p.name);
  const runtime = t.episode_run_time[0];
  const certification =
    t.content_ratings.results.find((r) => r.iso_3166_1 === "US")?.rating ??
    t.content_ratings.results[0]?.rating;
  const ended = t.status === "Ended" || t.status === "Canceled";

  const draft: Partial<ContentFormInput> = {
    title: t.name,
    nativeTitle: t.original_name !== t.name ? t.original_name : "",
    type: t.origin_country.includes("KR") ? "kdrama" : "show",
    imageUrl: image(t.poster_path) ?? "",
    backdropUrl: image(t.backdrop_path) ?? "",
    year: yearOf(t.first_air_date),
    rating: t.vote_average ? Math.round(t.vote_average * 10) / 10 : undefined,
    studio: t.production_companies[0]?.name ?? "",
    director: t.created_by.map((c) => c.name).slice(0, 2).join(", ") || crewWith("Director").slice(0, 2).join(", "),
    composer: crewWith("Original Music Composer").slice(0, 2).join(", "),
    producers: crewWith("Executive Producer").slice(0, 3).join(", "),
    network: t.networks[0]?.name ?? "",
    airedFrom: monthYear(t.first_air_date) ?? "",
    airedTo: ended ? (monthYear(t.last_air_date) ?? "") : "",
    episodeDuration: minutesLabel(runtime) ?? "",
    seasonCount: seasons.length || undefined,
    episodeCount: t.number_of_episodes || undefined,
    meta: `${seasons.length} Season${seasons.length === 1 ? "" : "s"}, ${t.number_of_episodes ?? 0} Episodes`,
    seasonLabel: seasons[0]?.name ?? "",
    seasons: seasons.map((s) => ({ label: s.name, episodeCount: s.episode_count })),
    episodes: episodeLists.flatMap(({ season, episodes }) =>
      episodes.map((e) => ({
        seasonNumber: season,
        number: e.episode_number,
        title: e.name || `Episode ${e.episode_number}`,
        duration: minutesLabel(e.runtime ?? runtime) ?? "",
        description: (e.overview ?? "").slice(0, 600),
        thumbnailUrl: image(e.still_path) ?? "",
        videoUrl: "",
        releaseDate: e.air_date ?? "",
        language: "" as const,
        rating: e.vote_average ? Math.round(e.vote_average * 10) / 10 : undefined,
      })),
    ),
    characters: t.aggregate_credits.cast.slice(0, 8).map((p) => ({
      name: p.roles?.[0]?.character || p.name,
      role: "Cast",
      voiceActor: p.name,
      imageUrl: image(p.profile_path) ?? "",
    })),
  };

  return {
    source: "tmdb",
    sourceId: id,
    sourceUrl: `https://www.themoviedb.org/tv/${id}`,
    draft,
    facts: {
      kind: "tv", title: t.name, originalTitle: t.original_name, tagline: t.tagline, overview: t.overview,
      firstAirDate: t.first_air_date, lastAirDate: t.last_air_date, status: t.status, inProduction: t.in_production,
      nextEpisodeAirDate: t.next_episode_to_air?.air_date, episodeRuntimeMinutes: runtime,
      genres: t.genres.map((g) => g.name), originCountry: t.origin_country, originalLanguage: t.original_language,
      spokenLanguages: t.spoken_languages.map((l) => l.english_name), networks: t.networks.map((n) => n.name),
      studios: t.production_companies.map((c) => c.name).slice(0, 4), createdBy: t.created_by.map((c) => c.name),
      seasons: seasons.map((s) => ({ name: s.name, episodes: s.episode_count, airDate: s.air_date })),
      totalEpisodes: t.number_of_episodes, contentRating: certification, voteAverage: t.vote_average,
      topCast: t.aggregate_credits.cast.slice(0, 8).map((p) => `${p.name} as ${p.roles?.[0]?.character ?? "?"}`),
    },
  };
}
