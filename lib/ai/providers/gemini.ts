import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentConfig } from "@google/genai";
import { z } from "zod";
import { CatalogAiError } from "@/lib/ai/errors";
import type { StructuredRequest, TextStreamRequest, WebResearch } from "@/lib/ai/provider";

/**
 * Google Gemini via the official @google/genai SDK, on two tiers:
 *  - smart (`gemini-flash-latest`): admin import/review and roadmaps. The free tier
 *    allows only ~20 requests a day on it.
 *  - fast (`gemini-flash-lite-latest`): high-volume user features (AI-mode chat), with a
 *    much larger free quota. Smart calls fall back to it when their daily quota runs out.
 * Override with GEMINI_MODEL / GEMINI_FAST_MODEL.
 */
export type GeminiTier = "smart" | "fast";

const model = (tier: GeminiTier = "smart") =>
  tier === "fast"
    ? process.env.GEMINI_FAST_MODEL || "gemini-flash-lite-latest"
    : process.env.GEMINI_MODEL || "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function toError(error: unknown): CatalogAiError {
  if (error instanceof CatalogAiError) return error;
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new CatalogAiError("Gemini's free-tier limit was reached — try again in a minute (or tomorrow if the daily quota is used up).", 429);
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return new CatalogAiError("Gemini rejected the request — check GEMINI_API_KEY (and GEMINI_MODEL if set).", 503);
    }
    if (error.status === 503) {
      return new CatalogAiError("Gemini is overloaded right now (free tier) — try again in a minute.", 503);
    }
    return new CatalogAiError(`Gemini API error (${error.status}). Try again.`, 502);
  }
  return new CatalogAiError(error instanceof Error ? error.message : "Unexpected Gemini error.");
}

/** Gemini's JSON-schema mode doesn't want the `$schema` meta key. */
function jsonSchemaFor(schema: z.ZodType) {
  const { $schema: _meta, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _meta;
  return rest;
}

/** The free tier answers 503 "model overloaded" at busy times — retry twice with backoff. */
async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (const delay of [2_000, 5_000]) {
    try {
      return await call();
    } catch (error) {
      if (!(error instanceof ApiError) || ![500, 502, 503, 504].includes(error.status)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return call();
}

/**
 * Drafting doesn't need deep reasoning — low thinking keeps imports fast.
 * Older models that don't accept `thinkingLevel` get one retry without it.
 */
async function generateOn(name: string, prompt: string, config: GenerateContentConfig, level: ThinkingLevel) {
  try {
    return await withRetry(() =>
      gemini().models.generateContent({
        model: name,
        contents: prompt,
        config: { ...config, thinkingConfig: { thinkingLevel: level } },
      }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return withRetry(() => gemini().models.generateContent({ model: name, contents: prompt, config }));
    }
    throw error;
  }
}

/** Run on the requested tier; a smart call that hits its quota is retried on the fast tier. */
async function generateWithThinking(prompt: string, config: GenerateContentConfig, level: ThinkingLevel, tier: GeminiTier = "smart") {
  try {
    return await generateOn(model(tier), prompt, config, level);
  } catch (error) {
    if (tier === "smart" && error instanceof ApiError && error.status === 429 && model("fast") !== model("smart")) {
      console.warn(`[gemini] ${model("smart")} quota reached — falling back to ${model("fast")}`);
      return generateOn(model("fast"), prompt, config, level);
    }
    throw error;
  }
}

export async function geminiStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<z.infer<S>> {
  try {
    const response = await generateWithThinking(
      request.prompt,
      {
        systemInstruction: request.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaFor(request.schema),
      },
      request.depth === "deep" ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
      request.tier,
    );
    const text = response.text;
    if (!text) {
      throw new CatalogAiError("Gemini returned no answer (it may have been blocked by a safety filter).", 422);
    }
    const parsed = request.schema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new CatalogAiError("Gemini returned an unexpected shape — try again.");
    return parsed.data;
  } catch (error) {
    if (error instanceof SyntaxError) throw new CatalogAiError("Gemini returned invalid JSON — try again.");
    throw toError(error);
  }
}

/** Streamed plain-text reply for chat. Starts on the fast tier (low latency, bigger free quota). */
export async function* geminiStream(request: TextStreamRequest): AsyncGenerator<string> {
  try {
    const stream = await withRetry(() =>
      gemini().models.generateContentStream({
        model: model(request.tier ?? "fast"),
        contents: request.messages.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] })),
        config: { systemInstruction: request.system },
      }),
    );
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (error) {
    throw toError(error);
  }
}

/** Pre-trained text-embedding model (free tier) used by the recommender. */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/** One vector per text. Documents (catalog items) and queries (user taste) use different task types. */
export async function geminiEmbed(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  dimensions: number,
): Promise<number[][]> {
  try {
    const response = await withRetry(() =>
      gemini().models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents: texts,
        config: { taskType, outputDimensionality: dimensions },
      }),
    );
    const vectors = response.embeddings?.map((embedding) => embedding.values ?? []) ?? [];
    if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== dimensions)) {
      throw new CatalogAiError("Gemini returned an unexpected embedding shape.");
    }
    return vectors;
  } catch (error) {
    throw toError(error);
  }
}

export async function geminiResearch(system: string, instructions: string, tier: GeminiTier = "smart"): Promise<WebResearch> {
  try {
    const research = (name: string) =>
      withRetry(() =>
        gemini().models.generateContent({
          model: name,
          contents: instructions,
          config: { systemInstruction: system, tools: [{ googleSearch: {} }] },
        }),
      );
    const response = await research(model(tier)).catch((error: unknown) => {
      if (tier === "smart" && error instanceof ApiError && error.status === 429) return research(model("fast"));
      throw error;
    });
    const factSheet = response.text?.trim();
    if (!factSheet) throw new CatalogAiError("Web research came back empty — try a more specific title.");

    const sources = new Map<string, string>();
    for (const chunk of response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
      if (chunk.web?.uri) sources.set(chunk.web.uri, chunk.web.title ?? chunk.web.uri);
    }
    return { factSheet, sources: [...sources].slice(0, 12).map(([url, title]) => ({ url, title })) };
  } catch (error) {
    throw toError(error);
  }
}
