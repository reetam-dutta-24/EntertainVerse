import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Discover", href: "/dashboard/discover" },
      { label: "For You", href: "/dashboard/for-you" },
      { label: "AI Mode", href: "/dashboard/ai-mode" },
      { label: "Collections", href: "/dashboard/collections" },
      { label: "Wrapped", href: "/dashboard/wrapped" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Fan Communities", href: "/dashboard/community" },
      { label: "AI Match", href: "/dashboard/ai-mode/match" },
      { label: "Watch parties", href: "/dashboard/community" },
      { label: "Voice talk rooms", href: "/dashboard/community" },
      { label: "Messages", href: "/dashboard/messages" },
    ],
  },
  {
    heading: "Music",
    links: [
      { label: "Songs", href: "/dashboard/discover" },
      { label: "OSTs", href: "/dashboard/discover" },
      { label: "Artists", href: "/dashboard/for-you" },
      { label: "Albums", href: "/dashboard/discover" },
      { label: "Playlists", href: "/dashboard/collections" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Onboarding", href: "/onboarding" },
      { label: "Profile", href: "/dashboard/settings" },
      { label: "Settings", href: "/dashboard/settings" },
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
            EntertainVerse
          </p>
          <p className="text-center text-sm text-muted">
            Know what to watch and listen to next — and why. Anime, shows,
            K-dramas, films, music, and the fans who love them.
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
          © 2026 EntertainVerse. Built for entertainment lovers.
        </p>
      </div>
      </ScrollFadeIn>
    </footer>
  );
}
