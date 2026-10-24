import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicBeta } from "@anthropic-ai/sdk/resources/beta/beta";

/** Model for catalog import + review. */
export const CATALOG_MODEL = "claude-opus-5-5";

/**
 * Server-side refusal fallback: if a safety classifier declines a request
 * (e.g. a dark-themed synopsis), the API retries on a fallback model inside
 * the same call instead of failing the admin's import.
 */
export const REFUSAL_FALLBACK: { betas: AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

export function isClaudeConfigured() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.ANTHROPIC_PROFILE,
  );
}

let client: Anthropic | null = null;

/** Lazily-created client; credentials come from the environment. */
export function claude() {
  client ??= new Anthropic({ timeout: 5 * 60 * 1000 });
  return client;
}

export class CatalogAiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "CatalogAiError";
  }
}

/** Map SDK errors to messages an admin can act on. */
export function toCatalogAiError(error: unknown): CatalogAiError {
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
  return new CatalogAiError(error instanceof Error ? error.message : "Unexpected AI error.");
}
