import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CatalogAiError } from "@/lib/ai/errors";
import type { StructuredRequest, WebResearch } from "@/lib/ai/provider";

/**
 * Google Gemini via the official @google/genai SDK. `gemini-flash-latest`
 * always tracks the current Flash model, which the free tier covers.
 * Override with GEMINI_MODEL if you want a specific model.
 */
const model = () => process.env.GEMINI_MODEL || "gemini-flash-latest";

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
      return new CatalogAiError("Gemini's free-tier limit was reached — wait a minute and try again.", 429);
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return new CatalogAiError("Gemini rejected the request — check GEMINI_API_KEY (and GEMINI_MODEL if set).", 503);
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

export async function geminiStructured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<z.infer<S>> {
  try {
    const response = await gemini().models.generateContent({
      model: model(),
      contents: request.prompt,
      config: {
        systemInstruction: request.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaFor(request.schema),
      },
    });
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

export async function geminiResearch(system: string, instructions: string): Promise<WebResearch> {
  try {
    const response = await gemini().models.generateContent({
      model: model(),
      contents: instructions,
      config: { systemInstruction: system, tools: [{ googleSearch: {} }] },
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
