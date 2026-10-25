"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import { ScreenTimeLock } from "@/components/screen-time/screen-time-lock";
import { useClientValue, useOnValueChange } from "@/hooks/use-prop-sync";
import { formatLimit, type ScreenTimeStatus } from "@/lib/screen-time/types";

const BEAT_MS = 60_000;
const warnedKey = (day: string) => `aniverse:screen-time:warned:${day}`;

/**
 * Runs on every signed-in page while a daily limit is on: sends a heartbeat each
 * minute the tab is visible, pops a 5-minute warning once a day, and locks the
 * screen the moment the limit is reached.
 */
export function ScreenTimeGuard({ initialStatus }: { initialStatus: ScreenTimeStatus }) {
  const [status, setStatus] = useState(initialStatus);
  /** Day the warning was dismissed in this tab. */
  const [dismissedDay, setDismissedDay] = useState<string | null>(null);
  // Shown once per day across tabs; the server render treats it as already shown.
  const warnedBefore = useClientValue(() => {
    try {
      return window.localStorage.getItem(warnedKey(status.day)) === "1";
    } catch {
      return false;
    }
  }, true);
  const warningOpen = status.warn && !warnedBefore && dismissedDay !== status.day;

  function dismissWarning() {
    try {
      window.localStorage.setItem(warnedKey(status.day), "1");
    } catch {
      // Storage blocked — dismissing for this tab is enough.
    }
    setDismissedDay(status.day);
  }

  useOnValueChange(initialStatus, (next) => setStatus(next));

  useEffect(() => {
    if (!status.enabled || status.locked) return;
    let cancelled = false;
    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/screen-time/heartbeat", { method: "POST" });
        const data = (await response.json()) as { status?: ScreenTimeStatus };
        if (!cancelled && data.status) setStatus(data.status);
      } catch {
        // Offline for a moment — the next beat catches up.
      }
    };
    const timer = window.setInterval(() => void beat(), BEAT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status.enabled, status.locked]);

  if (!status.enabled || !status.limitMinutes) return null;
  if (status.locked) return <ScreenTimeLock limitMinutes={status.limitMinutes} unlocksAt={status.unlocksAt} />;

  const remaining = status.remainingMinutes ?? 0;
  return (
    <>
      {remaining <= 15 ? (
        <Link
          href="/dashboard/settings#daily-limit"
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-surface/95 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-card-inner backdrop-blur lg:bottom-4"
          aria-live="polite"
        >
          <Hourglass className="size-3.5" aria-hidden /> {remaining} min left today
        </Link>
      ) : null}

      {warningOpen ? (
        <div role="alertdialog" aria-modal="true" aria-labelledby="screen-time-warning-title" className="fixed inset-0 z-[450] flex items-center justify-center bg-black/70 px-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-amber-300/30 bg-surface p-6 text-center shadow-card-inner">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-400/15">
              <Hourglass className="size-6 text-amber-200" aria-hidden />
            </span>
            <div>
              <h2 id="screen-time-warning-title" className="text-lg font-bold text-white">
                {remaining} minute{remaining === 1 ? "" : "s"} left today
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Your daily limit of {formatLimit(status.limitMinutes)} is almost up. Finish the episode or song —
                when time runs out, AniVerse locks until midnight.
              </p>
            </div>
            <button
              type="button"
              autoFocus
              onClick={dismissWarning}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Got it — wrapping up
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
