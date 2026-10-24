import "server-only";

import { z } from "zod";
import { generateStructured } from "@/lib/ai/provider";
import { LANGUAGE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import { listenPrefsSchema, watchPrefsSchema, type AiMode, type ListenPrefs, type WatchPrefs } from "@/lib/ai-profile/schema";
import {
  ARCHETYPES,
  COMMITMENT_OPTIONS,
  DISCOVERY_OPTIONS,
  ENERGY_OPTIONS,
  LISTEN_MOODS,
  PACE_OPTIONS,
  WATCH_AVOID,
  WATCH_FORMATS,
  WATCH_THEMES,
  WATCH_VIBES,
  type VocabOption,
} from "@/lib/ai-profile/vocabulary";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatTurnResult<P> {
  reply: string;
  prefs: P;
  /** Short replies the user can tap. */
  suggestions: string[];
  /** Enough is known to show picks. */
  ready: boolean;
}

const list = (options: readonly VocabOption[]) => options.map((o) => `${o.id} (${o.label})`).join(", ");

const VOCAB_GUIDE: Record<AiMode, string> = {
  watch:
    `formats: ${list(WATCH_FORMATS)}\nvibes: ${list(WATCH_VIBES)}\nthemes: ${list(WATCH_THEMES)}\n` +
    `avoid: ${list(WATCH_AVOID)}\npace: ${list(PACE_OPTIONS)}\ncommitment: ${list(COMMITMENT_OPTIONS)}\n` +
    `archetype: ${list(ARCHETYPES)}\nlanguages: ${LANGUAGE_OPTIONS.map((o) => o.value).join(", ")}\n` +
    "weeklyHours: whole hours per week they can watch, or null",
  listen:
    `moods: ${list(LISTEN_MOODS)}\ngenres: ${SONG_GENRE_OPTIONS.map((o) => o.value).join(", ")}\n` +
    `energy: ${list(ENERGY_OPTIONS)}\ndiscovery: ${list(DISCOVERY_OPTIONS)}\nlanguages: ${LANGUAGE_OPTIONS.map((o) => o.value).join(", ")}`,
};

const FOLLOW_UPS: Record<AiMode, string> = {
  watch: "the vibe, the kind of stories, pacing, how long a commitment, hours per week, or anything to avoid",
  listen: "the mood or moment, the sounds they love, energy level, or how adventurous to be",
};

function systemPrompt(mode: AiMode) {
  const doing = mode === "watch" ? "watch" : "listen to";
  return `You are AniVerse's AI mode — a warm, concise taste guide. In this chat you learn what the user wants to ${doing}, so the app can recommend from its own catalog.

Every turn:
- prefs: the COMPLETE current answers. Keep earlier answers unless the user changes them. Use only the ids listed below; leave a field empty when it is unknown.
- notes: up to 8 short facts in the user's own words that don't fit the lists (titles or artists they love, "loved Frieren's ending", "watching with my partner").
- reply: one or two short sentences. Reflect what you understood, then ask ONE follow-up about the most useful missing piece (${FOLLOW_UPS[mode]}). When ready, say you're ready to show picks instead of asking.
- ready: true once you know the vibe/moods plus at least one more detail, or the user asks for picks.
- suggestions: 2-3 short tappable replies the user might send next (max 40 characters each).

Rules: never recommend specific titles yourself (the app does that from its catalog); stay spoiler-free; if the user goes off-topic, steer back kindly in one sentence.

Allowed ids:
${VOCAB_GUIDE[mode]}`;
}

export async function chatTurn<M extends AiMode>(
  mode: M,
  messages: ChatMessage[],
  prefs: M extends "watch" ? WatchPrefs : ListenPrefs,
): Promise<ChatTurnResult<M extends "watch" ? WatchPrefs : ListenPrefs>> {
  const schema = z.object({
    reply: z.string(),
    suggestions: z.array(z.string()),
    ready: z.boolean(),
    prefs: mode === "watch" ? watchPrefsSchema : listenPrefsSchema,
  });
  const transcript = messages.map((m) => `${m.role === "user" ? "User" : "AI mode"}: ${m.text}`).join("\n");
  const out = await generateStructured({
    // Chat is high-volume: the fast tier has a far bigger free quota.
    tier: "fast",
    system: systemPrompt(mode),
    schema,
    prompt: `Current answers:\n${JSON.stringify(prefs)}\n\nConversation so far:\n${transcript}\n\nWrite the next turn.`,
  });
  return {
    reply: out.reply.trim(),
    prefs: out.prefs as M extends "watch" ? WatchPrefs : ListenPrefs,
    suggestions: out.suggestions.map((s) => s.trim()).filter((s) => s && s.length <= 60).slice(0, 3),
    ready: out.ready,
  };
}
