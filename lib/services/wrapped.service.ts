import "server-only";

import type { MediaType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateStructured, isAiConfigured } from "@/lib/ai/provider";
import { LISTEN_MOODS, WATCH_THEMES, WATCH_VIBES, type VocabOption } from "@/lib/ai-profile/vocabulary";
import { centroid, dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import type { DnaEra, DnaMonth, DnaTrait, TasteDnaHistory, WrappedData, WrappedItem } from "@/lib/wrapped/types";

/**
 * Taste DNA history + EntertainVerse Wrapped. Both are computed live from real activity:
 * every month's watching/listening (minutes) and favorites become a point in the
 * embedding space, and that point is read against the trait vocabulary — so you can
 * see your taste drift month by month, not just where it is today.
 */

const WATCH_TRAITS = [...WATCH_VIBES, ...WATCH_THEMES];
/** A favorite counts like this many minutes of watching / listening. */
const FAVORITE_WATCH_MINUTES = 60;
const FAVORITE_LISTEN_MINUTES = 12;

const FORMAT_LABELS: Partial<Record<MediaType, string>> = {
  ANIME: "Anime",
  SHOW: "Shows",
  MOVIE: "Movies",
  DOCUMENTARY: "Documentaries",
  KDRAMA: "K-Dramas",
};

const SLOTS = [
  { id: "morning", label: "Early bird", emoji: "🌅", from: 5, to: 12 },
  { id: "afternoon", label: "Afternoon regular", emoji: "☀️", from: 12, to: 17 },
  { id: "evening", label: "Prime-time viewer", emoji: "🌆", from: 17, to: 22 },
  { id: "night", label: "Night owl", emoji: "🌙", from: 22, to: 5 },
] as const;

const asTrait = (option: VocabOption): DnaTrait => ({ id: option.id, label: option.label, emoji: option.emoji });

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return { key: monthKey(start), label: start.toLocaleString("en-US", { month: "short" }), start };
  });
}

/** Local calendar day + hour in the user's time zone. */
function localParts(date: Date, timezone?: string | null) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
    return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
  } catch {
    return { day: date.toISOString().slice(0, 10), hour: date.getHours() };
  }
}

interface Weighted {
  itemId: string;
  at: Date;
  weight: number;
}

/** Trait readings for one bag of items: raw cosine per trait, or null with no vectors. */
function readTraits(items: Weighted[], kind: "content" | "track", vocab: readonly VocabOption[], prefix: string, vectors: Map<string, Vector>) {
  const point = centroid(items.flatMap((item) => {
    const vector = vectors.get(embeddingKey(kind, item.itemId));
    return vector ? [{ vector, weight: item.weight }] : [];
  }));
  if (!point) return null;
  const raw = new Map<string, number>();
  for (const option of vocab) {
    const vector = vectors.get(embeddingKey("trait", `${prefix}:${option.id}`));
    if (vector) raw.set(option.id, dot(vector, point));
  }
  return raw.size ? raw : null;
}

function topTraits(raw: Map<string, number> | null, vocab: readonly VocabOption[], count: number) {
  if (!raw) return [];
  return [...raw].sort((a, b) => b[1] - a[1]).slice(0, count).flatMap(([id]) => {
    const option = vocab.find((entry) => entry.id === id);
    return option ? [asTrait(option)] : [];
  });
}

async function watchSignals(userId: string, since: Date): Promise<Weighted[]> {
  const [events, favorites] = await Promise.all([
    prisma.watchEvent.findMany({ where: { userId, watchedAt: { gte: since } }, select: { contentId: true, minutes: true, watchedAt: true } }),
    prisma.contentFavorite.findMany({ where: { userId, createdAt: { gte: since } }, select: { contentId: true, createdAt: true } }),
  ]);
  return [
    ...events.map((event) => ({ itemId: event.contentId, at: event.watchedAt, weight: event.minutes })),
    ...favorites.map((favorite) => ({ itemId: favorite.contentId, at: favorite.createdAt, weight: FAVORITE_WATCH_MINUTES })),
  ];
}

/** Consecutive months with the same standout trait form an era ("Mar–May: 🖤 Dark & gritty"). */
function erasOf(months: DnaMonth[]): DnaEra[] {
  const eras: DnaEra[] = [];
  let run: { trait: DnaTrait; first: string; last: string; months: number } | null = null;
  const close = () => {
    if (run) eras.push({ trait: run.trait, label: run.first === run.last ? run.first : `${run.first}–${run.last}`, months: run.months });
  };
  for (const month of months) {
    if (!month.standout) continue;
    if (run && run.trait.id === month.standout.id) {
      run.last = month.month;
      run.months += 1;
    } else {
      close();
      run = { trait: month.standout, first: month.month, last: month.month, months: 1 };
    }
  }
  close();
  return eras;
}

/** Month-by-month Taste DNA over the last 12 months. */
export async function getTasteDnaHistory(userId: string, now = new Date()): Promise<TasteDnaHistory> {
  const months = lastMonths(12, now);
  const [signals, index] = await Promise.all([watchSignals(userId, months[0]!.start), loadEmbeddingIndex()]);

  const readings = months.map((month, position) => {
    const end = months[position + 1]?.start ?? new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const items = signals.filter((item) => item.at >= month.start && item.at < end);
    const minutes = Math.round(items.reduce((sum, item) => sum + item.weight, 0));
    return { month, minutes, raw: items.length ? readTraits(items, "content", WATCH_TRAITS, "watch", index.vectors) : null };
  });
  const active = readings.filter((reading) => reading.raw);

  // One scale across every month and trait, so months are comparable.
  const cells = active.flatMap((reading) => [...reading.raw!.values()]);
  const lo = cells.length ? Math.min(...cells) : 0;
  const span = (cells.length ? Math.max(...cells) : 1) - lo || 1;
  const scale = (value: number) => Math.round(20 + 80 * ((value - lo) / span));

  const mean = new Map<string, number>();
  for (const option of WATCH_TRAITS) {
    const values = active.flatMap((reading) => (reading.raw!.has(option.id) ? [reading.raw!.get(option.id)!] : []));
    if (values.length) mean.set(option.id, values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  const strands = [...mean].sort((a, b) => b[1] - a[1]).slice(0, 4).flatMap(([id]) => {
    const option = WATCH_TRAITS.find((entry) => entry.id === id);
    return option ? [asTrait(option)] : [];
  });

  // A month's standout: what rose most above your own average (or simply the top trait early on).
  const standoutOf = (raw: Map<string, number>) => {
    const [id] = [...raw]
      .map(([traitId, value]) => [traitId, active.length >= 3 ? value - (mean.get(traitId) ?? 0) : value] as const)
      .sort((a, b) => b[1] - a[1])[0] ?? [];
    const option = WATCH_TRAITS.find((entry) => entry.id === id);
    return option ? asTrait(option) : null;
  };

  const dnaMonths: DnaMonth[] = readings.map(({ month, minutes, raw }) => ({
    month: month.label,
    key: month.key,
    minutes,
    scores: raw ? Object.fromEntries([...raw].map(([id, value]) => [id, scale(value)])) : {},
    standout: raw ? standoutOf(raw) : null,
  }));

  const eras = erasOf(dnaMonths);

  let rising: TasteDnaHistory["rising"] = null;
  let fading: TasteDnaHistory["fading"] = null;
  if (active.length >= 2) {
    const half = Math.floor(active.length / 2);
    const avg = (rows: typeof active, id: string) => rows.reduce((sum, row) => sum + scale(row.raw!.get(id) ?? lo), 0) / rows.length;
    const deltas = WATCH_TRAITS.filter((option) => mean.has(option.id))
      .map((option) => ({ trait: asTrait(option), delta: Math.round(avg(active.slice(half), option.id) - avg(active.slice(0, half), option.id)) }))
      .sort((a, b) => b.delta - a.delta);
    if (deltas[0] && deltas[0].delta > 0) rising = deltas[0];
    const last = deltas.at(-1);
    if (last && last.delta < 0) fading = last;
  }

  return { months: dnaMonths, strands, eras, rising, fading, activeMonths: active.length };
}

// ---- Wrapped ---------------------------------------------------------------------------------

const personaCache = new Map<string, { at: number; persona: WrappedData["persona"] }>();
const PERSONA_TTL_MS = 6 * 3_600_000;

function longestStreak(days: string[]) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    const time = Date.parse(`${day}T00:00:00Z`);
    current = previous !== null && time - previous === 86_400_000 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = time;
  }
  return best;
}

function topBy<T>(rows: T[], key: (row: T) => string, minutes: (row: T) => number) {
  const totals = new Map<string, { row: T; minutes: number }>();
  for (const row of rows) {
    const id = key(row);
    const entry = totals.get(id) ?? { row, minutes: 0 };
    entry.minutes += minutes(row);
    totals.set(id, entry);
  }
  return [...totals.values()].sort((a, b) => b.minutes - a.minutes);
}

export async function getWrapped(userId: string, year = new Date().getFullYear()): Promise<WrappedData> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const [user, settings, watchEvents, listenEvents, contentFavorites, trackFavorites, reviews, posts, messages, index, dna] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.screenTimeSettings.findUnique({ where: { userId }, select: { timezone: true } }),
    prisma.watchEvent.findMany({
      where: { userId, watchedAt: { gte: start, lt: end } },
      select: {
        contentId: true,
        minutes: true,
        watchedAt: true,
        content: { select: { slug: true, title: true, imageUrl: true, type: true, year: true, genres: { select: { genre: { select: { label: true } } } } } },
      },
    }),
    prisma.listenEvent.findMany({
      where: { userId, listenedAt: { gte: start, lt: end } },
      select: { trackId: true, minutes: true, listenedAt: true, track: { select: { slug: true, title: true, artist: true, imageUrl: true } } },
    }),
    prisma.contentFavorite.findMany({ where: { userId, createdAt: { gte: start, lt: end } }, select: { contentId: true, createdAt: true } }),
    prisma.trackFavorite.findMany({ where: { userId, createdAt: { gte: start, lt: end } }, select: { trackId: true, createdAt: true } }),
    prisma.review.count({ where: { authorId: userId, createdAt: { gte: start, lt: end } } }),
    prisma.communityPost.count({ where: { authorId: userId, createdAt: { gte: start, lt: end } } }),
    prisma.communityChatMessage.count({ where: { authorId: userId, createdAt: { gte: start, lt: end } } }),
    loadEmbeddingIndex(),
    getTasteDnaHistory(userId),
  ]);
  const timezone = settings?.timezone;

  const watchMinutes = watchEvents.reduce((sum, event) => sum + event.minutes, 0);
  const listenMinutes = listenEvents.reduce((sum, event) => sum + event.minutes, 0);

  const topTitles: WrappedItem[] = topBy(watchEvents, (event) => event.contentId, (event) => event.minutes)
    .slice(0, 5)
    .map(({ row, minutes }) => ({
      slug: row.content.slug,
      title: row.content.title,
      subtitle: [FORMAT_LABELS[row.content.type], row.content.year].filter(Boolean).join(" · "),
      imageUrl: row.content.imageUrl ?? undefined,
      minutes,
    }));
  const topTracks: WrappedItem[] = topBy(listenEvents, (event) => event.trackId, (event) => event.minutes)
    .slice(0, 5)
    .map(({ row, minutes }) => ({ slug: row.track.slug, title: row.track.title, subtitle: row.track.artist, imageUrl: row.track.imageUrl ?? undefined, minutes }));

  const artistRanks = topBy(listenEvents, (event) => event.track.artist.toLowerCase(), (event) => event.minutes).slice(0, 3);
  const artistRows = artistRanks.length
    ? await prisma.artist.findMany({
        where: { OR: artistRanks.map(({ row }) => ({ title: { equals: row.track.artist, mode: "insensitive" as const } })) },
        select: { slug: true, title: true, imageUrl: true },
      })
    : [];
  const topArtists: WrappedItem[] = artistRanks.map(({ row, minutes }) => {
    const artist = artistRows.find((entry) => entry.title.toLowerCase() === row.track.artist.toLowerCase());
    return { slug: artist?.slug ?? "", title: artist?.title ?? row.track.artist, imageUrl: artist?.imageUrl ?? row.track.imageUrl ?? undefined, minutes };
  });

  const genreMinutes = new Map<string, number>();
  const formatMinutes = new Map<string, number>();
  for (const event of watchEvents) {
    const labels = event.content.genres.map((row) => row.genre.label);
    for (const label of labels) genreMinutes.set(label, (genreMinutes.get(label) ?? 0) + event.minutes / labels.length);
    const format = FORMAT_LABELS[event.content.type];
    if (format) formatMinutes.set(format, (formatMinutes.get(format) ?? 0) + event.minutes);
  }
  const share = (value: number, total: number) => Math.round((value / Math.max(1, total)) * 100);
  const topGenres = [...genreMinutes].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, minutes]) => ({ label, share: share(minutes, watchMinutes) }));
  const [formatLabel, formatValue] = [...formatMinutes].sort((a, b) => b[1] - a[1])[0] ?? [];
  const topFormat = formatLabel ? { label: formatLabel, share: share(formatValue!, watchMinutes) } : null;

  // Your year as a point in taste space.
  const vibes = topTraits(
    readTraits(
      [
        ...watchEvents.map((event) => ({ itemId: event.contentId, at: event.watchedAt, weight: event.minutes })),
        ...contentFavorites.map((favorite) => ({ itemId: favorite.contentId, at: favorite.createdAt, weight: FAVORITE_WATCH_MINUTES })),
      ],
      "content",
      WATCH_TRAITS,
      "watch",
      index.vectors,
    ),
    WATCH_TRAITS,
    3,
  );
  const moods = topTraits(
    readTraits(
      [
        ...listenEvents.map((event) => ({ itemId: event.trackId, at: event.listenedAt, weight: event.minutes })),
        ...trackFavorites.map((favorite) => ({ itemId: favorite.trackId, at: favorite.createdAt, weight: FAVORITE_LISTEN_MINUTES })),
      ],
      "track",
      LISTEN_MOODS,
      "listen",
      index.vectors,
    ),
    LISTEN_MOODS,
    2,
  );

  // Rhythm: days, biggest day, time of day — in the user's time zone.
  const dayMinutes = new Map<string, number>();
  const slotMinutes = new Map<string, number>();
  for (const event of [
    ...watchEvents.map((row) => ({ at: row.watchedAt, minutes: row.minutes })),
    ...listenEvents.map((row) => ({ at: row.listenedAt, minutes: row.minutes })),
  ]) {
    const { day, hour } = localParts(event.at, timezone);
    dayMinutes.set(day, (dayMinutes.get(day) ?? 0) + event.minutes);
    const slot = SLOTS.find((entry) => (entry.from < entry.to ? hour >= entry.from && hour < entry.to : hour >= entry.from || hour < entry.to))!;
    slotMinutes.set(slot.id, (slotMinutes.get(slot.id) ?? 0) + event.minutes);
  }
  const [bigDay, bigDayMinutes] = [...dayMinutes].sort((a, b) => b[1] - a[1])[0] ?? [];
  const biggestDay = bigDay
    ? { label: new Date(`${bigDay}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }), minutes: bigDayMinutes! }
    : null;
  const [slotId, slotValue] = [...slotMinutes].sort((a, b) => b[1] - a[1])[0] ?? [];
  const slot = SLOTS.find((entry) => entry.id === slotId);
  const timeOfDay = slot ? { label: slot.label, emoji: slot.emoji, share: share(slotValue!, watchMinutes + listenMinutes) } : null;

  // Where you rank among everyone active this year.
  const [watchTotals, listenTotals] = await Promise.all([
    prisma.watchEvent.groupBy({ by: ["userId"], where: { watchedAt: { gte: start, lt: end } }, _sum: { minutes: true } }),
    prisma.listenEvent.groupBy({ by: ["userId"], where: { listenedAt: { gte: start, lt: end } }, _sum: { minutes: true } }),
  ]);
  const everyone = new Map<string, number>();
  for (const row of [...watchTotals, ...listenTotals]) everyone.set(row.userId, (everyone.get(row.userId) ?? 0) + (row._sum.minutes ?? 0));
  const mine = watchMinutes + listenMinutes;
  const ahead = [...everyone.values()].filter((value) => value > mine).length;
  const topPercent = everyone.size >= 5 && mine > 0 ? Math.max(1, Math.ceil(((ahead + 1) / everyone.size) * 100)) : null;

  const eras = erasOf(dna.months.filter((month) => month.key.startsWith(`${year}-`)));
  const empty = mine < 10 && contentFavorites.length + trackFavorites.length === 0;

  const base: Omit<WrappedData, "persona"> = {
    year,
    empty,
    userName: user.name,
    totals: {
      watchMinutes,
      listenMinutes,
      titles: new Set(watchEvents.map((event) => event.contentId)).size,
      tracks: new Set(listenEvents.map((event) => event.trackId)).size,
      activeDays: dayMinutes.size,
      favoritesAdded: contentFavorites.length + trackFavorites.length,
      reviews,
      posts,
      messages,
    },
    topTitles,
    topTracks,
    topArtists,
    topGenres,
    topFormat,
    vibes,
    moods,
    eras,
    biggestDay,
    timeOfDay,
    longestStreak: longestStreak([...dayMinutes.keys()]),
    topPercent,
  };
  return { ...base, persona: await persona(userId, base) };
}

/** A fallback persona from the top vibe + time of day ("The Night-Owl Strategist"). */
function fallbackPersona(data: Omit<WrappedData, "persona">): WrappedData["persona"] {
  const nouns: Record<string, string> = {
    cozy: "Comfort Seeker",
    thrilling: "Adrenaline Chaser",
    emotional: "Big-Feelings Romantic",
    funny: "Laugh Collector",
    "mind-bending": "Puzzle Solver",
    dark: "Shadow Walker",
    epic: "World Traveller",
    romantic: "Hopeless Romantic",
  };
  const vibe = data.vibes[0];
  const noun = (vibe && nouns[vibe.id]) || (vibe ? `${vibe.label} Devotee` : "Explorer");
  const prefix = data.timeOfDay?.label === "Night owl" ? "Night-Owl " : data.timeOfDay?.label === "Early bird" ? "Early-Bird " : "";
  return {
    name: `The ${prefix}${noun}`,
    tagline: vibe ? `${vibe.emoji} ${data.vibes.map((entry) => entry.label).join(" · ")}` : "Still writing your story",
    intro: data.topTitles[0]
      ? `${data.topTitles[0].title} defined your year — and your taste kept moving the whole way.`
      : "Your EntertainVerse year is just getting started.",
  };
}

async function persona(userId: string, data: Omit<WrappedData, "persona">): Promise<WrappedData["persona"]> {
  const fallback = fallbackPersona(data);
  if (data.empty || !isAiConfigured()) return fallback;
  const key = `${userId}:${data.year}:${data.totals.watchMinutes + data.totals.listenMinutes}:${data.topTitles[0]?.slug ?? ""}`;
  const hit = personaCache.get(key);
  if (hit && Date.now() - hit.at < PERSONA_TTL_MS) return hit.persona;
  try {
    const out = await generateStructured({
      tier: "fast",
      schema: z.object({ name: z.string(), tagline: z.string(), intro: z.string() }),
      system:
        "You name a person's entertainment personality for their year-end Wrapped, Spotify-Wrapped style. " +
        "name: 'The …' archetype, 2-4 words, playful, specific to their data (not generic). tagline: under 10 words. " +
        "intro: one warm, punchy sentence (max 28 words) about their year. Use only the facts given; no spoilers.",
      prompt:
        `Year ${data.year}. Watched ${Math.round(data.totals.watchMinutes / 60)}h across ${data.totals.titles} titles; listened ${Math.round(data.totals.listenMinutes / 60)}h.\n` +
        `Top titles: ${data.topTitles.map((item) => item.title).join(", ") || "none"}\n` +
        `Top songs: ${data.topTracks.map((item) => `${item.title} (${item.subtitle})`).join(", ") || "none"}\n` +
        `Taste vibes: ${data.vibes.map((entry) => entry.label).join(", ") || "unknown"}; music moods: ${data.moods.map((entry) => entry.label).join(", ") || "unknown"}\n` +
        `Genres: ${data.topGenres.map((entry) => entry.label).join(", ") || "unknown"}; mostly ${data.topFormat?.label ?? "mixed"}; ${data.timeOfDay?.label ?? ""}\n` +
        `Taste eras: ${data.eras.map((era) => `${era.label}: ${era.trait.label}`).join("; ") || "steady"}`,
    });
    const result = { name: out.name.trim() || fallback.name, tagline: out.tagline.trim() || fallback.tagline, intro: out.intro.trim() || fallback.intro };
    personaCache.set(key, { at: Date.now(), persona: result });
    return result;
  } catch {
    return fallback;
  }
}
