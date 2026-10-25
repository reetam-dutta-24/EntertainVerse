"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlert, ArrowLeft, House, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  error: Error & { digest?: string };
  /** Next.js `unstable_retry` — re-fetches and re-renders the failed segment. */
  retry: () => void;
  title?: string;
  description?: string;
  /** Where the secondary button goes (e.g. "/dashboard"). */
  homeHref?: string;
  homeLabel?: string;
  /** "page" fills the viewport (no shell); "panel" sits inside an app shell. */
  variant?: "page" | "panel";
  /** Tag used in the console log, e.g. "dashboard". */
  scope?: string;
}

/** Friendly error fallback for `error.tsx` boundaries. */
export function ErrorState({
  error,
  retry,
  title = "Something went wrong",
  description = "We hit a snag loading this part of EntertainVerse. It's usually temporary — try again in a moment.",
  homeHref = "/dashboard",
  homeLabel = "Go to dashboard",
  variant = "panel",
  scope = "app",
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error(`[${scope} error boundary]`, error);
  }, [error, scope]);

  function handleRetry() {
    setRetrying(true);
    retry();
    // If the retry fails again the boundary re-renders with a fresh error;
    // re-enable the button shortly either way.
    window.setTimeout(() => setRetrying(false), 1200);
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex w-full flex-col items-center justify-center px-4 text-center",
        variant === "page" ? "min-h-dvh bg-background py-16" : "min-h-[60dvh] py-12",
      )}
    >
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[rgba(216,2,220,0.14)] via-[rgba(128,0,255,0.08)] to-[rgba(216,2,220,0.16)] px-6 py-9 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-brand-magenta/40 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full border border-brand-magenta/50 bg-glass-magenta">
            <TriangleAlert className="size-7 text-brand-pink" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
          <p className="text-sm text-white/75">{description}</p>

          {error.digest ? (
            <p className="rounded-full bg-white/5 px-3 py-1 font-mono text-micro text-white/45">
              Error ID: {error.digest}
            </p>
          ) : null}

          <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-pink-soft transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              <RotateCw className={cn("size-4", retrying && "animate-spin")} aria-hidden />
              {retrying ? "Retrying…" : "Try again"}
            </button>
            <Link
              href={homeHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              {homeHref === "/" ? <House className="size-4" aria-hidden /> : <ArrowLeft className="size-4" aria-hidden />}
              {homeLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
