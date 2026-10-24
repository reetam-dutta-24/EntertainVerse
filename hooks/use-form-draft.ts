"use client";

import { useCallback, useEffect, useState } from "react";

const DRAFT_DEBOUNCE_MS = 800;

function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: T };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function hasDraftContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.title === "string" && record.title.trim()) return true;
  if (typeof record.name === "string" && record.name.trim()) return true;
  if (Array.isArray(record.episodes) && record.episodes.length > 0) return true;
  if (Array.isArray(record.characters) && record.characters.length > 0) return true;
  if (Array.isArray(record.catalogReviews) && record.catalogReviews.length > 0) return true;
  if (typeof record.slug === "string" && record.slug.trim()) return true;
  return false;
}

export interface FormDraftMeta {
  restored: boolean;
}

/**
 * Persist form state in localStorage so refresh / failed submit does not wipe inputs.
 * Draft is keyed per form (create vs edit id).
 */
export function useFormDraft<T>(storageKey: string, initial: T) {

  const [form, setFormState] = useState<T>(() => {
    const saved = readDraft<T>(storageKey);
    if (saved && hasDraftContent(saved)) {
      return { ...initial, ...saved };
    }
    return initial;
  });

  const [meta, setMeta] = useState<FormDraftMeta>(() => ({
    restored: Boolean(readDraft<T>(storageKey) && hasDraftContent(readDraft<T>(storageKey))),
  }));

  const setForm = useCallback((value: T | ((current: T) => T)) => {
    setFormState(value);
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey);
    setMeta({ restored: false });
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ data: form, savedAt: Date.now() }),
        );
      } catch {
        /* quota exceeded — ignore */
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [form, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function persistNow() {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ data: form, savedAt: Date.now() }),
        );
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("beforeunload", persistNow);
    return () => window.removeEventListener("beforeunload", persistNow);
  }, [form, storageKey]);

  return { form, setForm, clearDraft, draftRestored: meta.restored };
}
