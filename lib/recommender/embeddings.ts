import "server-only";

import { createHash } from "node:crypto";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { CacheTags, cached, invalidateTags } from "@/lib/cache/server-cache";
import { CatalogAiError } from "@/lib/ai/errors";
import { GEMINI_EMBEDDING_MODEL, geminiEmbed, isGeminiConfigured } from "@/lib/ai/providers/gemini";
import { LISTEN_MOODS, WATCH_THEMES, WATCH_VIBES } from "@/lib/ai-profile/vocabulary";
import { HELP_ARTICLES, helpArticleText } from "@/lib/assistant/knowledge";

/**
 * Semantic layer of the recommender. Every catalog item is turned into a short
 * "document" (title, type, genres, tone tags, credits, synopsis) and encoded by
 * a pre-trained embedding model. Items whose text hasn't changed are never
 * re-sent, so a full sync after an admin save costs nothing unless it matters.
 *
 * The catalog is a few hundred items, so similarity search is a dot product in
 * memory — no vector database needed.
 */

/**
 * "trait" = AI-mode vocabulary phrases (vibes, themes, listening moods) — used to describe a user's taste.
 * "help" = the assistant's help articles (lib/assistant/knowledge.ts), retrieved by meaning.
 */
export type EmbeddingKind = "content" | "track" | "artist" | "collection" | "community" | "trait" | "help";

const DIMENSIONS = 768;
/**
 * Free tier: 100 embed requests/minute, and every text in a batch counts as one.
 * 40 texts per batch, batches at least 26s apart, stays under the cap.
 */
const BATCH = 40;
const BATCH_INTERVAL_MS = 26_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Embed one batch, waiting out the per-minute quota instead of failing. */
async function embedBatch(texts: string[]) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await geminiEmbed(texts, "RETRIEVAL_DOCUMENT", DIMENSIONS);
    } catch (error) {
      if (!(error instanceof CatalogAiError) || error.status !== 429 || attempt >= 3) throw error;
      await sleep(30_000);
    }
  }
}
const MAX_TEXT = 1800;

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];

const line = (label: string, value: string | number | null | undefined | string[]) => {
  const text = Array.isArray(value) ? value.join(", ") : value;
  return text === undefined || text === null || text === "" ? "" : `${label}: ${text}.`;
};

const doc = (...parts: string[]) => parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);

interface SourceItem {
  kind: EmbeddingKind;
  itemId: string;
  text: string;
}

/** Every recommendable item with the text that describes it. */
async function loadSourceItems(): Promise<SourceItem[]> {
  const [content, tracks, artists, collections, communities] = await Promise.all([
    prisma.content.findMany({ include: { genres: { include: { genre: true } } } }),
    prisma.musicTrack.findMany({ include: { sourceContent: { select: { title: true } } } }),
    prisma.artist.findMany(),
    prisma.collection.findMany({
      where: { visibility: "PUBLIC" },
      include: {
        items: {
          orderBy: { position: "asc" },
          take: 25,
          include: { content: { select: { title: true } }, track: { select: { title: true, artist: true } } },
        },
      },
    }),
    prisma.community.findMany({ where: { visibility: "PUBLIC" } }),
  ]);

  return [
    ...content.map((c) => ({
      kind: "content" as const,
      itemId: c.id,
      text: doc(
        `${c.title}${c.nativeTitle ? ` (${c.nativeTitle})` : ""}.`,
        line("Type", c.type.toLowerCase()),
        line("Genres", c.genres.map((g) => g.genre.label)),
        line("Tags", list(c.highlightTags)),
        line("Studio", c.studio),
        line("Created by", c.director || c.originalAuthor),
        line("Based on", c.sourceMaterial),
        line("Country", c.country),
        line("Languages", list(c.languages)),
        line("Year", c.year),
        line("Status", c.status),
        c.description ?? "",
        c.synopsis ?? "",
      ),
    })),
    ...tracks.map((t) => ({
      kind: "track" as const,
      itemId: t.id,
      text: doc(
        `${t.title}${t.nativeTitle ? ` (${t.nativeTitle})` : ""} by ${t.artist}.`,
        t.kind === "ost" ? `Soundtrack${t.sourceContent || t.source ? ` from ${t.sourceContent?.title ?? t.source}` : ""}.` : line("Kind", t.kind),
        line("Genres", list(t.genres)),
        line("Language", t.language),
        line("Album", t.album),
        line("Year", t.year),
        t.description ?? "",
      ),
    })),
    ...artists.map((a) => ({
      kind: "artist" as const,
      itemId: a.id,
      text: doc(
        `${a.title}${a.nativeTitle ? ` (${a.nativeTitle})` : ""}.`,
        a.isGroup ? "Music group." : "Solo artist.",
        line("Genres", list(a.genres)),
        line("Tags", list(a.primaryTags)),
        line("Sings in", list(a.languages)),
        line("Label", a.label),
        line("Debut", a.debutYear),
        a.synopsis ?? "",
      ),
    })),
    ...collections.map((c) => ({
      kind: "collection" as const,
      itemId: c.id,
      text: doc(
        `${c.name}. A ${c.kind === "music" ? "music playlist" : "watch collection"}.`,
        line("Category", c.category),
        line("Genres", c.genreLabels),
        c.description ?? "",
        line(
          "Includes",
          c.items.map((item) => item.content?.title ?? (item.track ? `${item.track.title} by ${item.track.artist}` : "")).filter(Boolean),
        ),
      ),
    })),
    ...communities.map((c) => ({
      kind: "community" as const,
      itemId: c.id,
      text: doc(`${c.name}. A fan community.`, line("Category", c.category), c.description ?? ""),
    })),
    ...[...WATCH_VIBES, ...WATCH_THEMES].map((option) => ({
      kind: "trait" as const,
      itemId: `watch:${option.id}`,
      text: `Stories that feel ${option.phrase}.`,
    })),
    ...LISTEN_MOODS.map((option) => ({
      kind: "trait" as const,
      itemId: `listen:${option.id}`,
      text: `Music for ${option.phrase}.`,
    })),
    ...HELP_ARTICLES.map((article) => ({ kind: "help" as const, itemId: article.id, text: doc(helpArticleText(article)) })),
  ];
}

const hashText = (text: string) => createHash("sha1").update(`${GEMINI_EMBEDDING_MODEL}:${DIMENSIONS}:${text}`).digest("hex");

export interface EmbeddingSyncResult {
  embedded: number;
  unchanged: number;
  removed: number;
}

let syncing: Promise<EmbeddingSyncResult> | null = null;

/** Embed new/changed items, drop vectors for deleted ones. Safe to call often. */
export function syncCatalogEmbeddings(options: { force?: boolean; onProgress?: (done: number, total: number) => void } = {}) {
  syncing ??= runSync(options).finally(() => {
    syncing = null;
  });
  return syncing;
}

async function runSync({ force, onProgress }: { force?: boolean; onProgress?: (done: number, total: number) => void }) {
  if (!isGeminiConfigured()) return { embedded: 0, unchanged: 0, removed: 0 };
  const [items, existing] = await Promise.all([
    loadSourceItems(),
    prisma.catalogEmbedding.findMany({ select: { id: true, kind: true, itemId: true, textHash: true } }),
  ]);
  const known = new Map(existing.map((row) => [`${row.kind}:${row.itemId}`, row]));
  const live = new Set(items.map((item) => `${item.kind}:${item.itemId}`));

  const stale = items
    .map((item) => ({ ...item, hash: hashText(item.text) }))
    .filter((item) => force || known.get(`${item.kind}:${item.itemId}`)?.textHash !== item.hash);

  for (let start = 0; start < stale.length; start += BATCH) {
    if (start > 0) await sleep(BATCH_INTERVAL_MS);
    const batch = stale.slice(start, start + BATCH);
    const vectors = await embedBatch(batch.map((item) => item.text));
    await prisma.$transaction(
      batch.map((item, index) =>
        prisma.catalogEmbedding.upsert({
          where: { kind_itemId: { kind: item.kind, itemId: item.itemId } },
          create: { kind: item.kind, itemId: item.itemId, model: GEMINI_EMBEDDING_MODEL, textHash: item.hash, vector: vectors[index]! },
          update: { model: GEMINI_EMBEDDING_MODEL, textHash: item.hash, vector: vectors[index]! },
        }),
      ),
    );
    onProgress?.(Math.min(start + BATCH, stale.length), stale.length);
  }

  const orphans = existing.filter((row) => !live.has(`${row.kind}:${row.itemId}`)).map((row) => row.id);
  if (orphans.length) await prisma.catalogEmbedding.deleteMany({ where: { id: { in: orphans } } });

  // Writes already invalidated the index; once more now that every batch has committed.
  if (stale.length || orphans.length) invalidateTags(CacheTags.embeddings);
  return { embedded: stale.length, unchanged: items.length - stale.length, removed: orphans.length };
}

/**
 * Re-sync after the current response is sent (admin saves, deletes). Never
 * blocks or fails the request — a missed sync is picked up by the next one.
 */
export function scheduleEmbeddingSync() {
  if (!isGeminiConfigured()) return;
  after(() =>
    syncCatalogEmbeddings().catch((error) => {
      console.error("[embeddings] sync failed", error);
    }),
  );
}

// ---- vectors in memory ------------------------------------------------------------------

export type Vector = Float32Array;

export interface EmbeddingIndex {
  /** `${kind}:${itemId}` → unit-length vector. */
  vectors: Map<string, Vector>;
  size: number;
}

let lastHeal = 0;

function normalize(values: number[]): Vector {
  const vector = Float32Array.from(values);
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vector.length; i++) vector[i]! /= norm;
  return vector;
}

/**
 * All catalog vectors. Empty when embeddings aren't set up. Cached for every request
 * and dropped whenever a vector is written (the `embeddings` tag).
 */
export async function loadEmbeddingIndex(): Promise<EmbeddingIndex> {
  const index = await cached("embedding-index", { ttl: 600, swr: 3600, tags: [CacheTags.embeddings] }, async () => {
    const rows = await prisma.catalogEmbedding.findMany({
      where: { model: GEMINI_EMBEDDING_MODEL },
      select: { kind: true, itemId: true, vector: true },
    });
    const vectors = new Map<string, Vector>();
    for (const row of rows) if (row.vector.length) vectors.set(`${row.kind}:${row.itemId}`, normalize(row.vector));
    return { vectors, size: vectors.size };
  });

  // Self-heal: new items (e.g. user collections) get embedded in the background, at most every 10 min.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  if (isGeminiConfigured() && !building && Date.now() - lastHeal > 10 * 60_000) {
    lastHeal = Date.now();
    try {
      after(() => syncCatalogEmbeddings().catch(() => undefined));
    } catch {
      // Outside a request (scripts) there is no `after` — skip the heal.
    }
  }
  return index;
}

export const embeddingKey = (kind: EmbeddingKind, itemId: string) => `${kind}:${itemId}`;

export function dot(a: Vector, b: Vector) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i]! * b[i]!;
  return sum;
}

/** Weighted mean of item vectors, re-normalised — the user's position in taste space. */
export function centroid(entries: { vector: Vector; weight: number }[]): Vector | null {
  const usable = entries.filter((entry) => entry.weight > 0);
  if (!usable.length) return null;
  const out = new Float32Array(usable[0]!.vector.length);
  for (const { vector, weight } of usable) for (let i = 0; i < out.length; i++) out[i]! += vector[i]! * weight;
  let norm = 0;
  for (const value of out) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i++) out[i]! /= norm;
  return out;
}
