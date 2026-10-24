import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { CATALOG_MODEL, CatalogAiError, REFUSAL_FALLBACK, claude } from "@/lib/ai/claude";

const MAX_CONTINUATIONS = 3;

export interface WebResearch {
  factSheet: string;
  sources: { title: string; url: string }[];
}

/**
 * Ask Claude to research a title with web search and write a plain fact sheet.
 * Kept separate from the structured mapping call so the final JSON is produced
 * from a fixed, citable text rather than mid-search.
 */
export async function researchWithWeb(instructions: string): Promise<WebResearch> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: instructions }];
  let response: Anthropic.Beta.BetaMessage | null = null;

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    response = await claude().beta.messages.create({
      ...REFUSAL_FALLBACK,
      model: CATALOG_MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system:
        "You research entertainment titles for a catalog editor. Prefer authoritative sources " +
        "(official sites, TMDB, IMDb, AniList, MyAnimeList, Wikipedia, MusicBrainz). Report only facts " +
        "you found in sources; write 'unknown' for anything you could not confirm. Never guess numbers or dates.",
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages,
    });
    if (response.stop_reason !== "pause_turn") break;
    // Server-side search loop paused — send the turn back so it resumes.
    messages.push({ role: "assistant", content: response.content });
  }

  if (!response) throw new CatalogAiError("Web research returned no response.");
  if (response.stop_reason === "refusal") {
    throw new CatalogAiError("Claude declined to research this title.", 422);
  }

  const sources = new Map<string, string>();
  const text: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") text.push(block.text);
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) sources.set(result.url, result.title);
    }
  }

  const factSheet = text.join("\n").trim();
  if (!factSheet) throw new CatalogAiError("Web research came back empty — try a more specific title.");
  return {
    factSheet,
    sources: [...sources].slice(0, 12).map(([url, title]) => ({ url, title })),
  };
}
