"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ExternalLink, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { AiProgress } from "@/components/admin/ai/ai-progress";
import { useAiTask } from "@/hooks/use-ai-task";
import { MEMORY_OPTIONS, type RecapDepth, type RecapOptions, type RecapResult } from "@/lib/recap/types";
import { cn } from "@/lib/utils";

const GROUNDING_LABEL: Record<RecapResult["grounding"], string> = {
  episodes: "Grounded in EntertainVerse episode guides",
  web: "Grounded in web sources up to your stopping point",
  synopsis: "Grounded in the synopsis only — a fuller recap appears once web lookup is available",
};

const SELECT =
  "h-10 w-full cursor-pointer rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white outline-none focus:border-brand-magenta/60";

/** "Catch me up": asks where you stopped and how much you remember, then writes a spoiler-safe recap. */
export function RecapDialog({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) {
  const [options, setOptions] = useState<RecapOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [percent, setPercent] = useState(50);
  const [depth, setDepth] = useState<RecapDepth>("standard");
  const [recap, setRecap] = useState<RecapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, progress, running } = useAiTask<RecapResult>();

  useEffect(() => {
    if (!open || options) return;
    let cancelled = false;
    void fetch(`/api/content/${encodeURIComponent(slug)}/recap`)
      .then(async (response) => {
        const body = (await response.json()) as { options?: RecapOptions; error?: string };
        if (!response.ok || !body.options) throw new Error(body.error ?? "Couldn't load this title.");
        if (cancelled) return;
        const guess = body.options.guess;
        if (guess && "season" in guess) {
          setSeason(guess.season);
          setEpisode(guess.episode);
        } else if (guess) setPercent(guess.percent);
        setOptions(body.options);
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) setLoadError(fetchError instanceof Error ? fetchError.message : "Couldn't load this title.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, options, slug]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !running) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, running, onClose]);

  async function catchMeUp() {
    if (!options) return;
    setError(null);
    try {
      const body = options.kind === "film" ? { percent, depth } : { season, episode, depth };
      setRecap(await run(`/api/content/${encodeURIComponent(slug)}/recap`, body));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Couldn't write the recap.");
    }
  }

  const seasonInfo = options?.seasons.find((entry) => entry.number === season);
  const guessed = Boolean(options?.guess);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recap-title"
          className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => {
            if (event.target === event.currentTarget && !running) onClose();
          }}
        >
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-3xl border border-brand-magenta/30 bg-gradient-to-br from-brand-purple/30 via-surface to-surface p-4 shadow-glow-pink sm:rounded-3xl sm:p-6"
          >
            <button type="button" onClick={onClose} disabled={running} aria-label="Close recap" className="absolute right-3 top-3 cursor-pointer rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>

            <div className="pr-8">
              <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-brand-pink">
                <Sparkles className="size-3.5" aria-hidden /> AI mode · Catch me up
              </p>
              <h2 id="recap-title" className="mt-1 text-lg font-bold text-white sm:text-xl">
                {recap ? recap.headline : `Back to ${options?.title ?? "it"}?`}
              </h2>
              {recap ? <p className="mt-0.5 text-caption text-white/55">Everything up to {recap.upToLabel} — nothing after.</p> : null}
            </div>

            {!options && !loadError ? (
              <p className="flex items-center gap-2 text-sm text-white/60">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading…
              </p>
            ) : null}
            {loadError ? <p className="text-sm text-amber-100">{loadError}</p> : null}

            {options && !recap ? (
              <>
                <section className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-white">
                    {options.kind === "film" ? "How far into the film did you get?" : "Where did you stop?"}
                  </p>
                  {guessed ? <p className="text-caption text-white/50">We guessed from your {options.watchedMinutes} watched minutes — change it if it&apos;s off.</p> : null}
                  {options.kind === "film" ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={10}
                        value={percent}
                        onChange={(event) => setPercent(Number(event.target.value))}
                        aria-label="How far into the film"
                        className="w-full accent-fuchsia-500"
                      />
                      <p className="text-caption text-white/70">{percent >= 100 ? "I finished it" : `About ${percent}% in`}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-caption text-white/55">
                        Season
                        <select
                          className={SELECT}
                          value={season}
                          onChange={(event) => {
                            setSeason(Number(event.target.value));
                            setEpisode(1);
                          }}
                        >
                          {options.seasons.map((entry) => (
                            <option key={entry.number} value={entry.number}>
                              {entry.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-caption text-white/55">
                        Last episode I saw
                        <select className={SELECT} value={episode} onChange={(event) => setEpisode(Number(event.target.value))}>
                          {Array.from({ length: seasonInfo?.episodes ?? 1 }, (_, index) => (
                            <option key={index + 1} value={index + 1}>
                              Episode {index + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </section>

                <section className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-white">How much do you remember?</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MEMORY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDepth(option.id)}
                        aria-pressed={depth === option.id}
                        className={cn(
                          "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors",
                          depth === option.id ? "border-brand-magenta/60 bg-brand-magenta/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                        )}
                      >
                        <span className="text-sm font-semibold text-white">
                          {option.emoji} {option.label}
                        </span>
                        <span className="text-caption text-white/55">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {progress ? <AiProgress progress={progress} hint="Only what happens up to your stopping point is used — no spoilers." /> : null}
                {error ? <p className="text-sm text-amber-100">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => void catchMeUp()}
                  disabled={running}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {running ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <BookOpen className="size-4" aria-hidden />}
                  Catch me up
                </button>
              </>
            ) : null}

            {recap ? (
              <div className="flex flex-col gap-4">
                <ol className="flex flex-col gap-2">
                  {recap.beats.map((beat, index) => (
                    <li key={index} className="flex gap-2.5 text-sm text-white/85">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-magenta/20 text-[10px] font-bold text-brand-pink">{index + 1}</span>
                      <span>{beat}</span>
                    </li>
                  ))}
                </ol>

                {recap.characters.length ? (
                  <section className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Who&apos;s who so far</p>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {recap.characters.map((character) => (
                        <li key={character.name} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-caption">
                          <span className="font-semibold text-white">{character.name}</span>
                          <span className="text-white/60"> — {character.note}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-brand-magenta/30 bg-brand-magenta/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-pink">Where you left off</p>
                  <p className="mt-1 text-sm text-white/90">{recap.leftOff}</p>
                  {recap.watchFor ? (
                    <>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-pink">Going in, keep in mind</p>
                      <p className="mt-1 text-sm text-white/80">{recap.watchFor}</p>
                    </>
                  ) : null}
                </section>

                <div className="flex flex-col gap-1 text-micro text-white/40">
                  <p>
                    {GROUNDING_LABEL[recap.grounding]}
                    {recap.cached ? " · saved recap" : ""}
                  </p>
                  {recap.sources.length ? (
                    <p className="flex flex-wrap gap-x-3 gap-y-1">
                      {recap.sources.map((source) => (
                        <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white/70">
                          <ExternalLink className="size-3" aria-hidden /> {source.title || new URL(source.url).hostname}
                        </a>
                      ))}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={onClose} className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                    Got it — let&apos;s watch
                  </button>
                  <button type="button" onClick={() => setRecap(null)} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 hover:bg-white/10">
                    <RotateCcw className="size-3.5" aria-hidden /> Different stopping point
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
