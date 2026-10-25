import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";
import { LANDING_TASTE_STATS } from "@/lib/data/landing";

/** "Understand your entertainment taste" — sample stat cards, labelled as a sample. */
export function StatsSection() {
  const stats = LANDING_TASTE_STATS;

  return (
    <section
      id="analytics"
      className="flex w-full scroll-mt-[72px] flex-col items-center gap-10 px-6 py-16"
    >
      <ScrollFadeIn>
        <SectionHeader
          title="Understand your entertainment taste"
          subtitle="A sample taste profile — yours fills in as you watch and listen, and becomes your Taste DNA and Wrapped"
        />
      </ScrollFadeIn>
      <ScrollFadeStagger className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <ScrollFadeItem key={stat.id}>
            <StatCard label={stat.label} value={stat.value} />
          </ScrollFadeItem>
        ))}
      </ScrollFadeStagger>
    </section>
  );
}
