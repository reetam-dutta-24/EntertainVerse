import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Discover", href: "#" },
      { label: "For You", href: "#" },
      { label: "Collections", href: "#" },
      { label: "Watchlist", href: "#" },
      { label: "Analytics", href: "#" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Fan Communities", href: "#" },
      { label: "Posts", href: "#" },
      { label: "Watch Rooms", href: "#" },
      { label: "Voice Rooms", href: "#" },
      { label: "Reviews", href: "#" },
    ],
  },
  {
    heading: "Music",
    links: [
      { label: "Songs", href: "#" },
      { label: "OSTs", href: "#" },
      { label: "Artists", href: "#" },
      { label: "Albums", href: "#" },
      { label: "Playlists", href: "#" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Sign Up", href: "/signup" },
      { label: "Onboarding", href: "#" },
      { label: "Profile", href: "#" },
      { label: "Settings", href: "#" },
    ],
  },
];

/** Black footer: gradient logo, tagline, link columns, copyright. */
export function Footer() {
  return (
    <footer className="flex w-full flex-col items-center gap-8 bg-surface px-6 py-10">
      <div className="flex w-full max-w-[1200px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-20">
        <ScrollFadeIn direction="up">
        <div className="flex w-[260px] flex-col items-center gap-5 px-6 py-4">
          <p className="text-gradient-brand text-center text-heading font-semibold leading-none">
            AniVerse
          </p>
          <p className="text-center text-sm text-muted">
            AI-powered discovery for anime, shows, music, collections, and fan
            communities.
          </p>
        </div>
        </ScrollFadeIn>
        <ScrollFadeStagger className="grid flex-1 grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {columns.map((column) => (
            <ScrollFadeItem key={column.heading}>
            <div
              className="flex flex-col items-center gap-3.5 px-4 py-3"
            >
              <p className="text-base font-semibold text-white">
                {column.heading}
              </p>
              {column.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs text-muted/90 transition-colors hover:text-brand-pink"
                >
                  {link.label}
                </a>
              ))}
            </div>
            </ScrollFadeItem>
          ))}
        </ScrollFadeStagger>
      </div>
      <ScrollFadeIn delay={0.1}>
      <div className="flex w-full max-w-[1200px] justify-center border-t border-white/10 pt-5 lg:justify-end">
        <p className="text-xs text-muted/80">
          © 2026 AniVerse. Built for entertainment lovers.
        </p>
      </div>
      </ScrollFadeIn>
    </footer>
  );
}
