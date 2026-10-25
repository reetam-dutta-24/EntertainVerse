import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateStructured, isAiConfigured } from "@/lib/ai/provider";
import { WATCH_THEMES, WATCH_VIBES, LISTEN_MOODS } from "@/lib/ai-profile/vocabulary";
import { centroid, dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { loadTasteSignals, rankContent, rankTracks, tasteCentroids, type TasteSignals } from "@/lib/services/taste-engine.service";

/**
 * Group AI mode — "What should we watch / listen to?" for a room or party.
 * Every member counts equally: each person's own ranking (taste engine + embeddings
 * + history + AI-mode answers) scores the shared pool, and a pick has to work for the
 * least-happy member too, not just the average.
 */

export interface GroupMemberFit {
  userId: string;
  name: string;
  avatarColor: string;
  /** 0–100 how well this pick fits them. */
  fit: number;
  reason: string;
}

export interface GroupPick {
  slug: string;
  kind: "content" | "track";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  /** 0–100 for the whole group. */
  groupScore: number;
  members: GroupMemberFit[];
}

export interface GroupPicks {
  mode: "watch" | "listen";
  /** Shared vibe of the group, e.g. "⚡ Edge-of-seat · 🔥 Survival". */
  vibe: string;
  /** One-line verdict from the AI (or a plain fallback). */
  verdict: string;
  picks: GroupPick[];
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string;
  signals: TasteSignals;
  centroid: Vector | null;
  /** slug → { score, reason } from their personal ranking. */
  ranked: Map<string, { score: number; reason: string }>;
}

const scaleCos = (cos: number, min: number, span: number) => Math.round(50 + 40 * Math.max(0, Math.min(1, (cos - min) / span)));

export async function getGroupPicks(userIds: string[], mode: "watch" | "listen", limit = 6): Promise<GroupPicks> {
  const unique = [...new Set(userIds)].slice(0, 12);
  const [users, index] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true, avatarColor: true } }),
    loadEmbeddingIndex(),
  ]);

  const members: Member[] = await Promise.all(
    users.map(async (user) => {
      const signals = await loadTasteSignals(user.id);
      const centroids = await tasteCentroids(signals);
      const list = mode === "watch" ? await rankContent(signals, { limit: 60 }) : await rankTracks(signals, { limit: 60 });
      return {
        userId: user.id,
        name: user.name,
        avatarColor: user.avatarColor,
        signals,
        centroid: mode === "watch" ? centroids.content : centroids.music,
        ranked: new Map(list.map((item) => [item.id, { score: item.matchScore ?? 60, reason: item.reason ?? "Fits your taste" }])),
      };
    }),
  );
  if (!members.length) return { mode, vibe: "", verdict: "Nobody's here yet.", picks: [] };

  // Pool: everyone's top picks; drop what most of the group has already seen.
  const pool = new Map<string, { title: string; subtitle?: string; imageUrl?: string; id: string }>();
  const meta = mode === "watch"
    ? await prisma.content.findMany({ select: { id: true, slug: true, title: true, imageUrl: true, type: true, year: true } })
    : await prisma.musicTrack.findMany({ select: { id: true, slug: true, title: true, imageUrl: true, artist: true } });
  const bySlug = new Map(meta.map((row) => [row.slug, row]));
  for (const member of members) {
    for (const slug of [...member.ranked.keys()].slice(0, 25)) {
      const row = bySlug.get(slug);
      if (!row || pool.has(slug)) continue;
      pool.set(slug, {
        id: row.id,
        title: row.title,
        imageUrl: row.imageUrl ?? undefined,
        subtitle: "artist" in row ? row.artist : [String(row.type).toLowerCase(), row.year].filter(Boolean).join(" · "),
      });
    }
  }
  const seenBy = (slug: string) =>
    members.filter((member) =>
      mode === "watch"
        ? member.signals.favoriteContent.has(slug) || (member.signals.watched.get(slug) ?? 0) > 0.3
        : member.signals.favoriteTracks.has(slug) || (member.signals.listened.get(slug) ?? 0) > 0.5,
    ).length;

  // Semantic fallback scale for items outside someone's personal list.
  const kind = mode === "watch" ? "content" : "track";
  const allCos = members.flatMap((member) =>
    member.centroid ? [...pool.values()].flatMap((item) => (index.vectors.get(embeddingKey(kind, item.id)) ? [dot(index.vectors.get(embeddingKey(kind, item.id))!, member.centroid!)] : [])) : [],
  );
  const cosMin = allCos.length ? Math.min(...allCos) : 0;
  const cosSpan = (allCos.length ? Math.max(...allCos) : 1) - cosMin || 1;

  const scored = [...pool.entries()]
    .filter(([slug]) => members.length < 2 || seenBy(slug) < Math.ceil(members.length / 2))
    .map(([slug, item]) => {
      const vector = index.vectors.get(embeddingKey(kind, item.id));
      const fits: GroupMemberFit[] = members.map((member) => {
        const ranked = member.ranked.get(slug);
        if (ranked) return { userId: member.userId, name: member.name, avatarColor: member.avatarColor, fit: ranked.score, reason: ranked.reason };
        const fit = vector && member.centroid ? scaleCos(dot(vector, member.centroid), cosMin, cosSpan) : 55;
        return { userId: member.userId, name: member.name, avatarColor: member.avatarColor, fit, reason: fit >= 75 ? "Close to your taste" : "A stretch pick for you" };
      });
      const mean = fits.reduce((sum, entry) => sum + entry.fit, 0) / fits.length;
      const worst = Math.min(...fits.map((entry) => entry.fit));
      return { slug, item, fits, groupScore: Math.round(mean * 0.6 + worst * 0.4) };
    })
    .sort((a, b) => b.groupScore - a.groupScore)
    .slice(0, limit);

  const picks: GroupPick[] = scored.map(({ slug, item, fits, groupScore }) => ({
    slug,
    kind,
    title: item.title,
    subtitle: item.subtitle,
    imageUrl: item.imageUrl,
    groupScore,
    members: fits,
  }));

  // Shared vibe from the group's average taste.
  const shared = centroid(members.flatMap((member) => (member.centroid ? [{ vector: member.centroid, weight: 1 }] : [])));
  const vocab = mode === "watch" ? [...WATCH_VIBES, ...WATCH_THEMES] : LISTEN_MOODS;
  const vibe = shared
    ? vocab
        .flatMap((option) => {
          const vector = index.vectors.get(embeddingKey("trait", `${mode}:${option.id}`));
          return vector ? [{ option, score: dot(vector, shared) }] : [];
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ option }) => `${option.emoji} ${option.label}`)
        .join(" · ")
    : "";

  return { mode, vibe, verdict: await groupVerdict(members, picks, mode), picks };
}

/** One friendly line on why the top pick works for this group (fast tier; plain fallback). */
async function groupVerdict(members: Member[], picks: GroupPick[], mode: "watch" | "listen") {
  const top = picks[0];
  if (!top) return "Not enough to go on yet — favorite or watch a few things first.";
  const fallback = `${top.title} is the best fit for all ${members.length} of you (${top.groupScore}% group match).`;
  if (!isAiConfigured() || members.length < 2) return fallback;
  try {
    const out = await generateStructured({
      tier: "fast",
      schema: z.object({ verdict: z.string() }),
      system:
        "You write one short, warm, spoiler-free sentence (max 30 words) telling a group of friends why the top pick suits all of them. Use first names. Only use the facts given.",
      prompt: `Group ${mode === "watch" ? "watching" : "listening"} together. Top pick: ${top.title} (${top.subtitle ?? ""}), ${top.groupScore}% group match.\n` +
        top.members.map((member) => `- ${member.name.split(" ")[0]}: ${member.fit}% · ${member.reason}`).join("\n"),
    });
    return out.verdict.trim() || fallback;
  } catch {
    return fallback;
  }
}
