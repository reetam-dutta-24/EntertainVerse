import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ScrollFadeIn } from "@/components/landing/scroll-fade-in";
import { cn } from "@/lib/utils";

/** Full-width gradient CTA banner: "Create your AniVerse". */
export function CtaSection() {
  return (
    <section
      id="cta"
      className="flex min-h-[300px] w-full scroll-mt-[72px] flex-col items-center justify-center gap-8 bg-gradient-blue-violet px-6 py-12"
    >
      <ScrollFadeIn direction="up" amount={0.35}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-title font-bold text-white">
          Create your <span className="text-brand-pink">AniVerse</span>
        </h2>
        <p className="text-subtitle text-muted">
          Your next favorite anime, song, artist, or community is waiting
        </p>
      </div>
      </ScrollFadeIn>
      <ScrollFadeIn delay={0.15} direction="up" amount={0.35}>
      <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10">
        <Link
          href="/signup"
          className={cn(
            buttonVariants({ variant: "gradient", size: "md" }),
            "w-[132px]",
          )}
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline", size: "md" }),
            "w-[132px] border-brand-fuchsia",
          )}
        >
          Log in
        </Link>
      </div>
      </ScrollFadeIn>
    </section>
  );
}
