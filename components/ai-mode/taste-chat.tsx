"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import type { AiMode, ListenPrefs, WatchPrefs } from "@/lib/ai-profile/schema";
import { summarizePrefs } from "@/lib/ai-profile/summary";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const GREETING: Record<AiMode, string> = {
  watch: "Hey! Tell me what you're in the mood for — a feeling, a show you loved, how much time you have. Anything goes.",
  listen: "Hey! What's the moment — studying, a late-night drive, a workout? Tell me what you want to hear.",
};

const STARTERS: Record<AiMode, string[]> = {
  watch: ["Something cozy after a long week", "A mind-bending thriller", "Like Frieren but shorter"],
  listen: ["Music for late-night studying", "Hype songs for the gym", "Anime openings that hit hard"],
};

export interface TasteChatProps<P extends WatchPrefs | ListenPrefs> {
  mode: AiMode;
  initial: P;
  onDone: (prefs: P) => void;
  onCancel: () => void;
}

/** AI-mode chat: free-text taste interview. Gemini keeps structured answers as you talk. */
export function TasteChat<P extends WatchPrefs | ListenPrefs>({ mode, initial, onDone, onCancel }: TasteChatProps<P>) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: GREETING[mode] }]);
  const [prefs, setPrefs] = useState<P>(initial);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS[mode]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const understood = summarizePrefs(mode, prefs);
  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim().slice(0, 600);
    if (!trimmed || sending) return;
    const history: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setInput("");
    setSuggestions([]);
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/mode/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: history.slice(-24), prefs }),
      });
      const data = (await response.json()) as { reply?: string; prefs?: P; suggestions?: string[]; ready?: boolean; error?: string };
      if (!response.ok || !data.reply || !data.prefs) throw new Error(data.error ?? "AI mode didn't answer — try again.");
      setMessages((current) => [...current, { role: "assistant", text: data.reply! }]);
      setPrefs(data.prefs);
      setSuggestions(data.suggestions ?? []);
      setReady(Boolean(data.ready));
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "AI mode didn't answer — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[320px] flex-col gap-3 rounded-3xl border border-white/10 bg-surface/60 p-3 sm:p-5">
        <ol className="flex max-h-[52dvh] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((message, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "rounded-br-md bg-gradient-brand text-white"
                    : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white/90",
                )}
              >
                {message.role === "assistant" ? <Sparkles className="me-1.5 inline size-3.5 -translate-y-px text-brand-pink" aria-hidden /> : null}
                {message.text}
              </p>
            </motion.li>
          ))}
          {sending ? (
            <li className="flex justify-start" aria-label="AI mode is typing">
              <span className="flex gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="size-1.5 rounded-full bg-white/70"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                  />
                ))}
              </span>
            </li>
          ) : null}
          <div ref={endRef} />
        </ol>

        {suggestions.length && !sending ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="cursor-pointer rounded-full border border-brand-magenta/40 px-3 py-1.5 text-xs text-white/85 transition-colors hover:bg-brand-magenta/15"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="mt-auto flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <label className="sr-only" htmlFor="ai-mode-chat-input">
            Message AI mode
          </label>
          <textarea
            id="ai-mode-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={600}
            placeholder={mode === "watch" ? "e.g. something cozy, like Frieren, ~1 hour a day" : "e.g. chill songs for late-night coding"}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-brand text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </form>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">What I&apos;ve understood</p>
        {understood.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {understood.map((chip) => (
              <li key={chip} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/85">
                {chip}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-white/50">Nothing yet — say what you&apos;re in the mood for.</p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 sm:w-auto"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </button>
        <button
          type="button"
          disabled={!userTurns || sending}
          onClick={() => onDone(prefs)}
          className={cn(
            "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto",
            ready ? "bg-gradient-brand shadow-[0_0_24px_rgba(255,0,204,0.35)]" : "border border-brand-magenta/60 hover:bg-brand-magenta/15",
          )}
        >
          <Sparkles className="size-4" aria-hidden /> Show my picks
        </button>
      </div>
    </div>
  );
}
