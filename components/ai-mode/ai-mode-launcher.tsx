import Link from "next/link";
import { Headphones, MessageCircle, Tv, WandSparkles } from "lucide-react";
import type { AiMode } from "@/lib/ai-profile/schema";

export const aiModeHref = (mode: AiMode, start?: "quiz" | "chat") =>
  `/dashboard/ai-mode?mode=${mode}${start ? `&start=${start}` : ""}`;

const pill =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:w-auto";

/** Compact AI-mode entry for For You and Discover — both modes, quiz or chat. */
export function AiModeLauncher({ defaultMode }: { defaultMode: AiMode }) {
  const other: AiMode = defaultMode === "watch" ? "listen" : "watch";
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand-magenta/25 bg-gradient-to-r from-brand-purple/25 via-surface to-surface px-4 py-4 shadow-card-inner sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand">
          <WandSparkles className="size-5 text-white" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-white sm:text-lg">Not sure what to {defaultMode === "watch" ? "watch" : "play"}? Try AI mode</h2>
          <p className="mt-0.5 text-sm text-white/60">A one-minute quiz or a quick chat — picks that fit your mood, with reasons.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={aiModeHref(defaultMode, "quiz")} className={`${pill} bg-gradient-brand text-white hover:opacity-90`}>
          🃏 Taste quiz
        </Link>
        <Link href={aiModeHref(defaultMode, "chat")} className={`${pill} border border-brand-magenta/50 text-white hover:bg-brand-magenta/15`}>
          <MessageCircle className="size-4" aria-hidden /> Chat
        </Link>
        <Link href={aiModeHref(other)} className={`${pill} text-white/65 hover:text-white`}>
          {other === "listen" ? <Headphones className="size-4" aria-hidden /> : <Tv className="size-4" aria-hidden />}
          {other === "listen" ? "Music instead" : "Shows instead"}
        </Link>
      </div>
    </section>
  );
}
