import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthCardProps {
  title: string;
  subtitle: string;
  /** Show the sparkle mark next to the logo (login screen). */
  sparkle?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Glassy gradient auth card with pink corner glows. */
export function AuthCard({
  title,
  subtitle,
  sparkle = false,
  children,
  className,
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-[400px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[rgba(216,2,220,0.16)] via-[rgba(128,0,255,0.10)] to-[rgba(216,2,220,0.20)] px-7 py-9 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl",
        className,
      )}
    >
      {/* Corner glow blobs */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-brand-magenta/50 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 size-36 rounded-full bg-brand-magenta/40 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col items-center gap-1.5 text-center">
        <p className="flex items-center gap-1.5">
          {sparkle ? <Sparkles className="size-5 text-white" /> : null}
          <span className="text-gradient-brand text-heading font-semibold leading-none">
            AniVerse
          </span>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>

      <div className="relative mt-6">{children}</div>
    </div>
  );
}
