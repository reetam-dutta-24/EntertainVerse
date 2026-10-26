import Image from "next/image";

const collage = [
  "/images/poster-jjk.png",
  "/images/album-swim.png",
  "/images/hero-1.webp",
  "/images/hero-3.webp",
  "/images/hero-4.webp",
  "/images/hero-2.webp",
  "/images/album-swim.png",
  "/images/poster-jjk.png",
  "/images/hero-2.webp",
  "/images/hero-4.webp",
  "/images/hero-1.webp",
  "/images/hero-3.webp",
];

/** Left auth panel: dimmed content collage with welcome copy on top. */
export function AuthShowcase() {
  return (
    <div className="relative hidden min-h-dvh items-center justify-center overflow-hidden bg-background lg:flex">
      {/* Dimmed poster collage */}
      <div
        className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-20 blur-[2px]"
        aria-hidden
      >
        {collage.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative min-h-[160px] overflow-hidden rounded-xl"
          >
            <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-background"
        aria-hidden
      />

      <div className="relative z-10 flex max-w-[420px] flex-col items-center gap-5 px-8 text-center">
        <h1 className="text-4xl font-bold leading-tight text-white">
          Welcome back to your{" "}
          <span className="text-brand-magenta">universe</span>.
        </h1>
        <p className="text-base text-muted">
          Continue discovering anime, music, collections, and communities
          personalized for you.
        </p>
      </div>
    </div>
  );
}
