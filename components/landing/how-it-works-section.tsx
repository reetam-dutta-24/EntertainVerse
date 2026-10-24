import { SectionHeader } from "@/components/ui/section-header";
import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";

const steps = [
  {
    number: "01",
    title: "Pick your favorites",
    body: "Choose genres, content types, artists, and communities",
  },
  {
    number: "02",
    title: "Get matched",
    body: "AniVerse creates your AI-powered taste profile.",
  },
  {
    number: "03",
    title: "Build your universe",
    body: "Save content, create collections, and organize your favorites.",
  },
  {
    number: "04",
    title: "Join the experience",
    body: "Enter communities, share reviews, join watch rooms, and connect with fans.",
  },
];

/** "How AniVerse Works" — four numbered step cards on black. */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="flex w-full scroll-mt-[72px] flex-col items-center gap-10 bg-surface px-6 py-16"
    >
      <ScrollFadeIn>
        <SectionHeader
          title="How AniVerse Works"
          subtitle="Start with your taste. AniVerse does the rest."
        />
      </ScrollFadeIn>
      <div className="w-full overflow-x-auto py-6">
        <ScrollFadeStagger className="mx-auto flex w-max flex-nowrap items-stretch gap-6 px-2 lg:gap-8">
        {steps.map((step) => (
          <ScrollFadeItem key={step.number}>
          <div
            className="flex h-auto min-h-[220px] w-[230px] shrink-0 flex-col items-center gap-3 rounded-card bg-glass-magenta px-4 py-7 transition-shadow duration-300 hover:shadow-glow-pink lg:w-[250px]"
          >
            <div className="flex w-full items-center justify-center gap-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-lg font-black text-white">
                {step.number}
              </span>
              <span className="w-[120px] text-base font-bold leading-snug text-white">
                {step.title}
              </span>
            </div>
            <p className="w-full max-w-[190px] text-center text-sm text-muted sm:text-left">
              {step.body}
            </p>
          </div>
          </ScrollFadeItem>
        ))}
        </ScrollFadeStagger>
      </div>
    </section>
  );
}
