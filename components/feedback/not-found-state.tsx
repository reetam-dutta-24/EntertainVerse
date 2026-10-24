import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotFoundAction {
  href: string;
  label: string;
}

export interface NotFoundStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** First action renders as the primary gradient button. */
  actions?: NotFoundAction[];
  /** "page" fills the viewport (no shell); "panel" sits inside an app shell. */
  variant?: "page" | "panel";
}

/** Branded 404 used by every `not-found.tsx`. */
export function NotFoundState({
  title = "Lost in the multiverse",
  description = "The page you're looking for doesn't exist or may have been moved.",
  icon: Icon = Compass,
  actions = [
    { href: "/dashboard", label: "Back to dashboard" },
    { href: "/search", label: "Search AniVerse" },
  ],
  variant = "panel",
}: NotFoundStateProps) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden px-4 text-center",
        variant === "page" ? "min-h-dvh bg-background py-16" : "min-h-[60dvh] py-12",
      )}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[420px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/20 blur-[100px]"
        aria-hidden
      />

      <div className="relative flex w-full max-w-[520px] flex-col items-center gap-5">
        <span className="flex size-16 items-center justify-center rounded-full border border-brand-magenta/50 bg-glass-magenta">
          <Icon className="size-8 text-brand-pink" aria-hidden />
        </span>
        <p className="text-gradient-brand text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">
          404
        </p>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
        <p className="max-w-[420px] text-sm text-white/75 sm:text-base">{description}</p>

        {actions.length ? (
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
            {actions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition sm:w-auto",
                  index === 0
                    ? "bg-gradient-brand shadow-glow-pink-soft hover:opacity-90"
                    : "border border-white/25 hover:bg-white/10",
                )}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
