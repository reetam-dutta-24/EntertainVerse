import { SectionHeader } from "@/components/ui/section-header";
import { LANDING_FEATURES } from "@/lib/data/landing";
import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";

/** "Everything you love, connected." — 4×2 grid of gradient feature cards. */
export function FeaturesSection() {
  const features = LANDING_FEATURES;

  return (
    <section
      id="features"
      className="flex w-full scroll-mt-[72px] flex-col items-center gap-10 px-6 py-16"
    >
      <ScrollFadeIn>
        <SectionHeader
          title="Everything you love, connected."
          subtitle="Discover, save, track, and share your entertainment universe."
        />
      </ScrollFadeIn>
      <ScrollFadeStagger className="grid max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <ScrollFadeItem key={feature.title}>
            <div className="mx-auto flex h-auto min-h-[150px] w-full max-w-[260px] flex-col items-center gap-2 rounded-card bg-gradient-brand px-4 py-5 transition-transform duration-200 hover:-translate-y-1">
              <p className="text-lg font-bold text-white">{feature.title}</p>
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-sm font-medium text-white/95">
                  {feature.body}
                </p>
              </div>
            </div>
          </ScrollFadeItem>
        ))}
      </ScrollFadeStagger>
    </section>
  );
}
