"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Download, LoaderCircle, Pause, Play, RotateCcw, Share2 } from "lucide-react";
import { useToast } from "@/components/feedback/feedback-provider";
import { renderWrappedCard } from "@/components/wrapped/share-card";
import type { WrappedData, WrappedItem } from "@/lib/wrapped/types";
import { cn } from "@/lib/utils";

const SLIDE_MS = 7_000;

const hours = (minutes: number) => Math.round(minutes / 60);

interface Slide {
  id: string;
  /** Tailwind gradient for the slide background. */
  tone: string;
  render: () => React.ReactNode;
}

function Pop({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 220, damping: 22 }} className={className}>
      {children}
    </motion.div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-micro font-bold uppercase tracking-[0.2em] text-white/70">{children}</p>;
}

function Poster({ item, className }: { item: WrappedItem; className?: string }) {
  return (
    <span className={cn("block overflow-hidden rounded-2xl bg-white/10 shadow-card-inner", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : null}
    </span>
  );
}

function RankList({ items, start = 1 }: { items: WrappedItem[]; start?: number }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <Pop key={item.slug || item.title} delay={0.35 + index * 0.12}>
          <li className="flex items-center gap-3">
            <span className="w-5 text-right text-sm font-bold text-white/60">{start + index}</span>
            <Poster item={item} className="size-11 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
              <span className="block truncate text-caption text-white/60">{[item.subtitle, `${hours(item.minutes) || "<1"}h`].filter(Boolean).join(" · ")}</span>
            </span>
          </li>
        </Pop>
      ))}
    </ol>
  );
}

function buildSlides(data: WrappedData): Slide[] {
  const firstName = data.userName.split(" ")[0] ?? data.userName;
  const slides: Slide[] = [
    {
      id: "intro",
      tone: "from-fuchsia-600/70 via-purple-900/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-4">
          <Pop><Kicker>EntertainVerse Wrapped {data.year}</Kicker></Pop>
          <Pop delay={0.15}><h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">{firstName}, this was your year.</h2></Pop>
          <Pop delay={0.35}><p className="text-base text-white/75">Every title, song and late night — read by your AI taste engine.</p></Pop>
        </div>
      ),
    },
    {
      id: "time",
      tone: "from-pink-600/70 via-rose-900/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-5">
          <Pop><Kicker>Time well spent</Kicker></Pop>
          <Pop delay={0.15}>
            <p className="text-7xl font-black tabular-nums text-white">{hours(data.totals.watchMinutes)}<span className="text-3xl">h</span></p>
            <p className="text-base text-white/75">watching {data.totals.titles} title{data.totals.titles === 1 ? "" : "s"}</p>
          </Pop>
          {data.totals.listenMinutes ? (
            <Pop delay={0.4}>
              <p className="text-5xl font-black tabular-nums text-white">{hours(data.totals.listenMinutes)}<span className="text-2xl">h</span></p>
              <p className="text-base text-white/75">listening to {data.totals.tracks} song{data.totals.tracks === 1 ? "" : "s"}</p>
            </Pop>
          ) : null}
          <Pop delay={0.6}><p className="text-sm text-white/60">You showed up on {data.totals.activeDays} different days.</p></Pop>
        </div>
      ),
    },
  ];

  if (data.topTitles.length) {
    slides.push({
      id: "titles",
      tone: "from-violet-600/70 via-indigo-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-4">
          <Pop><Kicker>Your #1 this year</Kicker></Pop>
          <Pop delay={0.1} className="flex items-end gap-4">
            <Poster item={data.topTitles[0]!} className="aspect-[2/3] w-28 shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-black leading-tight text-white">{data.topTitles[0]!.title}</p>
              <p className="text-sm text-white/70">{hours(data.topTitles[0]!.minutes)} hours together</p>
            </div>
          </Pop>
          {data.topTitles.length > 1 ? <RankList items={data.topTitles.slice(1)} start={2} /> : null}
        </div>
      ),
    });
  }

  if (data.topFormat || data.topGenres.length) {
    slides.push({
      id: "genres",
      tone: "from-amber-500/60 via-orange-900/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-5">
          <Pop><Kicker>What you reached for</Kicker></Pop>
          {data.topFormat ? (
            <Pop delay={0.15}>
              <p className="text-6xl font-black text-white">{data.topFormat.share}%</p>
              <p className="text-lg text-white/80">of your watch time was {data.topFormat.label.toLowerCase()}</p>
            </Pop>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {data.topGenres.map((genre, index) => (
              <Pop key={genre.label} delay={0.4 + index * 0.12}>
                <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold capitalize text-white">
                  {genre.label} · {genre.share}%
                </span>
              </Pop>
            ))}
          </div>
        </div>
      ),
    });
  }

  if (data.vibes.length) {
    slides.push({
      id: "dna",
      tone: "from-cyan-500/60 via-teal-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-5">
          <Pop><Kicker>Your Taste DNA</Kicker></Pop>
          <Pop delay={0.1}><p className="text-lg text-white/80">Read from the stories you chose, your year was</p></Pop>
          <ul className="flex flex-col gap-3">
            {data.vibes.map((vibe, index) => (
              <Pop key={vibe.id} delay={0.3 + index * 0.18}>
                <li className="flex items-center gap-3 text-3xl font-black text-white">
                  <span className="text-4xl">{vibe.emoji}</span> {vibe.label}
                </li>
              </Pop>
            ))}
          </ul>
        </div>
      ),
    });
  }

  if (data.eras.length > 1) {
    slides.push({
      id: "eras",
      tone: "from-emerald-500/50 via-emerald-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-4">
          <Pop><Kicker>Your taste had eras</Kicker></Pop>
          <ol className="relative flex flex-col gap-2.5 border-l border-white/25 pl-4">
            {data.eras.slice(-6).map((era, index) => (
              <Pop key={`${era.label}-${index}`} delay={0.15 + index * 0.14}>
                <li>
                  <span className="text-micro font-bold uppercase tracking-wide text-white/55">{era.label}</span>
                  <p className="text-lg font-bold text-white">{era.trait.emoji} The {era.trait.label} era</p>
                </li>
              </Pop>
            ))}
          </ol>
        </div>
      ),
    });
  }

  if (data.topArtists.length || data.topTracks.length) {
    const artist = data.topArtists[0];
    slides.push({
      id: "music",
      tone: "from-blue-600/60 via-blue-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-4">
          <Pop><Kicker>On repeat</Kicker></Pop>
          {artist ? (
            <Pop delay={0.1} className="flex items-center gap-4">
              <Poster item={artist} className="size-20 shrink-0 rounded-full" />
              <div className="min-w-0">
                <p className="text-micro uppercase tracking-wide text-white/60">Top artist</p>
                <p className="truncate text-2xl font-black text-white">{artist.title}</p>
                <p className="text-sm text-white/70">{hours(artist.minutes) || "<1"} hours</p>
              </div>
            </Pop>
          ) : null}
          <RankList items={data.topTracks.slice(0, 4)} />
          {data.moods.length ? (
            <Pop delay={0.9}><p className="text-sm text-white/70">Mood: {data.moods.map((mood) => `${mood.emoji} ${mood.label}`).join(" · ")}</p></Pop>
          ) : null}
        </div>
      ),
    });
  }

  if (data.timeOfDay || data.biggestDay) {
    slides.push({
      id: "rhythm",
      tone: "from-indigo-600/60 via-slate-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-5">
          <Pop><Kicker>Your rhythm</Kicker></Pop>
          {data.timeOfDay ? (
            <Pop delay={0.15}>
              <p className="text-5xl">{data.timeOfDay.emoji}</p>
              <p className="text-3xl font-black text-white">{data.timeOfDay.label}</p>
              <p className="text-sm text-white/70">{data.timeOfDay.share}% of your time</p>
            </Pop>
          ) : null}
          {data.biggestDay ? (
            <Pop delay={0.4}><p className="text-base text-white/85">Biggest day: <strong className="text-white">{data.biggestDay.label}</strong> — {hours(data.biggestDay.minutes) || "<1"} hours</p></Pop>
          ) : null}
          {data.longestStreak > 1 ? (
            <Pop delay={0.6}><p className="text-base text-white/85">Longest streak: <strong className="text-white">{data.longestStreak} days</strong> in a row 🔥</p></Pop>
          ) : null}
        </div>
      ),
    });
  }

  if (data.topPercent) {
    slides.push({
      id: "rank",
      tone: "from-yellow-400/50 via-amber-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col items-start justify-center gap-4">
          <Pop><Kicker>Among everyone on EntertainVerse</Kicker></Pop>
          <Pop delay={0.2}><p className="text-6xl font-black text-white">Top {data.topPercent}%</p></Pop>
          <Pop delay={0.4}><p className="text-base text-white/75">of the most dedicated fans this year, by time spent watching and listening.</p></Pop>
        </div>
      ),
    });
  }

  const social = data.totals.reviews + data.totals.posts + data.totals.messages;
  if (social || data.totals.favoritesAdded) {
    slides.push({
      id: "social",
      tone: "from-rose-500/60 via-fuchsia-950/80 to-black",
      render: () => (
        <div className="flex h-full flex-col justify-center gap-4">
          <Pop><Kicker>You made it yours</Kicker></Pop>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: data.totals.favoritesAdded, label: "favorites saved" },
              { value: data.totals.reviews, label: "reviews written" },
              { value: data.totals.posts, label: "community posts" },
              { value: data.totals.messages, label: "chat messages" },
            ].map((stat, index) => (
              <Pop key={stat.label} delay={0.15 + index * 0.12}>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-3xl font-black tabular-nums text-white">{stat.value}</p>
                  <p className="text-caption text-white/65">{stat.label}</p>
                </div>
              </Pop>
            ))}
          </div>
        </div>
      ),
    });
  }

  slides.push({
    id: "persona",
    tone: "from-fuchsia-600/80 via-purple-950/90 to-black",
    render: () => (
      <div className="flex h-full flex-col justify-center gap-4">
        <Pop><Kicker>{firstName}, you are</Kicker></Pop>
        <Pop delay={0.2}><h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">{data.persona.name}</h2></Pop>
        <Pop delay={0.45}><p className="text-base font-semibold text-brand-pink">{data.persona.tagline}</p></Pop>
        <Pop delay={0.65}><p className="text-base text-white/80">{data.persona.intro}</p></Pop>
      </div>
    ),
  });
  return slides;
}

/** Spotify-Wrapped-style story: tap / arrow keys to move, hold to pause, share card at the end. */
export function WrappedStory({ data }: { data: WrappedData }) {
  const slides = useMemo(() => buildSlides(data), [data]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sharing, setSharing] = useState(false);
  const holding = useRef(false);
  const toast = useToast();
  const last = index === slides.length - 1;

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(slides.length - 1, next)));
      setElapsed(0);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused || last) return;
    const started = Date.now() - elapsed;
    const timer = window.setInterval(() => {
      if (holding.current) return;
      const value = Date.now() - started;
      if (value >= SLIDE_MS) go(index + 1);
      else setElapsed(value);
    }, 100);
    return () => window.clearInterval(timer);
    // `elapsed` is read once to resume where we paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, last, go]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  async function shareCard(mode: "download" | "share") {
    setSharing(true);
    try {
      const blob = await renderWrappedCard(data);
      const file = new File([blob], `entertainverse-wrapped-${data.year}.png`, { type: "image/png" });
      if (mode === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My EntertainVerse Wrapped ${data.year}`, text: `I'm ${data.persona.name} on EntertainVerse ✨` });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
        if (mode === "share") toast("Your device can't share images directly — the card was downloaded instead.", "info");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast(error instanceof Error ? error.message : "Couldn't create the card — try again.", "error");
      }
    } finally {
      setSharing(false);
    }
  }

  if (data.empty) {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-700/40 via-purple-950/60 to-black p-8 text-center">
        <p className="text-4xl">🎁</p>
        <h2 className="text-2xl font-black text-white">Your {data.year} Wrapped is still wrapping</h2>
        <p className="text-sm text-white/70">Watch, listen and favorite a few things — your Wrapped fills itself in from real activity.</p>
        <Link href="/dashboard/ai-mode" className="inline-flex w-full items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white sm:w-auto">
          Find something with AI mode
        </Link>
      </div>
    );
  }

  const slide = slides[index]!;
  const progressFor = (position: number) => (position < index ? 100 : position > index ? 0 : last ? 100 : (elapsed / SLIDE_MS) * 100);

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3">
      <div
        className={cn("relative h-[min(720px,calc(100dvh-220px))] min-h-[520px] w-full select-none overflow-hidden rounded-3xl bg-gradient-to-br shadow-glow-pink transition-colors duration-700", slide.tone)}
        onPointerDown={() => (holding.current = true)}
        onPointerUp={() => (holding.current = false)}
        onPointerLeave={() => (holding.current = false)}
      >
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1" aria-hidden>
          {slides.map((entry, position) => (
            <span key={entry.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full rounded-full bg-white transition-[width] duration-100 ease-linear" style={{ width: `${progressFor(position)}%` }} />
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Resume" : "Pause"}
          className="absolute right-3 top-6 z-30 cursor-pointer rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>

        {/* Tap zones: left third goes back, the rest goes forward. */}
        <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-pointer" />
        <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-pointer" />

        <AnimatePresence mode="wait">
          <motion.section
            key={slide.id}
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none relative z-0 h-full px-6 pb-8 pt-14 sm:px-8"
          >
            {slide.render()}
          </motion.section>
        </AnimatePresence>
      </div>

      {last ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void shareCard("share")}
            disabled={sharing}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {sharing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Share2 className="size-4" aria-hidden />} Share my Wrapped
          </button>
          <button type="button" onClick={() => void shareCard("download")} disabled={sharing} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10">
            <Download className="size-4" aria-hidden /> Save card
          </button>
          <button type="button" onClick={() => go(0)} className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10">
            <RotateCcw className="size-3.5" aria-hidden /> Replay
          </button>
        </div>
      ) : (
        <p className="text-center text-caption text-white/45">Tap to continue · hold to pause · ← → on a keyboard</p>
      )}
    </div>
  );
}
