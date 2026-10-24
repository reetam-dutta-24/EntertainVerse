import { ExternalLink } from "lucide-react";
import { TrailerFacade, youtubeId } from "@/components/content/trailer-facade";
import { fetchWatchProviders, type WatchProviders } from "@/lib/catalog-import/sources/tmdb";

const GROUPS: { key: keyof Omit<WatchProviders, "link">; label: string }[] = [
  { key: "stream", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
];

export interface ContentWatchOptionsProps {
  title: string;
  trailerUrl?: string;
  tmdbId?: number;
  tmdbKind?: "movie" | "tv";
}

/**
 * Official trailer + legal "where to watch" providers (TMDB / JustWatch data).
 * Renders nothing when a title has neither.
 */
export async function ContentWatchOptions({ title, trailerUrl, tmdbId, tmdbKind }: ContentWatchOptionsProps) {
  const providers = tmdbId && tmdbKind ? await fetchWatchProviders(tmdbId, tmdbKind).catch(() => null) : null;
  const hasTrailer = Boolean(trailerUrl && youtubeId(trailerUrl));
  const hasProviders = providers && GROUPS.some(({ key }) => providers[key].length > 0);
  if (!hasTrailer && !hasProviders) return null;

  // TMDB's own watch page is DNS-blocked by several Indian ISPs; JustWatch (the data
  // source) isn't, and its search lands on the title with every provider deep link.
  const region = (process.env.WATCH_REGION || "IN").toLowerCase();
  const watchLink = `https://www.justwatch.com/${region}/search?q=${encodeURIComponent(title)}`;

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 sm:px-8 lg:px-12">
      <h2 className="text-lg font-bold text-white sm:text-xl">🎬 Trailer &amp; where to watch</h2>
      <div className={hasTrailer && hasProviders ? "grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : "grid gap-6"}>
        {hasTrailer ? <TrailerFacade url={trailerUrl!} title={title} /> : null}

        {hasProviders ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            {GROUPS.filter(({ key }) => providers![key].length > 0).map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</p>
                <ul className="flex flex-wrap gap-2">
                  {providers![key].map((provider) => (
                    <li key={provider.id}>
                      <a
                        href={watchLink}
                        target="_blank"
                        rel="noreferrer"
                        title={`${label} on ${provider.name}`}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 py-1.5 pl-1.5 pr-3 text-sm text-white transition-colors hover:border-brand-magenta/50"
                      >
                        {provider.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={provider.logoUrl} alt="" className="size-7 rounded-lg" />
                        ) : null}
                        {provider.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <a
              href={watchLink}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex items-center gap-1 text-caption text-white/45 hover:text-white/70"
            >
              Availability in {region.toUpperCase()} · data by JustWatch via TMDB
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
