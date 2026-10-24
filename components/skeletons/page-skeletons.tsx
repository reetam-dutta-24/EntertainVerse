import { Sparkles } from "lucide-react";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonBanner,
  SkeletonCardGrid,
  SkeletonCarouselSection,
  SkeletonChartPanel,
  SkeletonDetailBody,
  SkeletonDetailHero,
  SkeletonFilterRow,
  SkeletonForm,
  SkeletonListRows,
  SkeletonSectionHeader,
  SkeletonStatPanel,
  SkeletonTable,
  SkeletonTasteBar,
} from "@/components/skeletons/skeleton-blocks";
import { cn } from "@/lib/utils";

/**
 * Route-level skeletons used by `loading.tsx` files. Each mirrors the real
 * page layout so content swaps in without the page jumping around.
 */

const DASHBOARD_PAGE = "mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6";

/** Full-screen branded loader — used where no shell is rendered yet. */
export function AppLoadingScreen({ label = "Loading your universe…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-magenta/20 motion-reduce:animate-none" />
        <span className="absolute inset-2 animate-pulse rounded-full bg-gradient-brand opacity-60 blur-md motion-reduce:animate-none" />
        <Sparkles className="relative size-9 text-white" aria-hidden />
      </div>
      <span className="text-gradient-brand text-xl font-semibold">AniVerse</span>
      <p role="status" className="text-sm text-muted/80">
        {label}
      </p>
    </div>
  );
}

/** Home / Discover / For You: banner, taste bar, optional stats, carousels. */
export function DashboardFeedSkeleton({
  stats = false,
  tasteBar = true,
  sections = 4,
}: {
  stats?: boolean;
  tasteBar?: boolean;
  sections?: number;
}) {
  return (
    <div className={DASHBOARD_PAGE}>
      <LoadingStatus label="Loading your feed…" />
      <SkeletonBanner />
      {tasteBar ? <SkeletonTasteBar /> : null}
      {stats ? <SkeletonStatPanel tiles={8} /> : null}
      {Array.from({ length: sections }, (_, i) => (
        <SkeletonCarouselSection key={i} round={i === 1} />
      ))}
    </div>
  );
}

/** Watchlist / Collections / Communities / Favorites: stats, filters, card grid. */
export function DashboardGridSkeleton({
  stats = true,
  filters = true,
  posterGrid = false,
}: {
  stats?: boolean;
  filters?: boolean;
  posterGrid?: boolean;
}) {
  return (
    <div className={DASHBOARD_PAGE}>
      <LoadingStatus />
      <SkeletonBanner />
      {stats ? <SkeletonStatPanel /> : null}
      {filters ? <SkeletonFilterRow /> : null}
      <section className="flex flex-col gap-4">
        <SkeletonSectionHeader />
        {posterGrid ? (
          <>
            <SkeletonCarouselSection withSearch={false} />
            <SkeletonCarouselSection withSearch={false} />
          </>
        ) : (
          <SkeletonCardGrid count={10} />
        )}
      </section>
    </div>
  );
}

export function DashboardAnalyticsSkeleton() {
  return (
    <div className={DASHBOARD_PAGE}>
      <LoadingStatus label="Loading analytics…" />
      <SkeletonBanner />
      <SkeletonStatPanel tiles={8} withHeader={false} />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 min-w-[180px] flex-1 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonChartPanel className="lg:col-span-2" tall />
        <SkeletonChartPanel tall />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonChartPanel />
        <SkeletonChartPanel />
      </div>
    </div>
  );
}

/** Messages: conversation list + open thread (stacks on mobile). */
export function DashboardMessagesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingStatus label="Loading messages…" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid min-h-[60dvh] grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 rounded-2xl bg-surface/40 p-3">
          <Skeleton className="h-10 w-full rounded-full" />
          <SkeletonListRows rows={6} />
        </div>
        <div className="hidden flex-col gap-4 rounded-2xl bg-surface/40 p-4 lg:flex">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {["w-3/5", "w-2/5", "w-2/3", "w-1/3", "w-1/2"].map((width, i) => (
              <Skeleton
                key={i}
                className={cn("h-10 rounded-2xl", width, i % 2 ? "self-end" : "self-start")}
              />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Notifications / simple list pages under the dashboard. */
export function DashboardListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className={DASHBOARD_PAGE}>
      <LoadingStatus />
      <SkeletonBanner />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-full sm:w-36" />
      </div>
      <SkeletonListRows rows={rows} withAction />
    </div>
  );
}

export function DashboardSettingsSkeleton() {
  return (
    <div className={DASHBOARD_PAGE}>
      <LoadingStatus label="Loading settings…" />
      <SkeletonBanner />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <SkeletonForm fields={6} />
    </div>
  );
}

/** Content / song / artist / collection / community detail routes. */
export function DetailPageSkeleton({
  variant = "media",
  kpis = false,
  sections = 3,
}: {
  variant?: "media" | "profile";
  kpis?: boolean;
  sections?: number;
}) {
  return (
    <div className="flex w-full flex-col">
      <LoadingStatus />
      <SkeletonDetailHero variant={variant} />
      <SkeletonDetailBody>
        {kpis ? <SkeletonStatPanel withHeader={false} /> : null}
        {Array.from({ length: sections }, (_, i) => (
          <SkeletonCarouselSection key={i} round={i === 1} />
        ))}
      </SkeletonDetailBody>
    </div>
  );
}

/** Watch / play routes: main player column + up-next queue. */
export function PlayerSkeleton({ audio = false }: { audio?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 lg:min-h-[calc(100dvh-4.5rem)] lg:flex-row">
      <LoadingStatus label="Loading player…" />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-2/3 sm:h-8" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        {audio ? (
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-surface/40 p-6 sm:flex-row sm:p-8">
            <Skeleton className="aspect-square w-full max-w-[260px] rounded-card" />
            <div className="flex w-full flex-1 flex-col gap-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-4 h-2 w-full rounded-full" />
              <div className="flex justify-center gap-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className={cn("rounded-full", i === 2 ? "size-14" : "size-10")} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Skeleton className="aspect-video w-full rounded-card" />
        )}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      <aside className="flex w-full flex-col gap-3 lg:w-[340px] lg:shrink-0">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface/40 p-2.5">
            <Skeleton className="h-14 w-20 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

/** Whole community dashboard (nav · channel · members) while its layout loads. */
export function CommunityDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8">
      <LoadingStatus label="Loading community dashboard…" />
      <Skeleton className="mb-5 h-7 w-64 max-w-full sm:mb-6" />
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-black/50">
        <div className="grid min-h-[calc(100dvh-12rem)] grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_240px]">
          <div className="hidden flex-col gap-2 border-r border-white/[0.06] px-3 py-5 lg:flex">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden border-b border-white/[0.06] p-3 lg:hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
            ))}
          </div>
          <CommunitySectionSkeleton />
          <div className="hidden flex-col gap-3 border-l border-white/[0.06] px-4 py-5 lg:flex">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Community dashboard section body (renders inside CommunityDashboardShell). */
export function CommunitySectionSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <LoadingStatus label="Loading channel…" />
      <Skeleton className="h-6 w-48" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className={cn("h-4", i % 2 ? "w-3/5" : "w-4/5")} />
          </div>
        </div>
      ))}
      <Skeleton className="mt-auto h-12 w-full rounded-full" />
    </div>
  );
}

/** Profile friends list. */
export function FriendsListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-8">
      <LoadingStatus label="Loading friends…" />
      <div className="mb-8 flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <SkeletonListRows rows={6} />
    </div>
  );
}

/** Search results: query bar, type tabs, result rows. */
export function SearchSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
      <LoadingStatus label="Searching…" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <SkeletonCarouselSection withSearch={false} />
      <SkeletonCarouselSection withSearch={false} round />
      <SkeletonCardGrid count={5} />
    </div>
  );
}

/** Admin list pages: title + CTA, search, table, pagination. */
export function AdminTableSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingStatus />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-full sm:w-36" />
      </div>
      <Skeleton className="h-10 w-full rounded-full sm:max-w-[420px]" />
      <SkeletonTable rows={8} cols={5} />
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-9 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** Admin create / edit forms. */
export function AdminFormSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <LoadingStatus label="Loading editor…" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-56" />
      </div>
      <SkeletonForm fields={8} />
    </div>
  );
}

/** Admin overview: welcome copy + stat cards. */
export function AdminOverviewSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <LoadingStatus />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Login / signup card. */
export function AuthCardSkeleton() {
  return (
    <div className="w-full max-w-[400px] rounded-3xl border border-white/10 bg-glass-purple px-7 py-9">
      <LoadingStatus />
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-60 max-w-full" />
      </div>
      <div className="mt-8 flex flex-col gap-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Onboarding steps: progress bar, heading, option grid. */
export function OnboardingSkeleton() {
  return (
    <div className="flex w-full max-w-[760px] flex-col items-center gap-8">
      <LoadingStatus label="Preparing your taste test…" />
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2">
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-card" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-[420px] rounded-full" />
    </div>
  );
}
