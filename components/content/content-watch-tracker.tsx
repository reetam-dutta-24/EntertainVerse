"use client";

import { usePlaybackMinutes } from "@/hooks/use-playback-minutes";

/** Logs real viewing time while the watch page is open and visible (one session per visit). */
export function ContentWatchTracker({ contentSlug }: { contentSlug: string }) {
  usePlaybackMinutes(`/api/content/${encodeURIComponent(contentSlug)}/watch-event`, true, { requireVisible: true });
  return null;
}
