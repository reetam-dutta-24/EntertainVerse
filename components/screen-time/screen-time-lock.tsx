"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, MoonStar } from "lucide-react";
import { formatLimit } from "@/lib/screen-time/types";

function untilText(target: number, now: number) {
  const seconds = Math.max(0, Math.round((target - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/**
 * Full-screen "done for today" screen. Rendered by the server layouts when the
 * day's limit is used up (so reloads and new tabs can't skip it), and as an
 * overlay the moment the limit is reached mid-session.
 */
export function ScreenTimeLock({ limitMinutes, unlocksAt }: { limitMinutes: number; unlocksAt: string }) {
  const target = new Date(unlocksAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      // Midnight passed: reload so the server lets them back in.
      if (Date.now() >= target) window.location.reload();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [target]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="screen-time-lock-title"
      className="fixed inset-0 z-[500] flex items-center justify-center bg-background/95 px-4 backdrop-blur-xl"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-brand-magenta/30 bg-gradient-to-br from-brand-purple/30 via-surface to-surface p-6 text-center shadow-card-inner sm:p-8">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-pink">
          <MoonStar className="size-8 text-white" aria-hidden />
        </span>
        <div>
          <h1 id="screen-time-lock-title" className="text-xl font-bold text-white sm:text-2xl">
            That&apos;s today&apos;s {formatLimit(limitMinutes)}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            You asked AniVerse to stop you here — and it&apos;s holding you to it. Go do something offline;
            your watchlist, roadmap and playlists will be waiting.
          </p>
        </div>
        <div className="rounded-2xl bg-black/30 px-5 py-3">
          <p className="text-caption uppercase tracking-wide text-white/50">Unlocks in</p>
          <p className="text-2xl font-bold text-white tabular-nums">{untilText(target, now)}</p>
          <p className="text-caption text-white/45">at midnight, your time</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10 sm:w-auto"
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
        <p className="text-caption text-white/40">Changing the limit takes effect tomorrow — that&apos;s the point.</p>
      </div>
    </div>
  );
}
