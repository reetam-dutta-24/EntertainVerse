import { z } from "zod";

/**
 * Legal "listen on" links for tracks and artists. Stored links are deep links
 * found by the importer; search links are built at render time for services
 * that have no public catalog API.
 */
export const LISTEN_SERVICES = ["apple-music", "deezer", "spotify", "youtube-music", "jiosaavn", "other"] as const;

export type ListenService = (typeof LISTEN_SERVICES)[number];

export const LISTEN_SERVICE_LABELS: Record<ListenService, string> = {
  "apple-music": "Apple Music",
  deezer: "Deezer",
  spotify: "Spotify",
  "youtube-music": "YouTube Music",
  jiosaavn: "JioSaavn",
  other: "Listen",
};

export const listenLinkSchema = z.object({
  service: z.enum(LISTEN_SERVICES),
  url: z.string().trim().url("Listen links must be full URLs").max(500),
});

export type ListenLink = z.infer<typeof listenLinkSchema>;

const HOSTS: [RegExp, ListenService][] = [
  [/(^|\.)music\.apple\.com$|(^|\.)itunes\.apple\.com$/, "apple-music"],
  [/(^|\.)deezer\.com$/, "deezer"],
  [/(^|\.)spotify\.com$/, "spotify"],
  [/^music\.youtube\.com$/, "youtube-music"],
  [/(^|\.)jiosaavn\.com$/, "jiosaavn"],
];

export function listenServiceFromUrl(url: string): ListenService {
  try {
    const host = new URL(url).hostname;
    return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? "other";
  } catch {
    return "other";
  }
}

/** Read the JSON column defensively — bad rows render no links instead of crashing. */
export function parseListenLinks(value: unknown): ListenLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = listenLinkSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Search links for the big services that aren't stored as deep links. */
export function listenSearchLinks(query: string, have: ListenLink[], region = "in"): ListenLink[] {
  const q = encodeURIComponent(query);
  const present = new Set(have.map((link) => link.service));
  const search: ListenLink[] = [
    { service: "spotify", url: `https://open.spotify.com/search/${q}` },
    { service: "youtube-music", url: `https://music.youtube.com/search?q=${q}` },
    { service: "apple-music", url: `https://music.apple.com/${region}/search?term=${q}` },
  ];
  return search.filter((link) => !present.has(link.service));
}
