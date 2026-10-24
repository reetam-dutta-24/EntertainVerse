import "server-only";

import { prisma } from "@/lib/prisma";
import { LISTEN_MOODS, WATCH_THEMES, WATCH_VIBES, type VocabOption } from "@/lib/ai-profile/vocabulary";
import { dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { minMax } from "@/lib/recommender/hybrid";
import { createCollection } from "@/lib/services/collection.service";
import { loadTasteCatalog, loadTasteSignals, rankContent, rankTracks, tasteCentroids } from "@/lib/services/taste-engine.service";
import { slugify } from "@/lib/slugify";

/**
 * Smart collections: once a week, turn the user's strongest learned vibes into
 * ready-made collections — mostly titles they already watch / play, topped up
 * with close recommendations. Suggestions only: the user saves or dismisses.
 */

const COLLECTION_TITLES: Record<string, string> = {
  "watch:cozy": "Cozy Nights In",
  "watch:thrilling": "Edge of Your Seat",
  "watch:emotional": "Bring Tissues",
  "watch:funny": "Pure Comedy Gold",
  "watch:mind-bending": "Mind-Benders",
  "watch:dark": "Dark & Gritty",
  "watch:epic": "Epic Worlds",
  "watch:romantic": "Hopeless Romantic",
  "watch:atmospheric": "Slow & Atmospheric",
  "watch:inspiring": "Feel Inspired",
  "watch:mysterious": "Unsolved Mysteries",
  "watch:eye-opening": "Eye-Openers",
  "watch:found-family": "Found Family",
  "watch:coming-of-age": "Growing Up",
  "watch:revenge": "Sweet Revenge",
  "watch:survival": "Survival Mode",
  "watch:power": "Power Games",
  "watch:heist": "Heists & Cons",
  "watch:underdog": "Underdog Stories",
  "watch:supernatural": "Beyond Natural",
  "watch:time": "Time & Memory",
  "watch:love": "Love Stories",
  "watch:war": "War & History",
  "watch:everyday": "Slice of Life",
  "listen:hype": "Hype Mode",
  "listen:chill": "Chill Rotation",
  "listen:focus": "Deep Focus",
  "listen:workout": "Gym Fuel",
  "listen:sad": "In My Feels",
  "listen:romantic": "Love Songs",
  "listen:party": "Party Starters",
  "listen:nostalgic": "Throwbacks",
  "listen:anime": "Anime Bangers",
  "listen:sleep": "Wind Down",
};

const ITEMS_PER_IDEA = 8;
const OCCASION_MOODS = new Set(["focus", "workout", "sleep"]);
/** An idea must be built mostly from behaviour: at least this many of the user's own items. */
const MIN_OWN_ITEMS = 2;
/** …and at most this many, so every idea also brings discoveries. */
const MAX_OWN_ITEMS = 5;

export interface SmartCollectionIdea {
  id: string;
  mode: "watch" | "listen";
  title: string;
  description: string;
  fromActivity: number;
  status: string;
  collectionSlug?: string;
  items: { slug: string; title: string; imageUrl?: string }[];
}

/** ISO-8601 week, e.g. "2026-W43" — ideas refresh once a week. */
export function isoWeekKey(date = new Date()) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

interface PoolItem {
  slug: string;
  title: string;
  vector: Vector;
  own: boolean;
}

function rankTraits(centroid: Vector | null, vocab: readonly VocabOption[], prefix: string, vectors: Map<string, Vector>) {
  if (!centroid) return [];
  const raw = new Map<string, number>();
  for (const option of vocab) {
    const vector = vectors.get(embeddingKey("trait", `${prefix}:${option.id}`));
    if (vector) raw.set(option.id, dot(vector, centroid));
  }
  const scaled = minMax(raw);
  return vocab
    .filter((option) => scaled.has(option.id))
    .sort((a, b) => scaled.get(b.id)! - scaled.get(a.id)!)
    .map((option) => ({ option, vector: vectors.get(embeddingKey("trait", `${prefix}:${option.id}`))! }));
}

/**
 * Pick items for one trait: closest to the trait (and to the user), mostly their
 * own titles but always with a few discoveries mixed in.
 */
function buildIdea(pool: PoolItem[], trait: Vector, centroid: Vector, used: Set<string>) {
  const ranked = pool
    .filter((item) => !used.has(item.slug))
    .map((item) => ({ item, score: dot(item.vector, trait) * 0.75 + dot(item.vector, centroid) * 0.25 }))
    .sort((a, b) => b.score - a.score)
    // Only the half of the pool that really fits the trait.
    .slice(0, Math.max(ITEMS_PER_IDEA, Math.ceil(pool.length / 2)))
    .map(({ item }) => item);
  const own = ranked.filter((item) => item.own).slice(0, MAX_OWN_ITEMS);
  const fresh = ranked.filter((item) => !item.own).slice(0, ITEMS_PER_IDEA - own.length);
  const picked = [...own, ...fresh];
  // Keep the trait order so the strongest fits come first.
  picked.sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b));
  return own.length >= MIN_OWN_ITEMS && picked.length >= 4 ? { items: picked, own: own.length } : null;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

async function generateIdeas(userId: string, weekKey: string) {
  const [signals, catalog, index] = await Promise.all([loadTasteSignals(userId), loadTasteCatalog(), loadEmbeddingIndex()]);
  if (!index.size) return;
  const centroids = await tasteCentroids(signals);
  const ideas: { mode: "watch" | "listen"; traitId: string; title: string; description: string; itemSlugs: string[]; fromActivity: number }[] = [];

  if (centroids.content) {
    const ownSlugs = new Set([...signals.favoriteContent, ...signals.watched.keys(), ...signals.watchlist]);
    const recs = await rankContent(signals, { limit: 30, excludeKnown: true });
    const recSlugs = new Set(recs.map((item) => item.id));
    const pool: PoolItem[] = catalog.content.flatMap((row) => {
      const vector = index.vectors.get(embeddingKey("content", row.id));
      const own = ownSlugs.has(row.slug);
      return vector && (own || recSlugs.has(row.slug)) ? [{ slug: row.slug, title: row.title, vector, own }] : [];
    });
    const used = new Set<string>();
    for (const { option, vector } of rankTraits(centroids.content, [...WATCH_VIBES, ...WATCH_THEMES], "watch", index.vectors).slice(0, 4)) {
      if (ideas.filter((idea) => idea.mode === "watch").length >= 2) break;
      const idea = buildIdea(pool, vector, centroids.content, used);
      if (!idea) continue;
      idea.items.forEach((item) => used.add(item.slug));
      const traitId = `watch:${option.id}`;
      ideas.push({
        mode: "watch",
        traitId,
        title: COLLECTION_TITLES[traitId] ?? `${option.label} picks`,
        description:
          `${plural(idea.own, "title")} you watch and love ${WATCH_THEMES.includes(option) ? `about ${option.phrase}` : `that feel ${option.phrase}`}` +
          `${idea.items.length > idea.own ? `, plus ${plural(idea.items.length - idea.own, "close pick")}` : ""}. Refreshed weekly by AI mode.`,
        itemSlugs: idea.items.map((item) => item.slug),
        fromActivity: idea.own,
      });
    }
  }

  if (centroids.music) {
    const ownSlugs = new Set([...signals.favoriteTracks, ...signals.listened.keys()]);
    const recs = await rankTracks(signals, { limit: 30, excludeKnown: true });
    const recSlugs = new Set(recs.map((track) => track.id));
    const pool: PoolItem[] = catalog.tracks.flatMap((row) => {
      const vector = index.vectors.get(embeddingKey("track", row.id));
      const own = ownSlugs.has(row.slug);
      return vector && (own || recSlugs.has(row.slug)) ? [{ slug: row.slug, title: `${row.title} — ${row.artist}`, vector, own }] : [];
    });
    const used = new Set<string>();
    // Occasion moods (study, gym, sleep) describe a use, not a sound — only build them when asked for.
    const asked = new Set(signals.ai?.listen.moods ?? []);
    const moods = LISTEN_MOODS.filter((option) => !OCCASION_MOODS.has(option.id) || asked.has(option.id));
    for (const { option, vector } of rankTraits(centroids.music, moods, "listen", index.vectors).slice(0, 3)) {
      if (ideas.filter((idea) => idea.mode === "listen").length >= 1) break;
      const idea = buildIdea(pool, vector, centroids.music, used);
      if (!idea) continue;
      const traitId = `listen:${option.id}`;
      ideas.push({
        mode: "listen",
        traitId,
        title: COLLECTION_TITLES[traitId] ?? `${option.label} mix`,
        description:
          `${plural(idea.own, "song")} you play, tuned for ${option.phrase}` +
          `${idea.items.length > idea.own ? `, plus ${plural(idea.items.length - idea.own, "new one")}` : ""}. Refreshed weekly by AI mode.`,
        itemSlugs: idea.items.map((item) => item.slug),
        fromActivity: idea.own,
      });
    }
  }

  if (!ideas.length) return;
  await prisma.aiCollectionSuggestion.createMany({
    data: ideas.map((idea) => ({ ...idea, userId, weekKey })),
    skipDuplicates: true,
  });
}

async function toIdeas(rows: Awaited<ReturnType<typeof prisma.aiCollectionSuggestion.findMany>>): Promise<SmartCollectionIdea[]> {
  const catalog = await loadTasteCatalog();
  const content = new Map(catalog.content.map((row) => [row.slug, row]));
  const tracks = new Map(catalog.tracks.map((row) => [row.slug, row]));
  const collections = await prisma.collection.findMany({
    where: { id: { in: rows.flatMap((row) => row.collectionId ?? []) } },
    select: { id: true, slug: true },
  });
  const collectionSlug = new Map(collections.map((c) => [c.id, c.slug]));
  return rows.map((row) => ({
    id: row.id,
    mode: row.mode as SmartCollectionIdea["mode"],
    title: row.title,
    description: row.description,
    fromActivity: row.fromActivity,
    status: row.status,
    collectionSlug: row.collectionId ? collectionSlug.get(row.collectionId) : undefined,
    items: (Array.isArray(row.itemSlugs) ? (row.itemSlugs as string[]) : []).flatMap((slug) => {
      const item = row.mode === "listen" ? tracks.get(slug) : content.get(slug);
      if (!item) return [];
      const title = "artist" in item ? `${item.title} — ${item.artist}` : item.title;
      return [{ slug, title, imageUrl: item.imageUrl ?? undefined }];
    }),
  }));
}

/** This week's ideas (generated on first visit of the week). */
export async function getSmartCollectionIdeas(userId: string): Promise<SmartCollectionIdea[]> {
  const weekKey = isoWeekKey();
  const existing = await prisma.aiCollectionSuggestion.count({ where: { userId, weekKey } });
  if (!existing) {
    await generateIdeas(userId, weekKey).catch((error) => console.error("[smart collections] generation failed", error));
  }
  const rows = await prisma.aiCollectionSuggestion.findMany({
    where: { userId, weekKey, status: { not: "DISMISSED" } },
    orderBy: [{ mode: "desc" }, { createdAt: "asc" }],
  });
  return toIdeas(rows);
}

export class SmartCollectionNotFoundError extends Error {
  constructor() {
    super("That collection idea is gone — refresh the page.");
    this.name = "SmartCollectionNotFoundError";
  }
}

/** Save an idea as a real collection (private unless the user chooses public). */
export async function acceptSmartCollection(userId: string, id: string, visibility: "PUBLIC" | "PRIVATE") {
  const idea = await prisma.aiCollectionSuggestion.findFirst({ where: { id, userId, status: "PENDING" } });
  if (!idea) throw new SmartCollectionNotFoundError();
  const slugs = Array.isArray(idea.itemSlugs) ? (idea.itemSlugs as string[]) : [];
  const [view] = await toIdeas([idea]);
  const collection = await createCollection(userId, {
    name: idea.title,
    // Slugs are global — keep the friendly name but make the slug unique.
    slug: `${slugify(idea.title)}-${idea.id.slice(-6)}`.slice(0, 80),
    description: idea.description.replace(" Refreshed weekly by AI mode.", " Made with AI mode."),
    category: idea.mode === "listen" ? "Music" : "Mixed",
    kind: idea.mode === "listen" ? "music" : "content",
    visibility,
    accent: idea.mode === "listen" ? "cyan" : "purple",
    imageUrl: view?.items.find((item) => item.imageUrl)?.imageUrl,
    ...(idea.mode === "listen" ? { initialTrackSlugs: slugs } : { initialContentSlugs: slugs }),
  });
  await prisma.aiCollectionSuggestion.update({ where: { id }, data: { status: "ACCEPTED", collectionId: collection.id } });
  return { slug: collection.slug };
}

export async function dismissSmartCollection(userId: string, id: string) {
  await prisma.aiCollectionSuggestion.updateMany({ where: { id, userId, status: "PENDING" }, data: { status: "DISMISSED" } });
}
