"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";

const REFRESH_MS = 60_000;

/** Keeps analytics live: re-renders the server data every minute while the tab is visible. */
export function AnalyticsLiveRefresh({ generatedAt }: { generatedAt: string }) {
  const router = useAppRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  const time = new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <p className="-mt-2 flex items-center gap-2 text-xs text-white/55" aria-live="polite">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
      </span>
      Live from your activity · updated {time}
      <button
        type="button"
        onClick={() => router.refresh()}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-white/60 hover:bg-white/10 hover:text-white"
      >
        <RefreshCw className="size-3" aria-hidden /> Refresh
      </button>
    </p>
  );
}
