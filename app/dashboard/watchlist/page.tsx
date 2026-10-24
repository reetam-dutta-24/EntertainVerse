import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { WelcomeBanner } from "@/components/dashboard";
import { WatchlistGridSection } from "@/components/dashboard/watchlist-grid-section";
import { AddWatchlistButton } from "@/components/forms/add-watchlist-button";
import { getCurrentUser } from "@/lib/data/user";
import {
  getAllWatchlistItems,
  getHighPriorityWatchlist,
  getWatchlistGenres,
  getWatchlistStats,
  type WatchlistStats,
} from "@/lib/data/watchlist";

export const metadata: Metadata = {
  title: "Watchlist — AniVerse",
  description:
    "Save and organize anime, movies, shows, and music you plan to watch.",
};

const statTiles = (stats: WatchlistStats) => [
  { emoji: "📋", label: "Saved Items", value: String(stats.savedItems) },
  { emoji: "⏳", label: "Pending", value: String(stats.pending) },
  { emoji: "🔥", label: "High Priority", value: String(stats.highPriority) },
  { emoji: "⭐", label: "Avg AI Match", value: `${stats.avgAiMatch}%` },
];

function FilterChip({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "h-7 cursor-pointer rounded-full px-4 text-xs font-semibold text-white transition-colors",
        active
          ? "bg-brand-magenta shadow-glow-pink-soft"
          : "border border-brand-magenta/70 bg-transparent hover:bg-brand-magenta/15",
      )}
    >
      {label}
    </button>
  );
}

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  const [stats, genres, highPriority, allItems] = await Promise.all([
    getWatchlistStats(user.id),
    getWatchlistGenres(),
    getHighPriorityWatchlist(user.id),
    getAllWatchlistItems(user.id),
  ]);

  const activeGenre = "Anime";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="watchlist" />

      <section className="rounded-2xl bg-surface/40 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white sm:text-xl">📋 Your Watchlist</h2>
          <AddWatchlistButton />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statTiles(stats).map((tile) => (
            <div
              key={tile.label}
              className="bg-gradient-brand flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center shadow-[0_2px_10px_rgba(255,0,204,0.12)] sm:px-4 sm:py-4"
            >
              <span className="text-caption font-semibold text-white sm:text-xs">
                {tile.emoji} {tile.label}
              </span>
              <span className="text-xl font-bold text-white sm:text-2xl">{tile.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface/40 px-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:px-6 lg:px-8">
        <span className="text-sm font-bold text-white">Select Genre</span>
        <div className="flex flex-wrap items-center gap-4">
          {genres.map((genre) => (
            <FilterChip key={genre} label={genre} active={genre === activeGenre} />
          ))}
        </div>
      </section>

      <WatchlistGridSection
        title={`🔥 High Priority Watchlist  (${stats.highPriority})`}
        searchPlaceholder="Search Priority Content……. "
        items={highPriority}
      />

      <WatchlistGridSection
        title={`📋 All Watchlist Items  (${stats.savedItems})`}
        searchPlaceholder="Search Watchlist Content……. "
        items={allItems}
      />
    </div>
  );
}
