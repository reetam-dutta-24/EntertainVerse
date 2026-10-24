import "server-only";

import type { z } from "zod";
import { claudeResearch, claudeStructured, isClaudeConfigured } from "@/lib/ai/providers/claude";
import { geminiResearch, geminiStructured, isGeminiConfigured } from "@/lib/ai/providers/gemini";

/**
 * Pluggable LLM layer for the admin AI features. Pick with AI_PROVIDER in
 * .env.local ("gemini" or "claude"); without it, Gemini is used when
 * GEMINI_API_KEY is set (free tier), otherwise Claude.
 */
export type AiProviderName = "gemini" | "claude";

export const PROVIDER_LABELS: Record<AiProviderName, string> = {
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
};

export interface StructuredRequest<S extends z.ZodType> {
  system: string;
  prompt: string;
  schema: S;
  /** "deep" for careful review work; "standard" for drafting. */
  depth?: "standard" | "deep";
  /** Gemini only: "fast" for high-volume user features (bigger free quota). Default "smart". */
  tier?: "smart" | "fast";
}

export interface WebResearch {
  factSheet: string;
  sources: { title: string; url: string }[];
}

export function activeProvider(): AiProviderName | null {
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred === "claude" && isClaudeConfigured()) return "claude";
  if (preferred === "gemini" && isGeminiConfigured()) return "gemini";
  if (isGeminiConfigured()) return "gemini";
  if (isClaudeConfigured()) return "claude";
  return null;
}

/** "Google Gemini" / "Anthropic Claude" — used in progress labels. */
export function activeProviderLabel() {
  const provider = activeProvider();
  return provider ? PROVIDER_LABELS[provider] : "the AI model";
}

export function isAiConfigured() {
  return activeProvider() !== null;
}

function requireProvider(): AiProviderName {
  const provider = activeProvider();
  if (!provider) {
    throw new Error("No AI provider configured — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to .env.local.");
  }
  return provider;
}

/** JSON output validated against a Zod schema. */
export function generateStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<z.infer<S>> {
  return requireProvider() === "claude" ? claudeStructured(request) : geminiStructured(request);
}

const RESEARCH_SYSTEM =
  "You research entertainment titles for a catalog editor. Prefer authoritative sources " +
  "(official sites, TMDB, IMDb, AniList, MyAnimeList, Wikipedia, MusicBrainz). Report only facts " +
  "you found in sources; write 'unknown' for anything you could not confirm. Never guess numbers or dates.";

/** Web research into a plain fact sheet plus the pages it came from. */
export function researchWithWeb(instructions: string): Promise<WebResearch> {
  return requireProvider() === "claude"
    ? claudeResearch(RESEARCH_SYSTEM, instructions)
    : geminiResearch(RESEARCH_SYSTEM, instructions);
}
