import Link from "next/link";
import { Headphones, Map as MapIcon, MessageCircle, Sparkles, Tv, WandSparkles } from "lucide-react";
import { aiModeHref } from "@/components/ai-mode/ai-mode-launcher";
import { HdImage } from "@/components/ui/hd-image";
import { getContentDetailPath } from "@/lib/content-routes";
import { getSongDetailPath } from "@/lib/song-routes";
import type { ContentItem, MusicTrack } from "@/types";

function TonightCard({
  label,
  icon: Icon,
  href,
  title,
  subtitle,
  imageUrl,
  reason,
}: {
  label: string;
  icon: typeof Tv;
  href: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  reason?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-2.5 transition-colors hover:border-brand-magenta/50 hover:bg-black/35"
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
        {imageUrl ? <HdImage src={imageUrl} alt="" className="size-full object-cover" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-micro font-semibold uppercase tracking-wide text-white/50">
          <Icon className="size-3" aria-hidden /> {label}
        </span>
        <span className="block truncate text-sm font-semibold text-white group-hover:text-brand-pink">{title}</span>
        <span className="block truncate text-caption text-white/55">{subtitle}</span>
        {reason ? (
          <span className="mt-0.5 line-clamp-1 text-caption text-brand-pink">
            <Sparkles className="me-1 inline size-3 -translate-y-px" aria-hidden />
            {reason}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export interface RoadmapTeaser {
  title: string;
  progressPercent: number;
  doneSteps: number;
  totalSteps: number;
  next: { title: string; href: string } | null;
}

/** Home: the AI-mode front door — tonight's picks in one glance, quiz or chat in one tap. */
export function AiModeSpotlight({
  watch,
  listen,
  roadmap,
}: {
  watch: ContentItem | null;
  listen: MusicTrack | null;
  roadmap: RoadmapTeaser | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand-magenta/30 bg-gradient-to-br from-brand-purple/30 via-surface to-surface p-4 shadow-card-inner sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand-magenta/20 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-white">
            <WandSparkles className="size-3.5" aria-hidden /> AI mode
          </span>
          <h2 className="text-lg font-bold text-white sm:text-2xl">Lost in the content tsunami? Let AI pick.</h2>
          <p className="text-sm text-white/65">
            Tell it your mood — by quiz cards or chat — and get picks for tonight with a reason for each. Watch or listen.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={aiModeHref("watch", "quiz")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              🃏 Taste quiz
            </Link>
            <Link
              href={aiModeHref("watch", "chat")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brand-magenta/60 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-magenta/15 sm:w-auto"
            >
              <MessageCircle className="size-4" aria-hidden /> Chat with AI
            </Link>
            <Link
              href={aiModeHref("listen")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-white/70 transition-colors hover:text-white sm:w-auto"
            >
              <Headphones className="size-4" aria-hidden /> Music mode
            </Link>
          </div>
          <Link
            href="/dashboard/ai-mode/roadmap?mode=watch"
            className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/25 p-3 transition-colors hover:border-brand-magenta/50"
          >
            <span className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-white">
                <MapIcon className="size-3.5 shrink-0 text-brand-pink" aria-hidden />
                <span className="truncate">{roadmap ? roadmap.title : "Get a roadmap that fits your week"}</span>
              </span>
              {roadmap ? (
                <span className="shrink-0 text-white/55">
                  {roadmap.doneSteps}/{roadmap.totalSteps} done
                </span>
              ) : null}
            </span>
            {roadmap ? (
              <>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-gradient-brand" style={{ width: `${roadmap.progressPercent}%` }} />
                </span>
                {roadmap.next ? <span className="truncate text-caption text-white/60">Next: {roadmap.next.title}</span> : null}
              </>
            ) : (
              <span className="text-caption text-white/55">An ordered plan with a written analysis of your taste →</span>
            )}
          </Link>
        </div>

        {watch || listen ? (
          <div className="flex w-full flex-col gap-2 lg:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Tonight&apos;s picks</p>
            {watch ? (
              <TonightCard
                label="Watch"
                icon={Tv}
                href={getContentDetailPath(watch.id)}
                title={watch.title}
                subtitle={[watch.meta, watch.year].filter(Boolean).join(" · ")}
                imageUrl={watch.imageUrl}
                reason={watch.reason}
              />
            ) : null}
            {listen ? (
              <TonightCard
                label="Listen"
                icon={Headphones}
                href={getSongDetailPath(listen.id)}
                title={listen.title}
                subtitle={listen.artist}
                imageUrl={listen.imageUrl}
                reason={listen.reason}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
