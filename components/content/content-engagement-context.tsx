"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { formatEngagementCount } from "@/lib/services/content.service";
import type { ContentEngagementStat } from "@/types";
import { useToast } from "@/components/feedback/feedback-provider";

interface ContentEngagementContextValue {
  contentSlug: string;
  favoriteApiPath: string;
  stats: ContentEngagementStat[];
  favorited: boolean;
  onWatchlist: boolean;
  setToast: (message: string | null) => void;
  applyFavorite: (favoriteCount: number, favorited: boolean) => void;
  applyWatchlist: (watchingCount: number, onWatchlist: boolean) => void;
  applyViews: (views: number) => void;
  applyCollections: (collections: number) => void;
  applyWatching: (watching: number, onWatchlist?: boolean) => void;
}

const ContentEngagementContext =
  createContext<ContentEngagementContextValue | null>(null);

export function parseEngagementStatValue(
  stats: ContentEngagementStat[],
  id: string,
): number {
  const raw = stats.find((stat) => stat.id === id)?.value ?? "0";
  const normalized = raw.toLowerCase().replace(/,/g, "");
  if (normalized.endsWith("m")) {
    return Math.round(Number.parseFloat(normalized) * 1_000_000);
  }
  if (normalized.endsWith("k")) {
    return Math.round(Number.parseFloat(normalized) * 1_000);
  }
  return Number.parseInt(normalized, 10) || 0;
}

function updateStatValue(
  stats: ContentEngagementStat[],
  id: string,
  value: number,
): ContentEngagementStat[] {
  return stats.map((stat) =>
    stat.id === id
      ? { ...stat, value: formatEngagementCount(value) }
      : stat,
  );
}

export interface ContentEngagementProviderProps {
  contentSlug: string;
  initialStats: ContentEngagementStat[];
  initialFavorited?: boolean;
  initialOnWatchlist?: boolean;
  favoriteApiPath?: string;
  children: React.ReactNode;
}

export function ContentEngagementProvider({
  contentSlug,
  initialStats,
  initialFavorited = false,
  initialOnWatchlist = false,
  favoriteApiPath,
  children,
}: ContentEngagementProviderProps) {
  const [stats, setStats] = useState(initialStats);
  useOnValueChange(initialStats, (next) => setStats(next));
  const [favorited, setFavorited] = useState(initialFavorited);
  const [onWatchlist, setOnWatchlist] = useState(initialOnWatchlist);
  const showToast = useToast();
  // Kept as an API for children (e.g. hero collection button); renders via the shared toast.
  const setToast = useCallback(
    (message: string | null) => {
      if (message) showToast(message);
    },
    [showToast],
  );

  const resolvedFavoriteApiPath =
    favoriteApiPath ?? `/api/content/${encodeURIComponent(contentSlug)}/favorite`;

  const applyFavorite = useCallback((favoriteCount: number, nextFavorited: boolean) => {
    setStats((current) => updateStatValue(current, "likes", favoriteCount));
    setFavorited(nextFavorited);
    setToast(nextFavorited ? "Added to favourites" : "Removed from favourites");
  }, [setToast]);

  const applyWatchlist = useCallback(
    (watchingCount: number, nextOnWatchlist: boolean) => {
      setStats((current) => {
        const watchingId = current.some((stat) => stat.id === "watching")
          ? "watching"
          : "listening";
        return updateStatValue(current, watchingId, watchingCount);
      });
      setOnWatchlist(nextOnWatchlist);
      setToast(nextOnWatchlist ? "Added to watchlist" : "Removed from watchlist");
    },
    [setToast],
  );

  const applyViews = useCallback((views: number) => {
    setStats((current) => updateStatValue(current, "views", views));
  }, []);

  const applyCollections = useCallback((collections: number) => {
    setStats((current) => updateStatValue(current, "collections", collections));
  }, []);

  const applyWatching = useCallback((watching: number, nextOnWatchlist?: boolean) => {
    setStats((current) => {
      const watchingId = current.some((stat) => stat.id === "watching")
        ? "watching"
        : "listening";
      return updateStatValue(current, watchingId, watching);
    });
    if (nextOnWatchlist != null) {
      setOnWatchlist(nextOnWatchlist);
    }
  }, []);

  const value = useMemo(
    () => ({
      contentSlug,
      favoriteApiPath: resolvedFavoriteApiPath,
      stats,
      favorited,
      onWatchlist,
      setToast,
      applyFavorite,
      applyWatchlist,
      applyViews,
      applyCollections,
      applyWatching,
    }),
    [
      applyCollections,
      applyFavorite,
      applyViews,
      applyWatchlist,
      applyWatching,
      contentSlug,
      favorited,
      onWatchlist,
      resolvedFavoriteApiPath,
      setToast,
      stats,
    ],
  );

  return (
    <ContentEngagementContext.Provider value={value}>
      {children}
    </ContentEngagementContext.Provider>
  );
}

export function useContentEngagement() {
  const context = useContext(ContentEngagementContext);
  if (!context) {
    throw new Error("useContentEngagement must be used within ContentEngagementProvider.");
  }
  return context;
}

export function useOptionalContentEngagement() {
  return useContext(ContentEngagementContext);
}
