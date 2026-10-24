import { SectionHeader } from "@/components/ui/section-header";
import { CommunityCard } from "@/components/cards/community-card";
import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";
import { LANDING_TRENDING_COMMUNITIES } from "@/lib/data/landing";

/** "Find fandoms that feel like home" — static demo community cards. */
export function CommunitiesSection() {
  const communities = LANDING_TRENDING_COMMUNITIES;

  return (
    <section
      id="community"
      className="flex w-full scroll-mt-[72px] flex-col items-center gap-10 px-6 py-16"
    >
      <ScrollFadeIn>
        <SectionHeader
          title="Find fandoms that feel like home"
          subtitle="Example fan spaces — join communities, post reviews and chat live. Watch parties are coming soon."
        />
      </ScrollFadeIn>
      <div className="w-full overflow-x-auto pb-8 pt-2">
        <ScrollFadeStagger className="mx-auto flex w-max flex-nowrap items-start gap-7 px-2">
          {communities.map((community) => (
            <ScrollFadeItem key={community.id}>
            <CommunityCard
              community={community}
              className="w-[190px] shrink-0"
              demo
            />
            </ScrollFadeItem>
          ))}
        </ScrollFadeStagger>
      </div>
    </section>
  );
}
