import "server-only";

import { cached, CacheTags } from "@/lib/cache/server-cache";
import { geminiEmbed, isGeminiConfigured } from "@/lib/ai/providers/gemini";
import { HELP_ARTICLES, helpArticleText, type HelpArticle } from "@/lib/assistant/knowledge";
import type { AssistantSource } from "@/lib/assistant/types";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { getContentDetailPath } from "@/lib/content-routes";
import { getSongDetailPath } from "@/lib/song-routes";
import { getAnalyticsData } from "@/lib/data/analytics";
import { dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { getRoadmapTeaser } from "@/lib/services/roadmap.service";
import { getScreenTimeStatus } from "@/lib/services/screen-time.service";
import { getAiProfileInsights } from "@/lib/services/ai-profile.service";
import { loadTasteCatalog } from "@/lib/services/taste-engine.service";

/**
 * Retrieval for the AniVerse Assistant. Three sources, each searched for the question:
 *  1. help articles — semantic (gemini-embedding-001, same index as the recommender)
 *     blended with keyword overlap, so it still works when embeddings are unavailable;
 *  2. the catalog — titles, songs and artists by meaning or by name;
 *  3. the asking user's own snapshot (private; never another user's data).
 */

const STOPWORDS = new Set("the a an and or but is are was were be to of in on for with how do does did i me my you your it its this that what why when where which who can could should would will there their them they we our us so if as at by from about into any some not no yes".split(" "));

function tokens(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

const ARTICLE_TOKENS = new Map(HELP_ARTICLES.map((article) => [article.id, new Set(tokens(helpArticleText(article)))]));

/** Share of the question's words found in the article, with title/keyword hits counting double. */
function keywordScore(question: string[], article: HelpArticle) {
  if (!question.length) return 0;
  const body = ARTICLE_TOKENS.get(article.id)!;
  const strong = new Set(tokens(`${article.title} ${article.keywords.join(" ")}`));
  let score = 0;
  for (const word of question) score += strong.has(word) ? 2 : body.has(word) ? 1 : 0;
  return score / (question.length * 2);
}

async function embedQuery(text: string): Promise<Vector | null> {
  if (!isGeminiConfigured()) return null;
  try {
    return await cached(`assistant:query:${text}`, { ttl: 3600, tags: [CacheTags.embeddings] }, async () => {
      const [values] = await geminiEmbed([text], "RETRIEVAL_QUERY", 768);
      let norm = 0;
      for (const value of values!) norm += value * value;
      norm = Math.sqrt(norm) || 1;
      return Float32Array.from(values!, (value) => value / norm);
    });
  } catch {
    // Quota or network trouble: keyword retrieval still answers.
    return null;
  }
}

const minMax = (values: number[]) => {
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  return (value: number) => (value - lo) / span;
};

export interface Retrieved {
  articles: HelpArticle[];
  sources: AssistantSource[];
  /** Numbered context block for the prompt. */
  context: string;
  /** The asking user's own data, for "my …" questions. */
  snapshot: string;
  semantic: boolean;
}

export async function retrieve(userId: string, question: string, previousQuestion?: string): Promise<Retrieved> {
  // Follow-ups like "and for music?" need the previous turn to make sense.
  const searchText = previousQuestion && question.split(/\s+/).length < 6 ? `${previousQuestion} ${question}` : question;
  const words = tokens(searchText);
  const [vector, index, catalog, snapshot] = await Promise.all([embedQuery(searchText), loadEmbeddingIndex(), loadTasteCatalog(), userSnapshot(userId)]);

  // ---- Help articles: semantic + keyword ------------------------------------------------
  const semantic = HELP_ARTICLES.map((article) => {
    const help = vector ? index.vectors.get(embeddingKey("help", article.id)) : undefined;
    return help ? dot(vector!, help) : 0;
  });
  const haveSemantic = semantic.some((value) => value !== 0);
  const normalize = minMax(semantic);
  const articles = HELP_ARTICLES.map((article, position) => ({
    article,
    score: (haveSemantic ? 0.65 * normalize(semantic[position]!) : 0) + (haveSemantic ? 0.35 : 1) * keywordScore(words, article),
  }))
    .sort((a, b) => b.score - a.score)
    .filter((entry, position) => position === 0 || entry.score >= 0.45)
    .slice(0, 3)
    .map((entry) => entry.article);

  // ---- Catalog: named titles first, then closest by meaning ------------------------------
  type Hit = { source: AssistantSource; text: string; score: number };
  const hits: Hit[] = [];
  // Whole-word name match. Short titles that are everyday words ("You", "Dark", "After")
  // only count when typed with their capitalisation.
  const isNamed = (title: string) => {
    if (title.length < 3) return false;
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, title.length <= 5 ? "u" : "iu").test(searchText);
  };
  const consider = (kind: "content" | "track" | "artist", id: string, title: string, make: () => Omit<Hit, "score">) => {
    const named = isNamed(title);
    const itemVector = vector ? index.vectors.get(embeddingKey(kind, id)) : undefined;
    const cos = itemVector ? dot(vector!, itemVector) : 0;
    if (named || cos > 0) hits.push({ ...make(), score: (named ? 1 : 0) + cos });
  };
  for (const row of catalog.content) {
    consider("content", row.id, row.title, () => ({
      source: { kind: "title", title: row.title, href: getContentDetailPath(row.slug), subtitle: [row.type.toLowerCase(), row.year].filter(Boolean).join(" · "), imageUrl: row.imageUrl ?? undefined },
      text: `${row.title} (${row.type.toLowerCase()}${row.year ? `, ${row.year}` : ""}). Genres: ${row.genres.map((g) => g.genre.label).join(", ")}. ${(row.synopsis ?? row.description ?? "").slice(0, 280)}`,
    }));
  }
  for (const row of catalog.tracks) {
    consider("track", row.id, row.title, () => ({
      source: { kind: "song", title: row.title, href: getSongDetailPath(row.slug), subtitle: row.artist, imageUrl: row.imageUrl ?? undefined },
      text: `Song "${row.title}" by ${row.artist}${row.year ? ` (${row.year})` : ""}.`,
    }));
  }
  for (const row of catalog.artists) {
    consider("artist", row.id, row.title, () => ({
      source: { kind: "artist", title: row.title, href: getArtistDetailPath(row.slug), subtitle: "artist", imageUrl: row.imageUrl ?? undefined },
      text: `Artist ${row.title}. ${(row.synopsis ?? "").slice(0, 200)}`,
    }));
  }
  // Is this a question about content at all? Measured: for "how do I…" questions the best help
  // article beats the best catalog item by 0.13–0.20; for "suggest…/is there…" the catalog wins.
  const topCos = Math.max(0, ...hits.map((hit) => hit.score % 1));
  const aboutContent = topCos >= Math.max(0, ...semantic) - 0.03;
  const catalogHits = hits
    .sort((a, b) => b.score - a.score)
    // Titles named in the question always; by meaning only for content questions, near the best match.
    .filter((hit) => hit.score >= 1 || (aboutContent && hit.score >= topCos - 0.06))
    .slice(0, 5);

  // ---- Numbered context (citations [n] map to sources[n-1]) -------------------------------
  const sources: AssistantSource[] = [
    ...articles.map((article) => ({ kind: "help" as const, title: article.title, href: article.route, subtitle: article.routeLabel })),
    ...catalogHits.map((hit) => hit.source),
  ];
  const blocks = [
    ...articles.map((article, position) => `[${position + 1}] Help article "${article.title}"${article.route ? ` (link: ${article.route})` : ""}:\n${article.body}`),
    ...catalogHits.map((hit, position) => `[${articles.length + position + 1}] Catalog item (link: ${hit.source.href}):\n${hit.text}`),
  ];
  return { articles, sources, context: blocks.join("\n\n"), snapshot, semantic: Boolean(vector) };
}

/** A short, private summary of the asking user's own account. */
async function userSnapshot(userId: string): Promise<string> {
  const [analytics, roadmap, screenTime, insights] = await Promise.all([
    getAnalyticsData(userId).catch(() => null),
    getRoadmapTeaser(userId).catch(() => null),
    getScreenTimeStatus(userId).catch(() => null),
    getAiProfileInsights(userId).catch(() => null),
  ]);
  const lines: string[] = [];
  if (analytics) lines.push(...analytics.kpis.map((kpi) => `${kpi.label}: ${kpi.value}${kpi.delta ? ` (${kpi.delta} vs last month)` : ""}`));
  if (roadmap) lines.push(`Active roadmap "${roadmap.title}": ${roadmap.doneSteps}/${roadmap.totalSteps} steps done${roadmap.next ? `, next: ${roadmap.next.title}` : ""}.`);
  else lines.push("No active roadmap.");
  if (screenTime) {
    lines.push(
      screenTime.enabled
        ? `Daily limit ${screenTime.limitMinutes} min; used ${screenTime.usedMinutes} min today${screenTime.locked ? " (locked until midnight)" : ""}.`
        : "No daily limit set.",
    );
  }
  if (insights?.watchTraits.length) lines.push(`Taste reads as: ${insights.watchTraits.slice(0, 4).map((trait) => trait.label).join(", ")}.`);
  if (insights?.topGenres.length) lines.push(`Top genres: ${insights.topGenres.map((genre) => genre.label).join(", ")}.`);
  if (insights?.mostWatched.length) lines.push(`Most watched lately: ${insights.mostWatched.map((item) => item.title).join(", ")}.`);
  return lines.join("\n");
}
