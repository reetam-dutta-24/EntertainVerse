import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { PosterCard } from "@/components/cards/poster-card";
import { CommunityCard } from "@/components/cards/community-card";
import { CollectionCard } from "@/components/cards/collection-card";
import { ScrollFadeIn } from "@/components/landing/scroll-fade-in";
import { cn } from "@/lib/utils";
import {
  LANDING_FEATURED_COLLECTION,
  LANDING_FEATURED_COMMUNITY,
  LANDING_SPOTLIGHT_CONTENT,
  LANDING_SPOTLIGHT_MUSIC,
} from "@/lib/data/landing";

interface HighlightTextProps {
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
  href: string;
}

function HighlightText({ title, subtitle, bullets, cta, href }: HighlightTextProps) {
  return (
    <div className="flex w-full min-w-0 max-w-[560px] flex-col justify-center gap-8 px-6 py-8 lg:px-10">
      <div className="flex flex-col gap-2">
        <h3 className="max-w-[480px] text-heading font-bold text-white">
          {title}
        </h3>
        <p className="max-w-[420px] text-subtitle text-muted">{subtitle}</p>
      </div>
      <ul className="list-disc space-y-1.5 ps-6 text-base text-white">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <div>
        <Link
          href={href}
          className={cn(buttonVariants({ variant: "gradient", size: "md" }))}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

/** "One hub for your entertainment world" — three alternating rows (static demo cards). */
export function HighlightsSection() {
  const content = LANDING_SPOTLIGHT_CONTENT;
  const music = LANDING_SPOTLIGHT_MUSIC;
  const community = LANDING_FEATURED_COMMUNITY;
  const collection = LANDING_FEATURED_COLLECTION;

  return (
    <section className="flex w-full flex-col items-center gap-6 px-6 py-16">
      <ScrollFadeIn>
        <SectionHeader
          title="One hub for your entertainment world"
          subtitle="From recommendations to communities, EntertainVerse keeps your taste organized."
        />
      </ScrollFadeIn>

      {/* Row 1: cards left, text right */}
      <div className="flex w-full max-w-[1200px] flex-col items-center justify-between gap-8 py-8 lg:flex-row lg:px-10">
        <ScrollFadeIn direction="left" className="flex flex-wrap items-center justify-center gap-9">
          <PosterCard item={content} demo />
          <PosterCard item={music} demo />
        </ScrollFadeIn>
        <ScrollFadeIn direction="right" delay={0.1}>
          <HighlightText
            title="Picks that explain themselves"
            subtitle="Every recommendation blends what you've told us, what titles are actually about, and what fans like you love — and says why."
            bullets={[
              "“Because you loved…” reasons on every card",
              "Official trailers, previews, and where to watch",
              "AI mode turns a mood into picks in seconds",
            ]}
            cta="Explore Discover"
            href="/login?callbackUrl=/dashboard/discover"
          />
        </ScrollFadeIn>
      </div>

      {/* Row 2: text left, community card right */}
      <div className="flex w-full max-w-[1200px] flex-col-reverse items-center justify-center gap-8 lg:flex-row lg:gap-[120px]">
        <ScrollFadeIn direction="left" delay={0.1}>
          <HighlightText
            title="Watch together, talk live"
            subtitle="Fan communities with posts, reviews, and live chat — and rooms to watch, listen, and talk in real time."
            bullets={[
              "Synced watch parties and listen parties",
              "Voice talk rooms in every community",
              "AI Match rooms bring in people who share your taste",
            ]}
            cta="View communities"
            href="/login?callbackUrl=/dashboard/community"
          />
        </ScrollFadeIn>
        <ScrollFadeIn direction="right">
          <CommunityCard
            community={community}
            className="shadow-glow-cyan"
            demo
          />
        </ScrollFadeIn>
      </div>

      {/* Row 3: collection card left, text right */}
      <div className="flex w-full max-w-[1200px] flex-col items-center justify-between gap-8 py-8 lg:flex-row lg:px-[140px]">
        <ScrollFadeIn direction="left">
          <CollectionCard
            collection={collection}
            className="rounded-card shadow-glow-blue"
            demo
          />
        </ScrollFadeIn>
        <ScrollFadeIn direction="right" delay={0.1}>
          <HighlightText
            title="Collections that grow with you"
            subtitle="Gather titles and songs into public or private collections, and get fresh collection ideas each week from what you love."
            bullets={[
              "Weekly AI collection ideas — save or dismiss",
              "Play mode with an ambient, themed player",
              "Follow and favourite other fans' collections",
            ]}
            cta="See collections"
            href="/login?callbackUrl=/dashboard/collections"
          />
        </ScrollFadeIn>
      </div>
    </section>
  );
}
