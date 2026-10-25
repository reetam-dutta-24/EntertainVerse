export type WelcomeBannerVariant =
  | "home"
  | "discover"
  | "collections"
  | "foryou"
  | "watchlist"
  | "community"
  | "analytics"
  | "settings"
  | "aiprofile";

export interface WelcomeBannerProps {
  userName: string;
  variant: WelcomeBannerVariant;
}

const copy: Record<
  WelcomeBannerVariant,
  { message: string; highlights: string[] }
> = {
  home: {
    message:
      "Your entertainment hub — picks, watchlists, collections, and communities in one place.",
    highlights: [
      "🎯 12 fresh picks waiting in For You",
      "⏳ 4 titles ready to resume watching",
      "📒 3 collections updated this week",
      "👥 2 active communities in your feed",
    ],
  },
  discover: {
    message:
      "Explore trending anime, movies, shows, K-dramas, and music picked for your taste.",
    highlights: [
      "🎬 24 new titles match your profile this week",
      "🎧 8 OSTs added to your listening queue",
      "🔥 Your top genre right now: Action & Thriller",
      "⭐ 3 shows crossed your 9.0+ rating filter",
    ],
  },
  collections: {
    message:
      "Organize your favorite anime, movies, shows, songs, and playlists.",
    highlights: [
      "📒 32 collections saved across anime & music",
      "🗂️ 347 items curated in your library",
      "⭐ 126 favourites marked for quick access",
      "🕐 Last updated 2 hours ago — keep building!",
    ],
  },
  foryou: {
    message:
      "Your personalized mix of anime, movies, shows, and music — tuned to your taste.",
    highlights: [
      "🎯 12 new picks match your AI profile today",
      "🎧 6 OSTs queued from your recent watches",
      "🧠 Psychological thriller is your top mood",
      "⭐ AI Taste Profile: 91% locked in",
    ],
  },
  watchlist: {
    message:
      "Save anime, movies, shows, and music you want to watch or listen to later.",
    highlights: [
      "📋 65 items saved across your watchlist",
      "⏳ 34 titles still pending",
      "🔥 21 marked high priority",
      "⭐ Average AI Match: 91%",
    ],
  },
  community: {
    message:
      "Discover communities, meet fans, join discussions, and share your favorite anime, movies, music, and shows.",
    highlights: [
      "👥 24 communities joined",
      "💬 1,283 posts viewed this month",
      "🔥 12 very active groups in your feed",
      "⭐ Avg AI Compatibility: 92%",
    ],
  },
  analytics: {
    message:
      "Track your watching, listening, genres, and taste patterns — your entertainment life in numbers.",
    highlights: [
      "🎬 186 hours watched this year",
      "🎧 214 hours of music listened",
      "🎯 AI match accuracy at an all-time 93%",
      "🔥 24-day activity streak going strong",
    ],
  },
  aiprofile: {
    message:
      "Everything EntertainVerse's AI uses to recommend for you — in plain words, and fully in your control.",
    highlights: [
      "🧬 How your taste reads",
      "📈 What it learned from activity",
      "💬 Your AI-mode answers",
      "🎛️ Turn off, download or wipe",
    ],
  },
  settings: {
    message:
      "Manage your profile, notifications, privacy, and how EntertainVerse works for you.",
    highlights: [
      "👤 Profile & account details",
      "🔔 Notification preferences",
      "🔒 Privacy controls",
      "🎯 Retake your taste test anytime",
    ],
  },
};

/** Brand-gradient greeting banner — consistent across dashboard pages. */
export function WelcomeBanner({ userName, variant }: WelcomeBannerProps) {
  const { message, highlights } = copy[variant];

  return (
    <section className="bg-gradient-brand rounded-2xl px-4 py-4 shadow-[0_4px_24px_rgba(255,0,204,0.2)] sm:px-6 sm:py-5 lg:px-8">
      <h2 className="text-lg font-bold text-white sm:text-xl">
        Welcome back, {userName} <span aria-hidden>🔥</span>
      </h2>
      <p className="mt-1.5 text-sm font-normal text-white/95">{message}</p>
      <ul className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-6">
        {highlights.map((line) => (
          <li key={line} className="text-xs font-normal text-white/90">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
