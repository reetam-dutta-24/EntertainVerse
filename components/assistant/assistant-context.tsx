"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AssistantMessage, AssistantSource, AssistantStreamEvent } from "@/lib/assistant/types";

/** Docked beside the page from this width up; an overlay below it. */
export const ASSISTANT_DOCK_QUERY = "(min-width: 1280px)";
const MAX_SAVED = 40;

interface AssistantContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  userName: string;
  messages: AssistantMessage[];
  streaming: boolean;
  ask: (text: string) => void;
  stop: () => void;
  retry: () => void;
  reset: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("useAssistant must be used inside <AssistantProvider>.");
  return value;
}

/** Safe localStorage (private mode / blocked storage just means nothing is remembered). */
function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore — remembering the chat is a convenience.
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Holds the assistant for the signed-in app: open state, the conversation (kept in this
 * browser, per user) and the streaming call to /api/assistant/chat. Lives in the layout,
 * so a conversation survives navigating between pages.
 */
export function AssistantProvider({ userKey, userName, children }: { userKey: string; userName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const storageKey = `aniverse:assistant:${userKey}`;
  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<AssistantMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  });

  // Restore after mount (localStorage isn't available during server rendering).
  useEffect(() => {
    const saved = load<AssistantMessage[]>(storageKey, []);
    const wasOpen = load<boolean>("aniverse:assistant:open", false) && window.matchMedia(ASSISTANT_DOCK_QUERY).matches;
    const timer = window.setTimeout(() => {
      setMessages(saved.filter((message) => message.content));
      setOpenState(wasOpen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!streaming) save(storageKey, messages.slice(-MAX_SAVED));
  }, [messages, streaming, storageKey]);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    // Only the docked desktop panel is remembered open across visits.
    if (window.matchMedia(ASSISTANT_DOCK_QUERY).matches) save("aniverse:assistant:open", next);
  }, []);
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  // Ctrl/⌘ + / toggles the assistant from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const patchLast = (patch: (message: AssistantMessage) => AssistantMessage) =>
    setMessages((current) => (current.length ? [...current.slice(0, -1), patch(current.at(-1)!)] : current));

  const run = useCallback(
    async (history: AssistantMessage[]) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setMessages([...history, { id: newId(), role: "assistant", content: "", sources: [] }]);
      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.filter((message) => !message.error).map(({ role, content }) => ({ role, content })),
            pathname,
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("ndjson")) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "The assistant couldn't answer right now.");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as AssistantStreamEvent;
            if (event.type === "sources") patchLast((message) => ({ ...message, sources: event.sources as AssistantSource[] }));
            else if (event.type === "delta") patchLast((message) => ({ ...message, content: message.content + event.text }));
            else if (event.type === "error") throw new Error(event.message);
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          patchLast((message) => ({
            ...message,
            error: true,
            content: message.content || (error instanceof Error ? error.message : "Something went wrong."),
          }));
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [pathname],
  );

  const ask = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || abortRef.current) return;
      void run([...messagesRef.current.filter((message) => message.content), { id: newId(), role: "user", content: question }]);
    },
    [run],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Ask the last question again. */
  const retry = useCallback(() => {
    if (abortRef.current) return;
    const current = messagesRef.current;
    const lastUser = current.findLastIndex((message) => message.role === "user");
    if (lastUser >= 0) void run(current.slice(0, lastUser + 1));
  }, [run]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, toggle, userName, messages, streaming, ask, stop, retry, reset }),
    [open, setOpen, toggle, userName, messages, streaming, ask, stop, retry, reset],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
