import Image from "next/image";
import Link from "next/link";
import { EntranceFade } from "@/components/landing/scroll-fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Hero: collage of four blurred anime stills fading into the dark
 * background, with the centered headline and CTA pair on top.
 */
export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-[60dvh] w-full scroll-mt-[72px] overflow-hidden bg-background sm:min-h-[720px] lg:h-[935px]"
    >
      {/* Background collage (Figma: 4 panels, blur 3px, heavy inset vignettes) */}
      <div className="absolute inset-0 flex" aria-hidden>
        <div className="relative h-full w-[43%]">
          <Image
            src="/images/hero-1.png"
            alt=""
            fill
            priority
            sizes="43vw"
            className="object-cover blur-[3px]"
          />
          <div className="absolute inset-0 shadow-[inset_240px_-200px_250px_200px_rgba(0,0,0,0.85)]" />
        </div>
        <div className="relative hidden h-full w-[36%] sm:block">
          <Image
            src="/images/hero-2.png"
            alt=""
            fill
            priority
            sizes="36vw"
            className="object-cover blur-[3px]"
          />
          <div className="absolute inset-0 shadow-[inset_0px_-200px_250px_200px_rgba(0,0,0,0.85)]" />
        </div>
        <div className="relative hidden h-full w-[34%] flex-col md:flex">
          <div className="relative h-[68%] w-full">
            <Image
              src="/images/hero-4.png"
              alt=""
              fill
              priority
              sizes="34vw"
              className="object-cover blur-[3px]"
            />
            <div className="absolute inset-0 shadow-[inset_-240px_4px_250px_200px_rgba(0,0,0,0.85)]" />
          </div>
          <div className="relative h-[32%] w-full">
            <Image
              src="/images/hero-3.png"
              alt=""
              fill
              priority
              sizes="34vw"
              className="object-cover blur-[3px]"
            />
            <div className="absolute inset-0 shadow-[inset_-240px_-167px_250px_175px_rgba(0,0,0,0.85)]" />
          </div>
        </div>
      </div>
      {/* Fade the collage into the page background at the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background"
        aria-hidden
      />

      {/* Foreground content, nudged slightly above center */}
      <div className="relative z-10 flex h-full min-h-[60dvh] items-center justify-center px-4 sm:min-h-[720px] sm:px-6 lg:min-h-[935px]">
        <EntranceFade className="flex w-full max-w-[800px] -translate-y-4 flex-col items-center gap-6 py-8 text-center sm:-translate-y-8 sm:gap-[30px] lg:-translate-y-14">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-5xl sm:leading-[0.93] lg:text-display">
            Know what to watch next{" "}
            <span className="whitespace-nowrap text-brand-fuchsia">— and why</span>
          </h1>
          <p className="max-w-[600px] text-base font-semibold text-muted sm:text-lg">
            Anime, shows, K-dramas, films, and music matched to your taste,
            with a reason for every pick, a plan that fits your week, and
            people to enjoy it with.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-14">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "gradient", size: "xl" }),
                "w-[140px]",
              )}
            >
              Get Started
            </Link>
            <Link
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "xl" }),
                "w-[140px] border-brand-fuchsia",
              )}
            >
              See Features
            </Link>
          </div>
        </EntranceFade>
      </div>
    </section>
  );
}
