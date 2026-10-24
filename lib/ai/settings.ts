import "server-only";

import { activeProvider, PROVIDER_LABELS } from "@/lib/ai/provider";
import { isTmdbConfigured } from "@/lib/catalog-import/sources/tmdb";

export interface AdminAiSettings {
  enabled: boolean;
  tmdbEnabled: boolean;
  /** e.g. "Google Gemini" — shown so the admin knows which model drafts fields. */
  providerLabel?: string;
}

/** What the admin forms need to know about the AI setup (no secrets). */
export function adminAiSettings(): AdminAiSettings {
  const provider = activeProvider();
  return {
    enabled: provider !== null,
    tmdbEnabled: isTmdbConfigured(),
    providerLabel: provider ? PROVIDER_LABELS[provider] : undefined,
  };
}
