import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { AnthropicBeta } from "@anthropic-ai/sdk/resources/beta/beta";
import type { z } from "zod";
import { CatalogAiError } from "@/lib/ai/errors";
import type { StructuredRequest, WebResearch } from "@/lib/ai/provider";

/** Claude model used when AI_PROVIDER=claude (or only ANTHROPIC_API_KEY is set). */
export const CLAUDE_MODEL = "claude-opus-5-5";

/**
 * Server-side refusal fallback: if a safety classifier declines a request
 * (e.g. a dark-themed synopsis), the API retries on a fallback model inside
 * the same call instead of failing the admin's import.
 */
const REFUSAL_FALLBACK: { betas: AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

const MAX_CONTINUATIONS = 3;

export function isClaudeConfigured() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.ANTHROPIC_PROFILE,
  );
}

let client: Anthropic | null = null;
function claude() {
  client ??= new Anthropic({ timeout: 5 * 60 * 1000 });
  return client;
}

function toError(error: unknown): CatalogAiError {
  if (error instanceof CatalogAiError) return error;
  if (error instanceof Anthropic.AuthenticationError) {
    return new CatalogAiError("Claude API key is missing or invalid. Check ANTHROPIC_API_KEY.", 503);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new CatalogAiError("Claude is rate limited right now — try again in a minute.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new CatalogAiError(`Claude rejected the request: ${error.message}`, 400);
  }
  if (error instanceof Anthropic.APIError) {
    return new CatalogAiError(`Claude API error (${error.status ?? "network"}). Try again.`, 502);
  }
  return new CatalogAiError(error instanceof Error ? error.message : "Unexpected Claude error.");
}

export async function claudeStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<z.infer<S>> {
  try {
    const response = await claude().beta.messages.parse({
      ...REFUSAL_FALLBACK,
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      output_config: {
        effort: request.depth === "deep" ? "high" : "medium",
        format: betaZodOutputFormat(request.schema),
      },
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
    });
    if (response.stop_reason === "refusal") throw new CatalogAiError("Claude declined this request.", 422);
    if (!response.parsed_output) throw new CatalogAiError("Claude returned an unreadable answer — try again.");
    return response.parsed_output as z.infer<S>;
  } catch (error) {
    throw toError(error);
  }
}

export async function claudeResearch(system: string, instructions: string): Promise<WebResearch> {
  try {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: instructions }];
    let response: Anthropic.Beta.BetaMessage | null = null;

    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
      response = await claude().beta.messages.create({
        ...REFUSAL_FALLBACK,
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
        messages,
      });
      if (response.stop_reason !== "pause_turn") break;
      // The server-side search loop paused — send the turn back so it resumes.
      messages.push({ role: "assistant", content: response.content });
    }

    if (!response) throw new CatalogAiError("Web research returned no response.");
    if (response.stop_reason === "refusal") throw new CatalogAiError("Claude declined to research this title.", 422);

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
    return { factSheet, sources: [...sources].slice(0, 12).map(([url, title]) => ({ url, title })) };
  } catch (error) {
    throw toError(error);
  }
}
