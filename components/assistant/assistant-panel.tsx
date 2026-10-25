"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, BookOpen, Check, Clapperboard, Copy, Lightbulb, MicVocal, Music, RotateCcw, Sparkles, Square, SquarePen, X } from "lucide-react";
import { AssistantMarkdown, citedSources } from "@/components/assistant/assistant-markdown";
import { useAssistant } from "@/components/assistant/assistant-context";
import { suggestedQuestions } from "@/lib/assistant/knowledge";
import type { AssistantMessage, AssistantSource } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

const SOURCE_ICON = { help: BookOpen, title: Clapperboard, song: Music, artist: MicVocal } as const;

function Orb({ size = "size-9", pulse = false }: { size?: string; pulse?: boolean }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-pink", size)}>
      {pulse ? <span className="absolute inset-0 rounded-2xl bg-brand-magenta/40 motion-safe:animate-ping" aria-hidden /> : null}
      <Sparkles className="relative size-1/2" aria-hidden />
    </span>
  );
}

/** Floating "Ask AI" button — hidden while the panel is open. */
export function AssistantLauncher() {
  const { open, setOpen } = useAssistant();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open AniVerse Assistant (Ctrl + /)"
      title="Ask AniVerse Assistant · Ctrl + /"
      className="group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[250] inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-brand p-3 text-sm font-semibold text-white shadow-glow-pink transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 lg:bottom-6 lg:right-6"
    >
      <Sparkles className="size-5 transition-transform group-hover:rotate-12" aria-hidden />
      <span className="hidden sm:inline">Ask AI</span>
    </button>
  );
}

function SourceChips({ message }: { message: AssistantMessage }) {
  const cited = citedSources(message.content, message.sources ?? []);
  if (!cited.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Sources">
      {cited.map(({ n, source }) => (
        <SourceChip key={n} n={n} source={source} />
      ))}
    </div>
  );
}

function SourceChip({ n, source }: { n: number; source: AssistantSource }) {
  const Icon = SOURCE_ICON[source.kind];
  const body = (
    <>
      <span className="flex size-4 items-center justify-center rounded-full bg-brand-magenta/25 text-[10px] font-bold text-brand-pink">{n}</span>
      {source.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.imageUrl} alt="" className="size-5 rounded object-cover" />
      ) : (
        <Icon className="size-3.5 text-white/55" aria-hidden />
      )}
      <span className="max-w-[160px] truncate">{source.title}</span>
    </>
  );
  const className = "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5 text-caption text-white/75 transition-colors";
  return source.href ? (
    <Link href={source.href} className={cn(className, "hover:border-brand-magenta/40 hover:bg-white/[0.08] hover:text-white")}>
      {body}
    </Link>
  ) : (
    <span className={className}>{body}</span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text.replace(/\[(\d+)\](?!\()/g, "")).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label={copied ? "Copied" : "Copy answer"}
      className="cursor-pointer rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
    >
      {copied ? <Check className="size-3.5 text-emerald-300" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 text-caption text-white/55" role="status">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-1.5 rounded-full bg-brand-pink motion-safe:animate-bounce" style={{ animationDelay: `${dot * 120}ms` }} />
        ))}
      </span>
      Searching AniVerse help, catalog and your stats…
    </div>
  );
}

function Message({ message, last }: { message: AssistantMessage; last: boolean }) {
  const { streaming, retry } = useAssistant();
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-brand px-3.5 py-2.5 text-sm text-white shadow-card-inner">{message.content}</p>
      </div>
    );
  }
  const live = last && streaming;
  return (
    <div className="flex gap-2.5">
      <Orb size="size-7" />
      <div className="min-w-0 flex-1">
        {message.error ? (
          <div className="rounded-2xl rounded-tl-md border border-amber-300/25 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-100">{message.content}</div>
        ) : !message.content && live ? (
          <Thinking />
        ) : (
          <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.04] px-3.5 py-3">
            <AssistantMarkdown text={message.content} sources={message.sources} />
            {live ? <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-brand-pink motion-safe:animate-pulse" aria-hidden /> : null}
            {!live ? <SourceChips message={message} /> : null}
          </div>
        )}
        {!live && message.content ? (
          <div className="mt-1 flex items-center gap-0.5">
            {!message.error ? <CopyButton text={message.content} /> : null}
            {last ? (
              <button type="button" onClick={retry} aria-label="Ask again" className="cursor-pointer rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                <RotateCcw className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  const { userName, ask } = useAssistant();
  const pathname = usePathname();
  const suggestions = useMemo(() => suggestedQuestions(pathname), [pathname]);
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 px-1 py-6">
      <div className="flex flex-col items-start gap-3">
        <Orb size="size-12" />
        <div>
          <h3 className="text-xl font-bold text-white">Hi {userName.split(" ")[0]} 👋</h3>
          <p className="mt-1 text-sm text-white/60">Ask me anything about AniVerse — features, settings, titles in the catalog, or your own stats.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-white/45">
          <Lightbulb className="size-3.5" aria-hidden /> Try asking
        </p>
        {suggestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => ask(question)}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-left text-sm text-white/80 transition-colors hover:border-brand-magenta/40 hover:bg-white/[0.06] hover:text-white"
          >
            {question}
            <ArrowUp className="size-3.5 shrink-0 rotate-45 text-white/30 transition-colors group-hover:text-brand-pink" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer() {
  const { ask, streaming, stop, open } = useAssistant();
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  // Grow with the text, up to ~6 lines.
  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 160)}px`;
  }, [draft]);

  const submit = () => {
    if (!draft.trim() || streaming) return;
    ask(draft);
    setDraft("");
  };

  return (
    <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 rounded-2xl border border-white/15 bg-black/30 p-1.5 pl-3.5 transition-colors focus-within:border-brand-magenta/60"
      >
        <textarea
          ref={ref}
          value={draft}
          rows={1}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about AniVerse…"
          aria-label="Ask the AniVerse Assistant"
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
        />
        {streaming ? (
          <button type="button" onClick={stop} aria-label="Stop answering" className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/15 text-white transition-colors hover:bg-white/25">
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-brand text-white transition-opacity disabled:cursor-default disabled:opacity-35"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        )}
      </form>
      <p className="mt-1.5 px-1 text-center text-[11px] text-white/35">Answers come from AniVerse help, catalog and your stats · can make mistakes</p>
    </div>
  );
}

/**
 * The assistant panel: docked on the right on wide screens, an overlay on laptops,
 * a full-screen sheet on phones.
 */
export function AssistantPanel() {
  const { open, setOpen, messages, streaming, reset } = useAssistant();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastContent = messages.at(-1)?.content;

  // Follow the answer as it streams, unless the reader scrolled up.
  useEffect(() => {
    const area = scrollRef.current;
    if (!area) return;
    if (area.scrollHeight - area.scrollTop - area.clientHeight < 120) area.scrollTop = area.scrollHeight;
  }, [messages.length, lastContent]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="assistant"
          aria-label="AniVerse Assistant"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-0 z-[260] flex flex-col bg-background/95 backdrop-blur-xl lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[400px] lg:border-l lg:border-white/10 lg:shadow-[-24px_0_60px_rgba(0,0,0,0.45)] xl:shadow-none"
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-purple/25 to-transparent" aria-hidden />

          <header className="relative flex items-center gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Orb pulse={streaming} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-white">AniVerse Assistant</h2>
              <p className="flex items-center gap-1.5 truncate text-caption text-white/50">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden /> Grounded in AniVerse help &amp; catalog
              </p>
            </div>
            {messages.length ? (
              <button type="button" onClick={reset} aria-label="New chat" title="New chat" className="cursor-pointer rounded-xl p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">
                <SquarePen className="size-4" aria-hidden />
              </button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close · Esc" className="cursor-pointer rounded-xl p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>
          </header>

          <div ref={scrollRef} className="relative flex flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
            {messages.length ? (
              <div className="flex flex-col gap-5">
                {messages.map((message, index) => (
                  <Message key={message.id} message={message} last={index === messages.length - 1} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          <Composer />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
