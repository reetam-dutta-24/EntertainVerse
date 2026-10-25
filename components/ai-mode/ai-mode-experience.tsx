"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Headphones, LoaderCircle, Map as MapIcon, MessageCircle, PencilLine, RefreshCw, Settings2, Sparkles, Tv, WandSparkles } from "lucide-react";
import { TasteChat } from "@/components/ai-mode/taste-chat";
import { TasteQuiz } from "@/components/ai-mode/taste-quiz";
import { ContentCarouselSection, MusicCarouselSection } from "@/components/dashboard";
import { hasListenPrefs, hasWatchPrefs, type AiMode, type ListenPrefs, type WatchPrefs } from "@/lib/ai-profile/schema";
import type { QuizCatalog } from "@/lib/ai-profile/quiz";
import { summarizePrefs } from "@/lib/ai-profile/summary";
import { VOCAB } from "@/lib/ai-profile/vocabulary";
import type { AiModePicks } from "@/lib/services/ai-mode.service";
import { cn } from "@/lib/utils";

type Phase = "start" | "quiz" | "chat" | "loading" | "results";

export interface AiModeExperienceProps {
  initialMode: AiMode;
  initialStart?: "quiz" | "chat";
  initialWatch: WatchPrefs;
  initialListen: ListenPrefs;
  /** Chat needs an AI provider; the quiz works without one. */
  chatEnabled: boolean;
  /** Posters / artist photos for the quiz's "which did you love?" cards. */
  quizCatalog?: QuizCatalog;
}

const MODE_COPY: Record<AiMode, { label: string; icon: typeof Tv; what: string }> = {
  watch: { label: "Watch", icon: Tv, what: "anime, shows, K-dramas, films" },
  listen: { label: "Listen", icon: Headphones, what: "songs, OSTs and artists" },
};

function ModeToggle({ mode, onChange }: { mode: AiMode; onChange: (mode: AiMode) => void }) {
  return (
    <div role="tablist" aria-label="AI mode" className="grid w-full grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/30 p-1 sm:w-80">
      {(["watch", "listen"] as const).map((value) => {
        const { label, icon: Icon } = MODE_COPY[value];
        return (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => onChange(value)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              mode === value ? "bg-gradient-brand text-white" : "text-white/60 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        );
      })}
    </div>
  );
}

/** AI mode: pick Watch or Listen, answer by quiz cards or chat, get explained picks. */
export function AiModeExperience({ initialMode, initialStart, initialWatch, initialListen, chatEnabled, quizCatalog }: AiModeExperienceProps) {
  const [mode, setMode] = useState<AiMode>(initialMode);
  const [phase, setPhase] = useState<Phase>(initialStart === "chat" && !chatEnabled ? "quiz" : (initialStart ?? "start"));
  const [watch, setWatch] = useState(initialWatch);
  const [listen, setListen] = useState(initialListen);
  const [picks, setPicks] = useState<AiModePicks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prefs = mode === "watch" ? watch : listen;
  const hasSaved = mode === "watch" ? hasWatchPrefs(watch) : hasListenPrefs(listen);

  async function finish(next: WatchPrefs | ListenPrefs | null) {
    if (next) {
      if (mode === "watch") setWatch(next as WatchPrefs);
      else setListen(next as ListenPrefs);
    }
    setPhase("loading");
    setError(null);
    try {
      const response = await fetch("/api/ai/mode/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next ? { mode, prefs: next } : { mode }),
      });
      const data = (await response.json()) as { picks?: AiModePicks; error?: string };
      if (!response.ok || !data.picks) throw new Error(data.error ?? "Couldn't load picks.");
      setPicks(data.picks);
      setPhase("results");
    } catch (picksError) {
      setError(picksError instanceof Error ? picksError.message : "Couldn't load picks.");
      setPhase("start");
    }
  }

  function switchMode(next: AiMode) {
    setMode(next);
    setPicks(null);
    if (phase !== "start") setPhase("start");
  }

  const archetype = mode === "watch" && watch.archetype ? VOCAB.archetypes.get(watch.archetype) : undefined;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-brand-magenta/25 bg-gradient-to-br from-brand-purple/25 via-surface to-surface p-4 shadow-card-inner sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-pink">
              <WandSparkles className="size-5 text-white" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">AI mode</h1>
              <p className="mt-0.5 text-sm text-white/65">Stop scrolling. Tell us how you feel — get picks that fit, with reasons.</p>
            </div>
          </div>
          <ModeToggle mode={mode} onChange={switchMode} />
        </div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${mode}-${phase}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          {phase === "start" ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPhase("quiz")}
                  className="group flex cursor-pointer flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-magenta/50 hover:bg-white/[0.07]"
                >
                  <span className="text-3xl" aria-hidden>🃏</span>
                  <span>
                    <span className="block text-base font-bold text-white">Take the taste quiz</span>
                    <span className="mt-1 block text-sm text-white/60">
                      Two minutes, tap-only. Niche questions about {MODE_COPY[mode].what} — skip any you don&apos;t care about.
                    </span>
                  </span>
                  <span className="mt-auto text-sm font-semibold text-brand-pink">Start quiz →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("chat")}
                  disabled={!chatEnabled}
                  className="group flex cursor-pointer flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-magenta/50 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <span className="text-3xl" aria-hidden>💬</span>
                  <span>
                    <span className="block text-base font-bold text-white">Just tell me</span>
                    <span className="mt-1 block text-sm text-white/60">
                      {chatEnabled ? "Describe it in your own words — the AI asks a follow-up or two." : "Chat needs the AI model — use the quiz for now."}
                    </span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-pink">
                    <MessageCircle className="size-4" aria-hidden /> Start chatting →
                  </span>
                </button>
              </div>
              <Link
                href="/dashboard/ai-mode/match"
                className="group flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-magenta/50 hover:bg-white/[0.07]"
              >
                <span className="text-3xl" aria-hidden>👥</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-white">AI Match — find your people</span>
                  <span className="mt-0.5 block text-sm text-white/60">Get grouped with people who share your taste, nearby or worldwide — chat, share and watch together.</span>
                </span>
                <span className="hidden text-sm font-semibold text-brand-pink sm:block">Open →</span>
              </Link>
              <Link
                href={`/dashboard/ai-mode/roadmap?mode=${mode}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-magenta/40 px-5 py-2.5 text-sm text-white/85 transition-colors hover:bg-brand-magenta/15 sm:w-auto sm:self-start"
              >
                <MapIcon className="size-4 text-brand-pink" aria-hidden /> My {mode === "watch" ? "watch" : "listening"} roadmap
              </Link>
              {hasSaved ? (
                <button
                  type="button"
                  onClick={() => void finish(null)}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10 sm:w-auto sm:self-start"
                >
                  <Sparkles className="size-4 text-brand-pink" aria-hidden /> Use my saved answers
                </button>
              ) : null}
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          ) : null}

          {phase === "quiz" ? (
            <TasteQuiz key={mode} mode={mode} initial={prefs} catalog={quizCatalog} onDone={(next) => void finish(next)} onCancel={() => setPhase("start")} />
          ) : null}

          {phase === "chat" ? (
            <TasteChat key={mode} mode={mode} initial={prefs} onDone={(next) => void finish(next)} onCancel={() => setPhase("start")} />
          ) : null}

          {phase === "loading" ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-surface/60 px-4 py-16 text-center" role="status">
              <LoaderCircle className="size-8 animate-spin text-brand-pink" aria-hidden />
              <p className="text-sm text-white/70">Matching your answers against the whole catalog…</p>
            </div>
          ) : null}

          {phase === "results" && picks ? (
            <div className="flex flex-col gap-5 sm:gap-6">
              <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    {archetype ? (
                      <p className="text-sm text-white/60">
                        You&apos;re <span className="font-bold text-white">{archetype.emoji} {archetype.label}</span> — {archetype.phrase}.
                      </p>
                    ) : (
                      <p className="text-sm text-white/60">Here&apos;s what fits right now.</p>
                    )}
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {summarizePrefs(mode, prefs).map((chip) => (
                        <li key={chip} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/85">
                          {chip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                    <Link
                      href={`/dashboard/ai-mode/roadmap?mode=${mode}&build=1`}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
                    >
                      <MapIcon className="size-4" aria-hidden /> Build my roadmap
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPhase("quiz")}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/85 transition-colors hover:bg-white/10 sm:w-auto"
                    >
                      <PencilLine className="size-4" aria-hidden /> Change answers
                    </button>
                    {chatEnabled ? (
                      <button
                        type="button"
                        onClick={() => setPhase("chat")}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/85 transition-colors hover:bg-white/10 sm:w-auto"
                      >
                        <RefreshCw className="size-4" aria-hidden /> Refine by chat
                      </button>
                    ) : null}
                    <Link
                      href="/dashboard/settings/ai"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm text-white/60 transition-colors hover:text-white sm:w-auto"
                    >
                      <Settings2 className="size-4" aria-hidden /> What the AI knows
                    </Link>
                  </div>
                </div>
              </section>

              {mode === "watch" ? (
                <ContentCarouselSection
                  title="✨ Picked for you by AI mode"
                  subtitle="Hover a card to see why it was picked"
                  searchPlaceholder="Search your picks……. "
                  items={picks.content}
                  emptyMessage="Nothing matches yet — try loosening your answers."
                />
              ) : (
                <>
                  <MusicCarouselSection
                    title="✨ Songs picked for you"
                    subtitle="Hover a card to see why it was picked"
                    searchPlaceholder="Search your picks……. "
                    tracks={picks.tracks}
                  />
                  {picks.artists.length ? (
                    <ContentCarouselSection
                      title="🎤 Artists to discover"
                      subtitle="New to you, close to your taste"
                      searchPlaceholder="Search artists……. "
                      items={picks.artists}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
