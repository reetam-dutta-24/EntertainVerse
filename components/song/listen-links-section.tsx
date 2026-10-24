import { ExternalLink, Search } from "lucide-react";
import { LISTEN_SERVICE_LABELS, listenSearchLinks, type ListenLink } from "@/lib/listen-links";
import { cn } from "@/lib/utils";

export interface ListenLinksSectionProps {
  heading: string;
  /** Used for the search links, e.g. "Idol YOASOBI". */
  query: string;
  /** Deep links stored by the importer / admin. */
  links: ListenLink[];
  /** False when the page already provides the max-width + side padding. */
  inset?: boolean;
}

/**
 * Legal ways to hear the full track: stored deep links first, then search
 * links for the big services that weren't linked directly.
 */
export function ListenLinksSection({ heading, query, links, inset = true }: ListenLinksSectionProps) {
  const region = (process.env.WATCH_REGION || "IN").toLowerCase();
  const search = listenSearchLinks(query, links, region);

  return (
    <section className={cn("flex w-full flex-col gap-3", inset && "mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12")}>
      <h2 className="text-lg font-bold text-white sm:text-xl">{heading}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-white transition-colors hover:border-brand-magenta/50 hover:bg-white/10"
            >
              {LISTEN_SERVICE_LABELS[link.service]}
              <ExternalLink className="size-3.5 text-white/50" aria-hidden />
            </a>
          </li>
        ))}
        {search.map((link) => (
          <li key={link.service}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              title={`Search ${LISTEN_SERVICE_LABELS[link.service]}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-white/70 transition-colors hover:border-white/25 hover:text-white"
            >
              <Search className="size-3.5 text-white/40" aria-hidden />
              {LISTEN_SERVICE_LABELS[link.service]}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-caption text-white/40">
        In-app playback uses official 30-second previews. Open a service for full tracks.
      </p>
    </section>
  );
}
