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
  LANDING_FEATURED_COMMUNITY_MEMBERS,
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
    <div className="flex max-w-[560px] flex-col justify-center gap-8 px-6 py-8 lg:px-10">
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
  const members = LANDING_FEATURED_COMMUNITY_MEMBERS;
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
            title="Discover content that fits your taste"
            subtitle="Find anime, shows, songs, and artists matched to your preferences, moods, and genres."
            bullets={[
              "AI-powered recommendations",
              "Personalized match scores",
              "Content across anime, music, and shows",
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
            title="Join communities built around what you love"
            subtitle="Discover fan spaces where you can chat, post, review, and connect with people who share your taste."
            bullets={[
              "Active fan communities",
              "Watch rooms and discussions",
              "Public and niche fandom spaces",
            ]}
            cta="View communities"
            href="/login?callbackUrl=/community"
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
            title="Save everything in smart collections"
            subtitle="Organize your favorite anime, songs, playlists, and titles into collections that reflect your entertainment identity."
            bullets={[
              "Build personal collections",
              "Save favorites in one place",
              "Revisit your best picks anytime",
            ]}
            cta="See collections"
            href="/login?callbackUrl=/collection"
          />
        </ScrollFadeIn>
      </div>
    </section>
  );
}
