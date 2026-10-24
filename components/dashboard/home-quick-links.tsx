import Link from "next/link";
import {
  BookOpen,
  Clapperboard,
  PlayCircle,
  Search,
  Users,
} from "lucide-react";

const links = [
  {
    href: "/dashboard/discover",
    label: "Discover",
    emoji: "🔍",
    body: "Trending anime, movies, shows, and music across the platform.",
    icon: Search,
  },
  {
    href: "/dashboard/for-you",
    label: "For You",
    emoji: "🎯",
    body: "Personalized picks tuned to your AI taste profile.",
    icon: PlayCircle,
  },
  {
    href: "/dashboard/watchlist",
    label: "Watchlist",
    emoji: "📋",
    body: "Save and track what you plan to watch or listen to next.",
    icon: Clapperboard,
  },
  {
    href: "/dashboard/collections",
    label: "Collections",
    emoji: "📒",
    body: "Curate anime, movies, shows, songs, and playlists.",
    icon: BookOpen,
  },
  {
    href: "/dashboard/community",
    label: "Community",
    emoji: "👥",
    body: "Join fans, discussions, and groups around your taste.",
    icon: Users,
  },
] as const;

/** Shortcut cards to the main dashboard sections. */
export function HomeQuickLinks() {
  return (
    <section className="rounded-2xl bg-surface/40 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <h2 className="text-heading font-bold text-white">⚡ Jump Back In</h2>
      <p className="mt-1 text-sm text-white/75">
        Open any hub to explore, save, or share your entertainment universe.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-surface/50 px-4 py-5 transition-colors hover:border-brand-magenta/50 hover:bg-brand-magenta/10"
          >
            <div className="flex items-center gap-2">
              <link.icon className="size-4 shrink-0 text-brand-pink transition-colors group-hover:text-white" />
              <span className="text-sm font-bold text-white">
                {link.emoji} {link.label}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-white/80">{link.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
