import { SectionHeader } from "@/components/ui/section-header";
import {
  ScrollFadeIn,
  ScrollFadeItem,
  ScrollFadeStagger,
} from "@/components/landing/scroll-fade-in";

const steps = [
  {
    number: "01",
    title: "Share your taste",
    body: "Pick favorites when you sign up, or take the AI quiz — you can always see and edit what it learned.",
  },
  {
    number: "02",
    title: "Get picks with reasons",
    body: "Recommendations across titles, songs, artists, and communities — each one says why.",
  },
  {
    number: "03",
    title: "Plan your week",
    body: "Turn a mood into an AI roadmap that fits your hours and tracks itself as you watch.",
  },
  {
    number: "04",
    title: "Enjoy it together",
    body: "Join watch parties and fandoms, find taste matches, and share your Wrapped.",
  },
];

/** "How EntertainVerse Works" — four numbered step cards on black. */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="flex w-full scroll-mt-[72px] flex-col items-center gap-10 bg-surface px-6 py-16"
    >
      <ScrollFadeIn>
        <SectionHeader
          title="How EntertainVerse Works"
          subtitle="Start with your taste. EntertainVerse does the rest."
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
