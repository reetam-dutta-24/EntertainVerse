import type { WatchlistItem } from "@prisma/client";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import type { ContentItem } from "@/types";

type WatchlistWithContent = WatchlistItem & {
  content: Parameters<typeof mapContentToItem>[0];
};

export function mapWatchlistItemToContent(
  row: WatchlistWithContent,
  /** From the recommender; left unset when it isn't available. */
  matchScore?: number,
): ContentItem {
  const item = mapContentToItem(row.content);
  return {
    ...item,
    matchScore: matchScore ?? item.matchScore,
    description:
      item.description ??
      `${item.title} — saved to your EntertainVerse watchlist.`,
    watchlistItemId: row.id,
    watchlistStatus: row.status,
    watchlistPriority: row.priority,
  };
}

export function isHighPriority(priority: WatchlistItem["priority"]) {
  return priority === "HIGH";
}
